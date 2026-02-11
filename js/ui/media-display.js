/**
 * @module media-display
 * @description Renders media (images) safely into the preview panel.
 * Uses blob object URLs and CSP-compatible <img> rendering.
 * Revokes previous object URLs to prevent memory leaks.
 */

import { safeSetText } from '../utils/sanitizer.js';
import { revokeMediaUrl } from '../fetchers/media-fetcher.js';

/** @type {string|null} Currently active object URL (for cleanup) */
let currentObjectUrl = null;

/**
 * Resets the media panel to its placeholder state.
 * Revokes any active object URL to free memory.
 */
export function resetMediaPanel() {
    cleanupObjectUrl();

    const content = document.getElementById('media-content');
    const info = document.getElementById('media-info');

    if (content) {
        content.innerHTML = '';
        const p = document.createElement('p');
        p.className = 'placeholder-text';
        p.textContent = 'Media preview will appear here after scanning.';
        content.appendChild(p);
    }

    if (info) {
        info.hidden = true;
        info.textContent = '';
    }
}

/**
 * Renders an image in the media preview panel using a blob object URL.
 * @param {string} objectUrl - Blob URL from media-fetcher
 * @param {string} altText - Alt text for the image (from metadata name)
 * @param {Object} [meta] - Optional metadata about the image
 * @param {string} [meta.mimeType] - Image MIME type
 * @param {number} [meta.size] - File size in bytes
 */
export function renderMedia(objectUrl, altText, meta = {}) {
    cleanupObjectUrl();

    const content = document.getElementById('media-content');
    const info = document.getElementById('media-info');

    if (!content) return;

    content.innerHTML = '';

    const img = document.createElement('img');
    img.src = objectUrl;
    img.alt = typeof altText === 'string' ? altText : 'NFT media preview';
    img.loading = 'lazy';
    img.decoding = 'async';

    // Handle image load error gracefully
    img.addEventListener('error', () => {
        content.innerHTML = '';
        const errorP = document.createElement('p');
        errorP.className = 'placeholder-text';
        errorP.textContent = 'Failed to render image. The format may be unsupported.';
        content.appendChild(errorP);
    }, { once: true });

    content.appendChild(img);
    currentObjectUrl = objectUrl;

    // Display media info
    if (info && (meta.mimeType || meta.size)) {
        const parts = [];
        if (meta.mimeType) parts.push(`Type: ${meta.mimeType}`);
        if (meta.size) parts.push(`Size: ${formatBytes(meta.size)}`);
        safeSetText(info, parts.join(' · '));
        info.hidden = false;
    }
}

/**
 * Shows an error message in the media panel.
 * @param {string} message - Error message to display
 */
export function showMediaError(message) {
    cleanupObjectUrl();

    const content = document.getElementById('media-content');
    if (!content) return;

    content.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'placeholder-text';
    p.style.color = 'var(--color-error)';
    p.textContent = message;
    content.appendChild(p);
}

/**
 * Revokes the current object URL if one exists.
 */
function cleanupObjectUrl() {
    if (currentObjectUrl) {
        revokeMediaUrl(currentObjectUrl);
        currentObjectUrl = null;
    }
}

/**
 * Formats bytes to human-readable string.
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const units = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0);
    return `${size} ${units[i]}`;
}
