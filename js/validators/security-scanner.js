/**
 * @module security-scanner
 * @description VirusTotal API integration for URL and file scanning.
 * Implements client-side rate limiting (4 req/min free tier),
 * result caching, and graceful degradation when API is unavailable.
 */

import { logError, logInfo, logSecurity, safeAsync } from '../utils/error-handler.js';
import { createProcess, log as processLog, setStatus, complete } from '../utils/process-logger.js';
import { fetchWithRetries } from '../utils/fetch-with-retries.js';

/** @type {string} VirusTotal API v3 base URL */
const VT_BASE_URL = 'https://www.virustotal.com/api/v3';

/** @type {number} Maximum file size accepted by VT free tier (32 MB) */
const VT_FILE_SIZE_LIMIT = 32 * 1024 * 1024;

/**
 * Simple sliding-window rate limiter (client-side).
 * VirusTotal free tier: 4 requests per minute.
 */
class RateLimiter {
    constructor(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = [];
    }

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

    get remaining() {
        const now = Date.now();
        this.requests = this.requests.filter((t) => now - t < this.windowMs);
        return Math.max(0, this.maxRequests - this.requests.length);
    }
}

const rateLimiter = new RateLimiter(4, 60_000);

/* ------------------------------------------------------------------ */
/*  Shared Analysis Polling                                            */
/* ------------------------------------------------------------------ */

/**
 * Polls a VirusTotal analysis endpoint until complete or timeout.
 * @param {string} analysisId
 * @param {string} apiKey
 * @param {string} [processId]
 * @returns {Promise<Object>} ScanResult-like object
 */
async function pollAnalysis(analysisId, apiKey, processId = null) {
    const analysisEndpoint = `${VT_BASE_URL}/analyses/${analysisId}`;
    let pollIntervalMs = 5000;
    const maxPollIntervalMs = 30_000;
    const pollIntervalFactor = 2.0;
    const maxPolls = 6;
    let analysisData = null;

    if (processId) processLog(processId, 'info', 'Starting analysis polling', { analysisId, maxPolls });

    for (let attempt = 0; attempt < maxPolls; attempt++) {
        const externalSignal = pollAnalysis._externalSignal ?? null;
        if (externalSignal?.aborted) {
            if (processId) processLog(processId, 'warn', 'Polling aborted by external signal');
            return { scanned: false, error: 'Scan aborted' };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15_000);
        let abortListener = null;
        if (externalSignal) {
            abortListener = () => controller.abort();
            externalSignal.addEventListener('abort', abortListener);
        }

        if (processId) processLog(processId, 'debug', `Poll attempt ${attempt + 1}/${maxPolls}`, { interval: pollIntervalMs });

        // Use fetchWithRetries for resilient polling. Do NOT apply the
        // submission rateLimiter to polling requests — polling uses conservative
        // intervals and should not block waiting for slots.
        const { resp, err } = await fetchWithRetries(
            analysisEndpoint,
            {
                method: 'GET',
                headers: { 'x-apikey': apiKey, Accept: 'application/json' },
                signal: controller.signal,
            },
            {
                maxAttempts: 3,
                baseDelayMs: 500,
                signal: controller.signal,
            }
        );

        clearTimeout(timeoutId);
        if (externalSignal && abortListener) externalSignal.removeEventListener('abort', abortListener);

        if (err) {
            if (processId) processLog(processId, 'error', 'Analysis fetch failed', { error: err.message });
            logError('NetworkError', 'VirusTotal analysis fetch failed', { analysisId, error: err.message });
            return { scanned: false, error: 'Could not fetch analysis results.' };
        }

        if (!resp || !resp.ok) {
            const status = resp?.status || 'unknown';
            if (processId) processLog(processId, 'error', `Analysis API error: ${status}`);
            logError('APIError', `VT analysis returned ${status}`, { analysisId });
            return { scanned: false, error: `VirusTotal analysis returned status ${status}` };
        }

        const [data, parseErr] = await safeAsync(resp.json());
        if (parseErr) {
            if (processId) processLog(processId, 'error', 'Failed to parse analysis response');
            return { scanned: false, error: 'Failed to parse VirusTotal analysis response' };
        }

        analysisData = data;
        const status = analysisData?.data?.attributes?.status;
        if (processId) processLog(processId, 'info', `Analysis status: ${status}`, { attempt: attempt + 1 });

        // If the analysis object already contains usable stats (either fresh
        // stats or last_analysis_stats), we can return immediately instead of
        // waiting for the full "completed" status and subsequent polls.
        const statsAvailable = analysisData?.data?.attributes?.stats ?? analysisData?.data?.attributes?.last_analysis_stats ?? null;
        if (statsAvailable) {
            if (processId) processLog(processId, 'info', 'Analysis stats available (early return)', { attempt: attempt + 1 });
            const isSafeEarly = (statsAvailable.malicious ?? 0) === 0 && (statsAvailable.suspicious ?? 0) === 0;
            return { scanned: true, safe: isSafeEarly, stats: statsAvailable, rawAnalysis: analysisData };
        }

        if (status === 'completed') {
            if (processId) processLog(processId, 'info', 'Analysis completed');
            break;
        }

        if (attempt < maxPolls - 1) {
            pollIntervalMs = Math.min(pollIntervalMs * pollIntervalFactor, maxPollIntervalMs);
            if (processId) processLog(processId, 'debug', `Waiting ${pollIntervalMs}ms before next poll`);
            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        }
    }

    const stats = analysisData?.data?.attributes?.stats ?? analysisData?.data?.attributes?.last_analysis_stats ?? null;
    if (!stats) return { scanned: true, safe: null, stats: null, rawAnalysis: analysisData, error: 'No analysis data available' };

    const isSafe = (stats.malicious ?? 0) === 0 && (stats.suspicious ?? 0) === 0;
    if (!isSafe) logSecurity('VirusTotal flagged resource', { stats });

    return { scanned: true, safe: isSafe, stats, rawAnalysis: analysisData };
}

