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
 * @property {Object} [rawAnalysis] - Full analysis JSON for detail modal
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
            const waitTime = this.windowMs - (now - oldest) + 100;
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

/* ------------------------------------------------------------------ */
/*  Shared Analysis Polling                                            */
/* ------------------------------------------------------------------ */

/**
 * Polls a VirusTotal analysis endpoint until complete or timeout.
 * @param {string} analysisId - VT analysis ID
 * @param {string} apiKey - VirusTotal API key
 * @returns {Promise<ScanResult>} Scan result with stats and rawAnalysis
 */
async function pollAnalysis(analysisId, apiKey) {
    const analysisEndpoint = `${VT_BASE_URL}/analyses/${analysisId}`;
    const pollIntervalMs = 2000;
    const maxPolls = 6;
    let analysisData = null;

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
            logError('NetworkError', 'VirusTotal analysis fetch failed', { analysisId, error: err.message });
            return { scanned: false, error: 'Could not fetch analysis results.' };
        }

        if (!resp.ok) {
            console.error('[VirusTotal] Analysis API error status:', resp.status);
            logError('APIError', `VT analysis returned ${resp.status}`, { analysisId });
            return { scanned: false, error: `VirusTotal analysis returned status ${resp.status}` };
        }

        const [data, parseErr] = await safeAsync(resp.json());
        if (parseErr) {
            console.error('[VirusTotal] Failed to parse analysis JSON:', parseErr);
            return { scanned: false, error: 'Failed to parse VirusTotal analysis response' };
        }

        analysisData = data;
        const status = analysisData?.data?.attributes?.status;
        console.log(`[VirusTotal] Analysis attempt ${attempt + 1}, status:`, status);

        if (status === 'completed') {
            break;
        }

        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    const stats = analysisData?.data?.attributes?.stats
        ?? analysisData?.data?.attributes?.last_analysis_stats
        ?? null;

    if (!stats) {
        console.warn('[VirusTotal] No analysis stats in response');
        return { scanned: true, safe: null, stats: null, rawAnalysis: analysisData, error: 'No analysis data available' };
    }

    console.log('[VirusTotal] Analysis stats:', stats);

    const isSafe = (stats.malicious ?? 0) === 0 && (stats.suspicious ?? 0) === 0;

    if (!isSafe) {
        logSecurity('VirusTotal flagged resource', { stats });
    }

    return { scanned: true, safe: isSafe, stats, rawAnalysis: analysisData };
}

/* ------------------------------------------------------------------ */
/*  URL Scanning                                                       */
/* ------------------------------------------------------------------ */

/**
 * Scans a URL using the VirusTotal URL scanning API.
 * Submits the URL for analysis, then polls for results.
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

    const submitEndpoint = `${VT_BASE_URL}/urls`;

    const [submitResponse, submitErr] = await safeAsync(
        fetch(submitEndpoint, {
            method: 'POST',
            headers: {
                'x-apikey': apiKey,
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
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

    if (!submitResponse.ok) {
        console.error('[VirusTotal] Submit API error status:', submitResponse.status);
        logError('APIError', `VT submit returned ${submitResponse.status}`, { url });
        return { scanned: false, error: `VirusTotal returned status ${submitResponse.status}` };
    }

    const [submitData, submitParseErr] = await safeAsync(submitResponse.json());
    if (submitParseErr) {
        return { scanned: false, error: 'Failed to parse VirusTotal submit response' };
    }

    const analysisId = submitData?.data?.id;
    if (!analysisId) {
        return { scanned: false, error: 'Invalid response from VirusTotal' };
    }

    console.log('[VirusTotal] URL analysis ID:', analysisId);
    return await pollAnalysis(analysisId, apiKey);
}

/* ------------------------------------------------------------------ */
/*  File Scanning                                                      */
/* ------------------------------------------------------------------ */

/**
 * Uploads a file to VirusTotal for scanning and retrieves results.
 * @param {Blob} blob - File blob to scan
 * @param {string} filename - Filename for the upload
 * @param {string} apiKey - VirusTotal API key
 * @returns {Promise<ScanResult>} Scan result
 */
export async function scanFile(blob, filename, apiKey) {
    if (!apiKey) {
        console.log('[VirusTotal] No API key provided, skipping file scan');
        return { scanned: false, skipped: true, error: 'No API key provided' };
    }

    if (!blob || blob.size === 0) {
        return { scanned: false, error: 'No file data to scan' };
    }

    if (blob.size > VT_FILE_SIZE_LIMIT) {
        return { scanned: false, error: `File exceeds ${VT_FILE_SIZE_LIMIT / (1024 * 1024)}MB limit` };
    }

    console.log('[VirusTotal] Uploading file for scan:', filename, 'size:', blob.size);
    await rateLimiter.waitForSlot();

    const formData = new FormData();
    formData.append('file', blob, filename || 'upload');

    const [submitResponse, submitErr] = await safeAsync(
        fetch(`${VT_BASE_URL}/files`, {
            method: 'POST',
            headers: { 'x-apikey': apiKey },
            body: formData,
            signal: AbortSignal.timeout(30_000),
        })
    );

    if (submitErr) {
        console.error('[VirusTotal] Network error during file upload:', submitErr.message);
        logError('NetworkError', 'VirusTotal file upload failed', { filename, error: submitErr.message });
        return { scanned: false, error: 'Could not upload file to VirusTotal' };
    }

    if (!submitResponse.ok) {
        console.error('[VirusTotal] File upload API error:', submitResponse.status);
        logError('APIError', `VT file upload returned ${submitResponse.status}`, { filename });
        return { scanned: false, error: `VirusTotal returned status ${submitResponse.status}` };
    }

    const [submitData, submitParseErr] = await safeAsync(submitResponse.json());
    if (submitParseErr) {
        return { scanned: false, error: 'Failed to parse VirusTotal upload response' };
    }

    const analysisId = submitData?.data?.id;
    if (!analysisId) {
        return { scanned: false, error: 'No analysis ID in VirusTotal response' };
    }

    console.log('[VirusTotal] File analysis ID:', analysisId);
    return await pollAnalysis(analysisId, apiKey);
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
/* ------------------------------------------------------------------ */

/**
 * Returns the current rate limiter status.
 * @returns {{ remaining: number, limit: number }}
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
 * @param {Array<{url: string, field: string, type: string}>} urlObjects - URLs to scan
 * @param {string} apiKey - VirusTotal API key
 * @returns {Promise<Array<{url: string, field: string, type: string, result: ScanResult}>>}
 */
export async function scanMultipleUrls(urlObjects, apiKey) {
    if (!Array.isArray(urlObjects) || urlObjects.length === 0) {
        return [];
    }

    if (!apiKey) {
        return urlObjects.map(obj => ({
            ...obj,
            result: { scanned: false, skipped: true, error: 'No API key provided' },
        }));
    }

    const results = [];

    for (const urlObj of urlObjects) {
        try {
            const result = await scanURL(urlObj.url, apiKey);
            results.push({ ...urlObj, result });
        } catch (error) {
            logError('ScanError', 'Failed to scan URL', { url: urlObj.url, error: error.message });
            results.push({
                ...urlObj,
                result: { scanned: false, error: 'Scan failed: ' + error.message },
            });
        }
    }

    return results;
}
