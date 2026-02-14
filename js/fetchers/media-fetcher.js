/**
 * @module media-fetcher
 * @description Handles fetching and validating NFT media (images).
 * Validates the media URL, checks file type, and creates a safe
 * object URL for display — all before touching the DOM.
 */

import { validateURL } from '../validators/url-validator.js';
import { logError, logInfo, safeAsync } from '../utils/error-handler.js';

/** @type {number} Fetch timeout for media downloads (ms) */
const MEDIA_TIMEOUT_MS = 15_000;

/** @type {string[]} Allowed image MIME types */
const ALLOWED_IMAGE_TYPES = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
    'image/x-icon',
    'image/avif',
    'image/heic',
    'image/heif',
    'image/jp2',
    'image/vnd.microsoft.icon',
];

/** @type {number} Max file size in bytes (32 MB — VT limit) */
const MAX_FILE_SIZE = 32 * 1024 * 1024;

/**
 * @typedef {Object} MediaResult
 * @property {boolean} success - Whether the media was fetched and validated
 * @property {string} [objectUrl] - Blob URL safe for use in <img src>
 * @property {string} [mimeType] - Detected MIME type
 * @property {number} [size] - File size in bytes
 * @property {string} [error] - Error message on failure
 */

/**
 * Fetches and validates an image from a media URL.
 * Returns a blob object URL for safe DOM rendering.
 * @param {string} imageUrl - The resolved image URL to fetch
 * @returns {Promise<MediaResult>} Media fetch result
 */
export async function fetchMedia(imageUrl, externalSignal = null) {
    // Validate the image URL through the same security checks
    const validation = validateURL(imageUrl);
    if (!validation.valid) {
        return { success: false, error: `Invalid media URL: ${validation.reason}` };
    }

    const resolvedUrl = validation.resolvedUrl;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MEDIA_TIMEOUT_MS);
    let abortListener = null;
    if (externalSignal) {
        if (externalSignal.aborted) {
            clearTimeout(timeoutId);
            return { success: false, error: 'Media fetch aborted' };
        }
        abortListener = () => controller.abort();
        externalSignal.addEventListener('abort', abortListener);
    }

    const [response, fetchErr] = await safeAsync(
        fetch(resolvedUrl, {
            method: 'GET',
            signal: controller.signal,
        })
    );

    clearTimeout(timeoutId);
    if (externalSignal && abortListener) externalSignal.removeEventListener('abort', abortListener);

    if (fetchErr) {
        logError('MediaFetchError', 'Failed to download media', {
            url: resolvedUrl,
            error: fetchErr.message,
        });
        return { success: false, error: 'Could not download the media file' };
    }

    if (!response.ok) {
        return { success: false, error: `Media server returned ${response.status}` };
    }

    // Check Content-Length before downloading full body
    const contentLength = parseInt(response.headers.get('content-length') ?? '0', 10);
    if (contentLength > MAX_FILE_SIZE) {
        return { success: false, error: `File too large (${formatBytes(contentLength)}). Max: 32 MB` };
    }

    // Check content type
    const contentType = response.headers.get('content-type')?.split(';')[0].trim() ?? '';
    if (contentType && !ALLOWED_IMAGE_TYPES.includes(contentType)) {
        logInfo('Non-image content type', { url: resolvedUrl, contentType });
        return { success: false, error: `Unsupported media type: ${contentType}` };
    }

    const [blob, blobErr] = await safeAsync(response.blob());
    if (blobErr) {
        return { success: false, error: 'Failed to read media data' };
    }

    // Verify actual size after download
    if (blob.size > MAX_FILE_SIZE) {
        return { success: false, error: `File too large (${formatBytes(blob.size)}). Max: 32 MB` };
    }

    // Verify MIME type from blob
    const mimeType = blob.type || contentType;
    if (mimeType && !ALLOWED_IMAGE_TYPES.includes(mimeType)) {
        return { success: false, error: `Unsupported media type: ${mimeType}` };
    }

    const objectUrl = URL.createObjectURL(blob);

    return {
        success: true,
        objectUrl,
        blob,
        mimeType: mimeType || 'image/unknown',
        size: blob.size,
    };
}

/**
 * Revokes a previously created object URL to free memory.
 * Call this when the image is no longer displayed.
 * @param {string} objectUrl - Object URL to revoke
 */
export function revokeMediaUrl(objectUrl) {
    if (objectUrl && objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl);
    }
}

/**
 * Formats bytes into a human-readable string.
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size (e.g., "2.3 MB")
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const units = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0);
    return `${size} ${units[i]}`;
}
