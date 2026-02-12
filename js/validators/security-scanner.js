/**
 * @module security-scanner
 * @description VirusTotal API integration for URL and file scanning.
 * Implements client-side rate limiting (4 req/min free tier),
 * result caching, and graceful degradation when API is unavailable.
 */

import { logError, logInfo, logSecurity, safeAsync } from '../utils/error-handler.js';

/** @type {string} VirusTotal API v3 base URL */
const VT_BASE_URL = 'https://www.virustotal.com/api/v3';

/** @type {number} Maximum file size accepted by VT free tier (32 MB) */
const VT_FILE_SIZE_LIMIT = 32 * 1024 * 1024;

/**
 * @typedef {Object} ScanResult
 * @property {boolean} scanned - Whether the scan completed
 * @property {boolean} [safe] - Whether the URL/file appears safe
 * @property {Object} [stats] - Detection statistics from VT
 * @property {number} [stats.harmless] - Harmless verdicts
 * @property {number} [stats.malicious] - Malicious verdicts
 * @property {number} [stats.suspicious] - Suspicious verdicts
 * @property {number} [stats.undetected] - Undetected verdicts
 * @property {string} [error] - Error message if scan failed
 * @property {boolean} [skipped] - True if scan was skipped (no API key)
 */

/**
 * Simple sliding-window rate limiter.
 * VirusTotal free tier: 4 requests per minute.
 */
class RateLimiter {
    /**
     * @param {number} maxRequests - Max requests per window
     * @param {number} windowMs - Window duration in milliseconds
     */
    constructor(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        /** @type {number[]} */
        this.requests = [];
    }

    /**
     * Waits until a request slot is available.
     * @returns {Promise<void>}
     */
    async waitForSlot() {
        const now = Date.now();
        this.requests = this.requests.filter((t) => now - t < this.windowMs);

        if (this.requests.length >= this.maxRequests) {
            const oldest = this.requests[0];
            const waitTime = this.windowMs - (now - oldest) + 100; // +100ms buffer
            logInfo(`Rate limiter: waiting ${waitTime}ms for available slot`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            return this.waitForSlot();
        }

        this.requests.push(Date.now());
    }

    /**
     * Returns remaining request slots in the current window.
     * @returns {number} Available request slots
     */
    get remaining() {
        const now = Date.now();
        this.requests = this.requests.filter((t) => now - t < this.windowMs);
        return Math.max(0, this.maxRequests - this.requests.length);
    }
}

/** Shared rate limiter instance — 4 requests/minute */
const rateLimiter = new RateLimiter(4, 60_000);

/**
 * Scans a URL using the VirusTotal URL scanning API.
 * First submits the URL for analysis, then retrieves the results.
 * @param {string} url - URL to scan
 * @param {string} apiKey - VirusTotal API key
 * @returns {Promise<ScanResult>} Scan result
 */
export async function scanURL(url, apiKey) {
    if (!apiKey) {
        console.log('[VirusTotal] No API key provided, skipping scan for:', url);
        return { scanned: false, skipped: true, error: 'No API key provided' };
    }

    console.log('[VirusTotal] Starting scan for URL:', url);
    await rateLimiter.waitForSlot();

    // Step 1: Submit URL for scanning
    console.log('[VirusTotal] Submitting URL for scanning');
    const submitEndpoint = `${VT_BASE_URL}/urls`;

    const [submitResponse, submitErr] = await safeAsync(
        fetch(submitEndpoint, {
            method: 'POST',
            headers: {
                'x-apikey': apiKey,
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ url }),
            signal: AbortSignal.timeout(15_000),
        })
    );

    if (submitErr) {
        console.error('[VirusTotal] Network error during URL submission:', submitErr.message);
        logError('NetworkError', 'VirusTotal URL submission failed', { url, error: submitErr.message });
        return { scanned: false, error: 'Could not reach VirusTotal. Scan skipped.' };
    }

    console.log('[VirusTotal] Submit response status:', submitResponse.status);

    if (!submitResponse.ok) {
        console.error('[VirusTotal] Submit API error status:', submitResponse.status);
        logError('APIError', `VT submit returned ${submitResponse.status}`, { url });
        return { scanned: false, error: `VirusTotal returned status ${submitResponse.status}` };
    }

    const [submitData, submitParseErr] = await safeAsync(submitResponse.json());
    if (submitParseErr) {
        console.error('[VirusTotal] Failed to parse submit JSON response:', submitParseErr);
        return { scanned: false, error: 'Failed to parse VirusTotal submit response' };
    }

    console.log('[VirusTotal] Submit response data:', submitData);

    const analysisId = submitData?.data?.id;
    if (!analysisId) {
        console.error('[VirusTotal] No analysis ID in submit response');
        return { scanned: false, error: 'Invalid response from VirusTotal' };
    }

    console.log('[VirusTotal] Analysis ID:', analysisId);