/* ------------------------------------------------------------------ */
/*  URL Scanning                                                       */
/* ------------------------------------------------------------------ */

export async function scanURL(url, apiKey, externalSignal = null, options = {}) {
    if (!apiKey) return { scanned: false, skipped: true, error: 'No API key provided' };

    await rateLimiter.waitForSlot();
    const submitEndpoint = `${VT_BASE_URL}/urls`;

    const submitController = new AbortController();
    const submitTimeout = setTimeout(() => submitController.abort(), 15_000);
    let submitAbortListener = null;
    if (externalSignal) {
        if (externalSignal.aborted) {
            clearTimeout(submitTimeout);
            return { scanned: false, error: 'Scan aborted' };
        }
        submitAbortListener = () => submitController.abort();
        externalSignal.addEventListener('abort', submitAbortListener);
    }

    const [submitResponse, submitErr] = await safeAsync(
        fetch(submitEndpoint, {
            method: 'POST',
            headers: {
                'x-apikey': apiKey,
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ url }),
            signal: submitController.signal,
        })
    );

    clearTimeout(submitTimeout);
    if (externalSignal && submitAbortListener) externalSignal.removeEventListener('abort', submitAbortListener);

    if (submitErr) {
        logError('NetworkError', 'VirusTotal URL submission failed', { url, error: submitErr.message });
        return {
            scanned: false,
            error: 'VirusTotal is currently unavailable; the scan will continue without VirusTotal. Results may be incomplete.'
        };
    }

    // Handle HTTP 409 (AlreadyExists) specially: VirusTotal may return a
    // payload pointing to an existing analysis for the same resource. If so,
    // extract the existing analysis id and continue by polling it instead of
    // treating this as an error.
    if (submitResponse.status === 409) {
        const [payload, parseErr] = await safeAsync(submitResponse.json());
        if (parseErr) {
            logError('APIError', 'VT returned 409 but response parse failed', { url });
            return { scanned: false, error: 'VirusTotal returned 409 and response could not be parsed' };
        }

        // Try common locations for an analysis id
        let existingAnalysisId = payload?.data?.id || payload?.meta?.analysis_id || payload?.meta?.analysis?.id || null;
        if (!existingAnalysisId) {
            // Fallback: search the JSON string for a hex-like id pattern
            try {
                const s = JSON.stringify(payload);
                const m = s.match(/[0-9a-f]{16,64}/i);
                if (m) existingAnalysisId = m[0];
            } catch (e) {
                // ignore
            }
        }

        if (!existingAnalysisId) {
            logError('APIError', 'VT returned 409 but no analysis id found', { url, payload });
            return { scanned: false, error: 'VirusTotal indicated resource exists but no analysis id was found' };
        }

        const providedProcessId = options?.processId ?? null;
        const processId = providedProcessId || `vt-url-${existingAnalysisId.substring(0, 8)}`;
        createProcess(processId, { type: 'url-scan', analysisId: existingAnalysisId, note: 'existing' });

        pollAnalysis._externalSignal = externalSignal;
        const resExisting = await pollAnalysis(existingAnalysisId, apiKey, processId);
        complete(processId, resExisting.scanned ? (resExisting.safe ? 'success' : 'warning') : 'error', true);
        pollAnalysis._externalSignal = null;
        return resExisting;
    }

    if (!submitResponse.ok) {
        logError('APIError', `VT submit returned ${submitResponse.status}`, { url });
        return { scanned: false, error: `VirusTotal returned status ${submitResponse.status}` };
    }

    const [submitData, submitParseErr] = await safeAsync(submitResponse.json());
    if (submitParseErr) return { scanned: false, error: 'Failed to parse VirusTotal submit response' };

    const analysisId = submitData?.data?.id;
    if (!analysisId) return { scanned: false, error: 'Invalid response from VirusTotal' };

    const providedProcessId = options?.processId ?? null;
    const processId = providedProcessId || `vt-url-${analysisId.substring(0, 8)}`;
    createProcess(processId, { type: 'url-scan', analysisId });

    pollAnalysis._externalSignal = externalSignal;
    const res = await pollAnalysis(analysisId, apiKey, processId);
    complete(processId, res.scanned ? (res.safe ? 'success' : 'warning') : 'error', true);
    pollAnalysis._externalSignal = null;
    return res;
}

