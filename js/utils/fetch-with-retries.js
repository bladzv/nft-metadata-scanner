/**
 * @module fetch-with-retries
 * @description Resilient fetch wrapper with exponential backoff, jitter,
 * HTTP 429/Retry-After handling, and AbortSignal support.
 */

import { logError, logInfo } from './error-handler.js';

/**
 * @typedef {Object} FetchOptions
 * @property {number} [maxAttempts=5] - Maximum retry attempts
 * @property {number} [baseDelayMs=500] - Base delay between retries
 * @property {number} [maxDelayMs=30000] - Maximum delay cap
 * @property {number} [factor=2] - Exponential backoff factor
 * @property {number} [jitterPercent=15] - Jitter percentage (0-100)
 * @property {AbortSignal} [signal] - Abort signal
 * @property {Function} [rateLimiter] - Optional rate limiter waitForSlot()
 */

/**
 * Parses Retry-After header value (seconds or HTTP date).
 * @param {string} retryAfter - Retry-After header value
 * @returns {number} Delay in milliseconds
 */
function parseRetryAfter(retryAfter) {
    if (!retryAfter) return 0;
    
    // Try parsing as integer (seconds)
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds) && seconds > 0) {
        return Math.min(seconds * 1000, 300_000); // Cap at 5 minutes
    }
    
    // Try parsing as HTTP date
    try {
        const date = new Date(retryAfter);
        const delay = date.getTime() - Date.now();
        return Math.max(0, Math.min(delay, 300_000)); // Cap at 5 minutes
    } catch {
        return 0;
    }
}

/**
 * Calculates exponential backoff delay with jitter.
 * @param {number} attempt - Current attempt (0-indexed)
 * @param {number} baseDelayMs - Base delay
 * @param {number} factor - Exponential factor
 * @param {number} maxDelayMs - Maximum delay
 * @param {number} jitterPercent - Jitter percentage
 * @returns {number} Delay in milliseconds
 */
function calculateBackoff(attempt, baseDelayMs, factor, maxDelayMs, jitterPercent) {
    const exponentialDelay = baseDelayMs * Math.pow(factor, attempt);
    const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
    
    // Apply jitter: ±jitterPercent
    const jitterRange = cappedDelay * (jitterPercent / 100);
    const jitter = (Math.random() * 2 - 1) * jitterRange;
    
    return Math.max(0, Math.floor(cappedDelay + jitter));
}

/**
 * Resilient fetch with retry logic and server-directed backoff.
 * @param {string} url - URL to fetch
 * @param {RequestInit} fetchOptions - Fetch options
 * @param {FetchOptions} retryOptions - Retry configuration
 * @returns {Promise<{resp: Response|null, err: Error|null}>} Result tuple
 */
export async function fetchWithRetries(url, fetchOptions = {}, retryOptions = {}) {
    const {
        maxAttempts = 5,
        baseDelayMs = 500,
        maxDelayMs = 30_000,
        factor = 2,
        jitterPercent = 15,
        signal = null,
        rateLimiter = null,
    } = retryOptions;
    
    let lastError = null;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Check abort signal
        if (signal?.aborted) {
            return { resp: null, err: new Error('Request aborted') };
        }
        
        // Wait for rate limiter slot if provided. If a signal is present,
        // make the wait cancellable so we don't let the request-level
        // timeout abort while waiting for a slot.
        if (rateLimiter && typeof rateLimiter.waitForSlot === 'function') {
            try {
                if (signal) {
                    // Create a cancellable wait: race the waitForSlot promise
                    // against an abort promise hooked to the provided signal.
                    await Promise.race([
                        rateLimiter.waitForSlot(),
                        new Promise((_, reject) => {
                            if (signal.aborted) return reject(new Error('Rate wait aborted'));
                            const onAbort = () => { reject(new Error('Rate wait aborted')); signal.removeEventListener('abort', onAbort); };
                            signal.addEventListener('abort', onAbort);
                        })
                    ]);
                } else {
                    await rateLimiter.waitForSlot();
                }
            } catch (err) {
                logError('RateLimiterError', 'Rate limiter failed or aborted', { error: err.message });
                return { resp: null, err: new Error('Rate limiter error') };
            }
        }
        
        try {
            const response = await fetch(url, { ...fetchOptions, signal });
            
            // Success or client error (don't retry 4xx except 429)
            if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
                return { resp: response, err: null };
            }
            
            // Handle HTTP 429 (rate limit)
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                const serverDelay = parseRetryAfter(retryAfter);
                
                if (serverDelay > 0 && attempt < maxAttempts - 1) {
                    logInfo(`HTTP 429: waiting ${serverDelay}ms (Retry-After header)`);
                    await new Promise(resolve => setTimeout(resolve, serverDelay));
                    continue;
                }
                
                // No Retry-After or last attempt
                lastError = new Error(`HTTP 429: Rate limit exceeded${retryAfter ? ` (Retry-After: ${retryAfter})` : ''}`);
                lastError.name = 'RateLimitError';
                lastError.status = 429;
                
                if (attempt < maxAttempts - 1) {
                    const backoffDelay = calculateBackoff(attempt, baseDelayMs, factor, maxDelayMs, jitterPercent);
                    logInfo(`HTTP 429: no Retry-After, using backoff ${backoffDelay}ms`);
                    await new Promise(resolve => setTimeout(resolve, backoffDelay));
                    continue;
                }
                
                return { resp: null, err: lastError };
            }
            
            // Handle 5xx server errors
            if (response.status >= 500) {
                lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
                lastError.name = 'ServerError';
                lastError.status = response.status;
                
                if (attempt < maxAttempts - 1) {
                    const backoffDelay = calculateBackoff(attempt, baseDelayMs, factor, maxDelayMs, jitterPercent);
                    logInfo(`HTTP ${response.status}: retrying in ${backoffDelay}ms (attempt ${attempt + 1}/${maxAttempts})`);
                    await new Promise(resolve => setTimeout(resolve, backoffDelay));
                    continue;
                }
                
                return { resp: null, err: lastError };
            }
            
            // Other non-OK responses (unexpected)
            lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
            lastError.status = response.status;
            return { resp: null, err: lastError };
            
        } catch (err) {
            // Network errors, timeouts, aborts
            lastError = err;
            
            // Don't retry on abort
            if (err.name === 'AbortError' || signal?.aborted) {
                return { resp: null, err };
            }
            
            // Retry network errors with backoff
            if (attempt < maxAttempts - 1) {
                const backoffDelay = calculateBackoff(attempt, baseDelayMs, factor, maxDelayMs, jitterPercent);
                logInfo(`Network error: ${err.message}, retrying in ${backoffDelay}ms (attempt ${attempt + 1}/${maxAttempts})`);
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
                continue;
            }
            
            return { resp: null, err };
        }
    }
    
    // All attempts exhausted
    return { resp: null, err: lastError || new Error('All retry attempts exhausted') };
}