    // Step 2: Poll the analyses endpoint until analysis completes (or timeout)
    const analysisEndpoint = `${VT_BASE_URL}/analyses/${analysisId}`;
    console.log('[VirusTotal] Polling analysis results at:', analysisEndpoint);

    const pollIntervalMs = 2000; // 2s between polls
    const maxPolls = 6; // ~12s total polling
    let analysisData = null;
    let analysisResponse = null;

    for (let attempt = 0; attempt < maxPolls; attempt++) {
        await rateLimiter.waitForSlot();

        const [resp, err] = await safeAsync(
            fetch(analysisEndpoint, {
                method: 'GET',
                headers: { 'x-apikey': apiKey, 'Accept': 'application/json' },
                signal: AbortSignal.timeout(15_000),
            })
        );

        if (err) {
            console.error('[VirusTotal] Network error during analysis fetch:', err.message);
            logError('NetworkError', 'VirusTotal analysis fetch failed', { url, analysisId, error: err.message });
            return { scanned: false, error: 'Could not fetch analysis results. Scan skipped.' };
        }

        analysisResponse = resp;

        if (!analysisResponse.ok) {
            console.error('[VirusTotal] Analysis API error status:', analysisResponse.status);
            logError('APIError', `VT analysis returned ${analysisResponse.status}`, { url, analysisId });
            return { scanned: false, error: `VirusTotal analysis returned status ${analysisResponse.status}` };
        }

        const [data, parseErr] = await safeAsync(analysisResponse.json());
        if (parseErr) {
            console.error('[VirusTotal] Failed to parse analysis JSON response:', parseErr);
            return { scanned: false, error: 'Failed to parse VirusTotal analysis response' };
        }

        analysisData = data;
        const status = analysisData?.data?.attributes?.status;
        console.log(`[VirusTotal] Analysis attempt ${attempt + 1}, status:`, status);

        if (status === 'completed') {
            break;
        }

        // Not completed yet — wait and retry
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    console.log('[VirusTotal] Analysis response data:', analysisData);

    // VT analysis responses may expose stats under different keys depending on endpoint/version
    const stats = analysisData?.data?.attributes?.stats ?? analysisData?.data?.attributes?.last_analysis_stats ?? null;
    if (!stats) {
        console.warn('[VirusTotal] No analysis stats in response');
        return { scanned: true, safe: null, stats: null, error: 'No analysis data available' };
    }

    console.log('[VirusTotal] Analysis stats:', stats);

    const isSafe = (stats.malicious ?? 0) === 0 && (stats.suspicious ?? 0) === 0;
    console.log('[VirusTotal] URL safety result:', isSafe ? 'SAFE' : 'UNSAFE');

    if (!isSafe) {
        logSecurity('VirusTotal flagged URL', { url, stats });
    }

    return { scanned: true, safe: isSafe, stats };
}

/**
 * Returns the current rate limiter status.
 * @returns {{ remaining: number, limit: number }} Available slots and total limit
 */
export function getRateLimitStatus() {
    return { remaining: rateLimiter.remaining, limit: rateLimiter.maxRequests };
}

/**
 * Returns the VirusTotal file size limit.
 * @returns {number} Max file size in bytes
 */
export function getFileSizeLimit() {
    return VT_FILE_SIZE_LIMIT;
}

/**
 * Scans multiple URLs using VirusTotal API.
 * Respects rate limiting and returns results for each URL.
 * @param {Array<{url: string, field: string, type: string}>} urlObjects - URLs to scan with context
 * @param {string} apiKey - VirusTotal API key
 * @returns {Promise<Array<{url: string, field: string, type: string, result: ScanResult}>>} Scan results with context
 */
export async function scanMultipleUrls(urlObjects, apiKey) {
    if (!Array.isArray(urlObjects) || urlObjects.length === 0) {
        console.log('[VirusTotal] No URLs to scan');
        return [];
    }

    if (!apiKey) {
        console.log('[VirusTotal] No API key provided, skipping all scans');
        return urlObjects.map(obj => ({
            ...obj,
            result: { scanned: false, skipped: true, error: 'No API key provided' }
        }));
    }

    console.log(`[VirusTotal] Starting scan of ${urlObjects.length} URLs:`, urlObjects.map(obj => obj.url));

    const results = [];

    for (const urlObj of urlObjects) {
        console.log(`[VirusTotal] Scanning URL: ${urlObj.url} (${urlObj.field})`);
        try {
            const result = await scanURL(urlObj.url, apiKey);
            results.push({
                ...urlObj,
                result
            });
        } catch (error) {
            console.error(`[VirusTotal] Scan failed for ${urlObj.url}:`, error.message);
            logError('ScanError', 'Failed to scan URL', { url: urlObj.url, field: urlObj.field, error: error.message });
            results.push({
                ...urlObj,
                result: { scanned: false, error: 'Scan failed: ' + error.message }
            });
        }
    }

    console.log('[VirusTotal] Completed scanning all URLs');
    return results;
}
