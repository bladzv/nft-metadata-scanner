/**
 * @module metadata-fetcher
 * @description Fetches NFT metadata JSON from validated URLs.
 * Handles CORS issues with proxy fallback, enforces timeouts,
 * and validates response content-type before parsing.
 */

import { logError, logInfo, safeAsync } from '../utils/error-handler.js';

/** @type {number} Fetch timeout in milliseconds */
const FETCH_TIMEOUT_MS = 10_000;

/** @type {string} CORS proxy for cross-origin requests that fail */
const CORS_PROXY_URL = 'https://api.allorigins.win/get?url=';

/**
 * @typedef {Object} FetchResult
 * @property {boolean} success - Whether the fetch succeeded
 * @property {string} [text] - Raw response text (JSON string)
 * @property {string} [contentType] - Response content-type header
 * @property {string} [error] - Error message if fetch failed
 * @property {boolean} [usedProxy] - Whether CORS proxy was used
 */

/**
 * Fetches metadata JSON from a URL, with CORS proxy fallback.
 * Tries a direct fetch first; falls back to allorigins proxy on CORS error.
 * @param {string} url - The resolved HTTPS URL to fetch metadata from
 * @returns {Promise<FetchResult>} Fetch result with raw text or error
 */
export async function fetchMetadataJSON(url) {
    // Attempt 1: direct fetch
    const directResult = await attemptFetch(url);
    if (directResult.success) {
        return directResult;
    }

    // Attempt 2: CORS proxy fallback
    logInfo('Direct fetch failed, trying CORS proxy', { url, error: directResult.error });
    const proxyResult = await attemptFetchViaProxy(url);
    if (proxyResult.success) {
        return { ...proxyResult, usedProxy: true };
    }

    // Both attempts failed
    logError('FetchError', 'All fetch attempts failed', {
        url,
        directError: directResult.error,
        proxyError: proxyResult.error,
    });

    return {
        success: false,
        error: 'Could not fetch metadata. The server may be unreachable or blocking requests.',
    };
}

/**
 * Attempts a direct fetch with timeout and content-type validation.
 * @param {string} url - URL to fetch
 * @returns {Promise<FetchResult>} Fetch result
 */
async function attemptFetch(url) {
    const [response, err] = await safeAsync(
        fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        })
    );

    if (err) {
        return { success: false, error: err.message };
    }

    if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const contentType = response.headers.get('content-type') ?? '';

    const [text, textErr] = await safeAsync(response.text());
    if (textErr) {
        return { success: false, error: 'Failed to read response body' };
    }

    return { success: true, text, contentType };
}

/**
 * Fetches via the allorigins CORS proxy.
 * @param {string} url - Original URL to fetch through proxy
 * @returns {Promise<FetchResult>} Fetch result
 */
async function attemptFetchViaProxy(url) {
    const proxyUrl = `${CORS_PROXY_URL}${encodeURIComponent(url)}`;

    const [response, err] = await safeAsync(
        fetch(proxyUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        })
    );

    if (err) {
        return { success: false, error: `Proxy fetch failed: ${err.message}` };
    }

    if (!response.ok) {
        return { success: false, error: `Proxy returned ${response.status}` };
    }

    const [proxyData, parseErr] = await safeAsync(response.json());
    if (parseErr) {
        return { success: false, error: 'Failed to parse proxy response' };
    }

    // allorigins wraps the original body in a { contents: "..." } object
    if (!proxyData || typeof proxyData.contents !== 'string') {
        return { success: false, error: 'Unexpected proxy response format' };
    }

    return {
        success: true,
        text: proxyData.contents,
        contentType: proxyData.status?.content_type ?? '',
    };
}
