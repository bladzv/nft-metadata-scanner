/**
 * @module main
 * @description Application entry point. Wires up event listeners,
 * orchestrates the validation pipeline, and manages global state.
 */

import { validateURL } from './validators/url-validator.js';
import { parseMetadata } from './validators/metadata-parser.js';
import { scanURL } from './validators/security-scanner.js';
import { fetchMetadataJSON } from './fetchers/metadata-fetcher.js';
import { fetchMedia } from './fetchers/media-fetcher.js';
import {
    initStatusDisplay, showPipeline, resetPipeline,
    markActive, markSuccess, markError, markSkipped, markWarning,
} from './ui/status-display.js';
import { showResults, resetMetadataPanel, renderMetadata } from './ui/metadata-display.js';
import { resetMediaPanel, renderMedia, showMediaError } from './ui/media-display.js';
import { logInfo, logError, getUserMessage } from './utils/error-handler.js';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

/** @type {string} In-memory VirusTotal API key (never persisted to storage) */
let vtApiKey = '';

/** @type {boolean} Whether a scan is currently in progress */
let isScanning = false;

/* ------------------------------------------------------------------ */
/*  DOM References                                                     */
/* ------------------------------------------------------------------ */

const scanForm = document.getElementById('scan-form');
const urlInput = document.getElementById('url-input');
const scanBtn = document.getElementById('scan-btn');
const urlError = document.getElementById('url-error');
const aboutBtn = document.getElementById('about-btn');
const aboutSection = document.getElementById('about-section');
const aboutCloseBtn = document.getElementById('about-close-btn');
const apikeyInput = document.getElementById('apikey-input');
const apikeySaveBtn = document.getElementById('apikey-save-btn');

/* ------------------------------------------------------------------ */
/*  Initialization                                                     */
/* ------------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', () => {
    initStatusDisplay();
    bindEvents();
    logInfo('Application initialized');
});

/* ------------------------------------------------------------------ */
/*  Event Binding                                                      */
/* ------------------------------------------------------------------ */

/** Binds all interactive event listeners. */
function bindEvents() {
    // Form submission
    scanForm?.addEventListener('submit', handleScanSubmit);

    // Example URL buttons (event delegation)
    document.querySelectorAll('.example-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const exampleUrl = btn.getAttribute('data-url');
            if (urlInput && exampleUrl) {
                urlInput.value = exampleUrl;
                urlInput.focus();
            }
        });
    });

    // About panel toggle
    aboutBtn?.addEventListener('click', toggleAbout);
    aboutCloseBtn?.addEventListener('click', toggleAbout);

    // API key save
    apikeySaveBtn?.addEventListener('click', handleApiKeySave);

    // Clear error on input change
    urlInput?.addEventListener('input', () => setUrlError(''));
}

/* ------------------------------------------------------------------ */
/*  About Panel                                                        */
/* ------------------------------------------------------------------ */

/** Toggles the about section visibility. */
function toggleAbout() {
    if (!aboutSection || !aboutBtn) return;
    const isHidden = aboutSection.hidden;
    aboutSection.hidden = !isHidden;
    aboutBtn.setAttribute('aria-expanded', String(isHidden));
}

/* ------------------------------------------------------------------ */
/*  API Key                                                            */
/* ------------------------------------------------------------------ */

/** Saves the API key to in-memory variable (never to storage). */
function handleApiKeySave() {
    if (!apikeyInput) return;
    vtApiKey = apikeyInput.value.trim();
    apikeyInput.value = '';
    logInfo('API key saved to memory');
}

/* ------------------------------------------------------------------ */
/*  URL Error Display                                                  */
/* ------------------------------------------------------------------ */

/**
 * Shows or clears the URL input error message.
 * @param {string} message - Error message (empty string to clear)
 */
function setUrlError(message) {
    if (!urlError || !urlInput) return;

    if (message) {
        urlError.textContent = message;
        urlError.hidden = false;
        urlInput.setAttribute('aria-invalid', 'true');
    } else {
        urlError.textContent = '';
        urlError.hidden = true;
        urlInput.removeAttribute('aria-invalid');
    }
}

/* ------------------------------------------------------------------ */
/*  Scan Button State                                                  */
/* ------------------------------------------------------------------ */

/**
 * Toggles scan button between normal and loading state.
 * @param {boolean} loading - Whether to show loading state
 */
