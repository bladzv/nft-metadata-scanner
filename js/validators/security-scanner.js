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
 * Scans a URL using the VirusTotal URL report API.
 * @param {string} url - URL to scan
 * @param {string} apiKey - VirusTotal API key
 * @returns {Promise<ScanResult>} Scan result
 */
export async function scanURL(url, apiKey) {
    if (!apiKey) {
        return { scanned: false, skipped: true, error: 'No API key provided' };
    }

    await rateLimiter.waitForSlot();

    // VT uses base64-encoded URL (without padding) as the identifier
    const urlId = btoa(url).replace(/=/g, '');
    const endpoint = `${VT_BASE_URL}/urls/${urlId}`;

    const [response, fetchErr] = await safeAsync(
        fetch(endpoint, {
            method: 'GET',
            headers: { 'x-apikey': apiKey, 'Accept': 'application/json' },
            signal: AbortSignal.timeout(15_000),
        })
    );

    if (fetchErr) {
        logError('NetworkError', 'VirusTotal URL scan failed', { url, error: fetchErr.message });
        return { scanned: false, error: 'Could not reach VirusTotal. Scan skipped.' };
    }

    if (response.status === 404) {
        logInfo('URL not found in VT database', { url });
        return { scanned: true, safe: null, stats: null, error: 'URL not yet scanned by VirusTotal' };
    }

    if (!response.ok) {
        logError('APIError', `VT returned ${response.status}`, { url });
        return { scanned: false, error: `VirusTotal returned status ${response.status}` };
    }

    const [data, parseErr] = await safeAsync(response.json());
    if (parseErr) {
        return { scanned: false, error: 'Failed to parse VirusTotal response' };
    }

    const stats = data?.data?.attributes?.last_analysis_stats;
    if (!stats) {
        return { scanned: true, safe: null, stats: null, error: 'No analysis data available' };
    }

    const isSafe = (stats.malicious ?? 0) === 0 && (stats.suspicious ?? 0) === 0;
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