/* ------------------------------------------------------------------ */
/*  File Scanning                                                      */
/* ------------------------------------------------------------------ */

export async function scanFile(blob, filename, apiKey, externalSignal = null, options = {}) {
    if (!apiKey) return { scanned: false, skipped: true, error: 'No API key provided' };
    if (!blob || blob.size === 0) return { scanned: false, error: 'No file data to scan' };
    if (blob.size > VT_FILE_SIZE_LIMIT) return { scanned: false, error: `File exceeds ${VT_FILE_SIZE_LIMIT / (1024 * 1024)}MB limit` };

    await rateLimiter.waitForSlot();
    const formData = new FormData();
    formData.append('file', blob, filename || 'upload');

    const uploadController = new AbortController();
    const uploadTimeout = setTimeout(() => uploadController.abort(), 30_000);
    let uploadAbortListener = null;
    if (externalSignal) {
        if (externalSignal.aborted) {
            clearTimeout(uploadTimeout);
            return { scanned: false, error: 'Scan aborted' };
        }
        uploadAbortListener = () => uploadController.abort();
        externalSignal.addEventListener('abort', uploadAbortListener);
    }

    const [submitResponse, submitErr] = await safeAsync(
        fetch(`${VT_BASE_URL}/files`, {
            method: 'POST',
            headers: { 'x-apikey': apiKey },
            body: formData,
            signal: uploadController.signal,
        })
    );

    clearTimeout(uploadTimeout);
    if (externalSignal && uploadAbortListener) externalSignal.removeEventListener('abort', uploadAbortListener);

    if (submitErr) {
        logError('NetworkError', 'VirusTotal file upload failed', { filename, error: submitErr.message });
        return { scanned: false, error: 'Could not upload file to VirusTotal' };
    }

    // Handle 409 (resource already exists) similar to URL submission: try to
    // extract an existing analysis id and poll that instead of failing.
    if (submitResponse.status === 409) {
        const [payload, parseErr] = await safeAsync(submitResponse.json());
        if (parseErr) {
            logError('APIError', 'VT returned 409 for file upload but response parse failed', { filename });
            return { scanned: false, error: 'VirusTotal returned 409 and response could not be parsed' };
        }

        let existingAnalysisId = payload?.data?.id || payload?.meta?.analysis_id || payload?.meta?.analysis?.id || null;
        if (!existingAnalysisId) {
            try {
                const s = JSON.stringify(payload);
                const m = s.match(/[0-9a-f]{16,64}/i);
                if (m) existingAnalysisId = m[0];
            } catch (e) {
                // ignore
            }
        }

        if (!existingAnalysisId) {
            logError('APIError', 'VT returned 409 but no analysis id found for file', { filename, payload });
            return { scanned: false, error: 'VirusTotal indicated resource exists but no analysis id was found' };
        }

        const providedProcessId = options?.processId ?? null;
        const processId = providedProcessId || `vt-file-${existingAnalysisId.substring(0, 8)}`;
        createProcess(processId, { type: 'file-scan', analysisId: existingAnalysisId, filename, note: 'existing' });

        pollAnalysis._externalSignal = externalSignal;
        const resExisting = await pollAnalysis(existingAnalysisId, apiKey, processId);
        complete(processId, resExisting.scanned ? (resExisting.safe ? 'success' : 'warning') : 'error', true);
        pollAnalysis._externalSignal = null;
        return resExisting;
    }

    if (!submitResponse.ok) {
        logError('APIError', `VT file upload returned ${submitResponse.status}`, { filename });
        return { scanned: false, error: `VirusTotal returned status ${submitResponse.status}` };
    }

    const [submitData, submitParseErr] = await safeAsync(submitResponse.json());
    if (submitParseErr) return { scanned: false, error: 'Failed to parse VirusTotal upload response' };

    const analysisId = submitData?.data?.id;
    if (!analysisId) return { scanned: false, error: 'No analysis ID in VirusTotal response' };

    const providedProcessId = options?.processId ?? null;
    const processId = providedProcessId || `vt-file-${analysisId.substring(0, 8)}`;
    createProcess(processId, { type: 'file-scan', analysisId, filename });

    pollAnalysis._externalSignal = externalSignal;
    const res = await pollAnalysis(analysisId, apiKey, processId);
    complete(processId, res.scanned ? (res.safe ? 'success' : 'warning') : 'error', true);
    pollAnalysis._externalSignal = null;
    return res;
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
/* ------------------------------------------------------------------ */

export function getRateLimitStatus() {
    return { remaining: rateLimiter.remaining, limit: rateLimiter.maxRequests };
}

export function getFileSizeLimit() {
    return VT_FILE_SIZE_LIMIT;
}

export async function scanMultipleUrls(urlObjects, apiKey, options = {}) {
    const { stopOnError = true } = options;
    if (!Array.isArray(urlObjects) || urlObjects.length === 0) return [];
    if (!apiKey) return urlObjects.map((obj) => ({ ...obj, result: { scanned: false, skipped: true, error: 'No API key provided' } }));

    const results = [];
    for (const urlObj of urlObjects) {
        try {
            const result = await scanURL(urlObj.url, apiKey);
            results.push({ ...urlObj, result });
            if (stopOnError && (result.scanned !== true || result.safe === false)) break;
        } catch (err) {
            logError('ScanError', 'Failed to scan URL', { url: urlObj.url, error: err.message });
            results.push({ ...urlObj, result: { scanned: false, error: 'Scan failed: ' + err.message } });
            if (stopOnError) break;
        }
    }
    return results;
}