function setScanLoading(loading) {
    if (!scanBtn) return;

    const btnText = scanBtn.querySelector('.btn-text');
    const btnLoading = scanBtn.querySelector('.btn-loading');

    if (btnText) btnText.hidden = loading;
    if (btnLoading) btnLoading.hidden = !loading;

    scanBtn.disabled = loading;
    if (urlInput) urlInput.disabled = loading;
    isScanning = loading;
}

/* ------------------------------------------------------------------ */
/*  Scan Pipeline                                                      */
/* ------------------------------------------------------------------ */

/**
 * Handles the scan form submission — orchestrates the full pipeline.
 * @param {SubmitEvent} event
 */
async function handleScanSubmit(event) {
    event.preventDefault();

    if (isScanning) return;

    const rawUrl = urlInput?.value?.trim() ?? '';
    if (!rawUrl) {
        setUrlError('Please enter a URL');
        urlInput?.focus();
        return;
    }

    // Reset UI
    setUrlError('');
    setScanLoading(true);
    showPipeline(true);
    resetPipeline();
    showResults(false);
    resetMetadataPanel();
    resetMediaPanel();

    try {
        await runPipeline(rawUrl);
    } catch (err) {
        logError('PipelineError', 'Unhandled error in scan pipeline', { error: err.message });
    } finally {
        setScanLoading(false);
    }
}

/**
 * Runs the full validation pipeline for a given URL.
 * Each step updates the pipeline UI and short-circuits on critical errors.
 * @param {string} rawUrl - User-entered URL
 */
async function runPipeline(rawUrl) {
    // --- Step 1: URL Validation ---
    markActive('url-validation');
    const validation = validateURL(rawUrl);

    if (!validation.valid) {
        markError('url-validation');
        setUrlError(validation.reason);
        return;
    }

    markSuccess('url-validation');
    const resolvedUrl = validation.resolvedUrl;

    // --- Step 2: URL Security Scan (VirusTotal) ---
    markActive('url-scan');

    if (!vtApiKey) {
        markSkipped('url-scan');
    } else {
        const scanResult = await scanURL(resolvedUrl, vtApiKey);
        if (scanResult.skipped) {
            markSkipped('url-scan');
        } else if (!scanResult.scanned) {
            markWarning('url-scan');
        } else if (scanResult.safe === false) {
            markWarning('url-scan');
        } else {
            markSuccess('url-scan');
        }
    }

    // --- Step 3: Metadata Fetch ---
    markActive('metadata-fetch');
    const fetchResult = await fetchMetadataJSON(resolvedUrl);

    if (!fetchResult.success) {
        markError('metadata-fetch');
        setUrlError(getUserMessage(fetchResult.error));
        return;
    }

    markSuccess('metadata-fetch');

    // --- Step 4: Metadata Parse & Validate ---
    markActive('metadata-parse');
    const parseResult = parseMetadata(fetchResult.text);

    if (!parseResult.valid) {
        markError('metadata-parse');
        setUrlError(parseResult.reason);
        showResults(true);
        renderMetadata(parseResult);
        return;
    }

    if (parseResult.warnings.length > 0) {
        markWarning('metadata-parse');
    } else {
        markSuccess('metadata-parse');
    }

    showResults(true);
    renderMetadata(parseResult);

    // --- Step 5: Media URL Security Scan ---
    const imageUrl = parseResult.image;
    if (!imageUrl) {
        markSkipped('media-scan');
        markSkipped('media-display');
        return;
    }

    markActive('media-scan');

    if (!vtApiKey) {
        markSkipped('media-scan');
    } else {
        const mediaScan = await scanURL(imageUrl, vtApiKey);
        if (mediaScan.skipped || !mediaScan.scanned) {
            markSkipped('media-scan');
        } else if (mediaScan.safe === false) {
            markWarning('media-scan');
        } else {
            markSuccess('media-scan');
        }
    }

    // --- Step 6: Media Display ---
    markActive('media-display');
    const mediaResult = await fetchMedia(imageUrl);

    if (!mediaResult.success) {
        markError('media-display');
        showMediaError(mediaResult.error);
        return;
    }

    renderMedia(mediaResult.objectUrl, parseResult.name, {
        mimeType: mediaResult.mimeType,
        size: mediaResult.size,
    });
    markSuccess('media-display');

    logInfo('Pipeline complete', { url: rawUrl, standard: parseResult.standard });
}
