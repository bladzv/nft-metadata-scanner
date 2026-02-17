/**
 * @module main
 * @description Application entry point. Orchestrates the sequential scan
 * pipeline, renders step cards dynamically, and manages global UI state.
 */

import { validateURL } from './validators/url-validator.js';
import { parseMetadata, extractAllUrls, getStandardLabel } from './validators/metadata-parser.js';
import { scanURL, scanFile } from './validators/security-scanner.js';
import { fetchMetadataJSON } from './fetchers/metadata-fetcher.js';
import { fetchMedia } from './fetchers/media-fetcher.js';
import { logInfo, logError, getUserMessage } from './utils/error-handler.js';
import { enableModalKeyboardHandling, disableModalKeyboardHandling } from './utils/modal-manager.js';
import { on as onProcessEvent, getLogs } from './utils/process-logger.js';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

/** @type {string} In-memory VirusTotal API key */
let vtApiKey = '';

/** @type {boolean} Whether a scan is currently running */
let isScanning = false;

/** @type {AbortController|null} Controller used to cancel an in-progress scan */
let scanAbortController = null;

/** @type {Object} Stores keyboard event handler cleanup functions for modals */
const modalKeyboardHandlers = {};

/* ------------------------------------------------------------------ */
/*  DOM References                                                     */
/* ------------------------------------------------------------------ */

const scanForm = document.getElementById('scan-form');
const urlInput = document.getElementById('url-input');
const scanBtn = document.getElementById('scan-btn');
const urlError = document.getElementById('url-error');
const urlClearBtn = document.getElementById('url-clear-btn');
// URL card wrapper — used to make the whole card inert when no API key
const urlCardWrap = document.querySelector('.url-input-card-wrap');

// About modal
const aboutBtn = document.getElementById('about-btn');
const aboutModal = document.getElementById('about-modal');
const aboutCloseBtn = document.getElementById('about-close-btn');
const aboutOkBtn = document.getElementById('about-ok-btn');

// API key elements
const apikeyInput = document.getElementById('apikey-input');
const apikeyClearBtn = document.getElementById('apikey-clear-btn');
const apikeyActionBtn = document.getElementById('apikey-action-btn');
const apikeyQuotaBtn = document.getElementById('apikey-quota-btn');
const apikeyQuotaModal = document.getElementById('apikey-quota-modal');
const apikeyQuotaCloseBtn = document.getElementById('apikey-quota-close-btn');
const apikeyQuotaCloseFooter = document.getElementById('apikey-quota-close-footer');
const apikeyQuotaTable = document.getElementById('apikey-quota-table');
const apikeyError = document.getElementById('apikey-error');
// API key invalid modal elements
const apikeyInvalidModal = document.getElementById('apikey-invalid-modal');
const apikeyInvalidCloseBtn = document.getElementById('apikey-invalid-close-btn');
const apikeyInvalidOkBtn = document.getElementById('apikey-invalid-ok-btn');

// Generic modals
const apikeyRequiredModal = document.getElementById('apikey-required-modal');
const apikeyRequiredOkBtn = document.getElementById('apikey-required-ok-btn');
const apikeyRequiredCloseBtn = document.getElementById('apikey-required-close-btn');
const removeConfirmModal = document.getElementById('remove-confirm-modal');
const removeConfirmYesBtn = document.getElementById('remove-confirm-yes-btn');
const removeConfirmNoBtn = document.getElementById('remove-confirm-no-btn');
const removeConfirmCloseBtn = document.getElementById('remove-confirm-close-btn');

// VT detail modal
const vtDetailModal = document.getElementById('vt-detail-modal');
const vtDetailCloseBtn = document.getElementById('vt-detail-close-btn');
const vtDetailCloseFooter = document.getElementById('vt-detail-close-footer');
const vtDetailJson = document.getElementById('vt-detail-json');
const vtDetailParsed = document.getElementById('vt-detail-parsed');

// Media preview modal
const mediaPreviewModal = document.getElementById('media-preview-modal');
const mediaPreviewCloseBtn = document.getElementById('media-preview-close-btn');
const mediaPreviewCloseFooter = document.getElementById('media-preview-close-footer');
const mediaPreviewImg = document.getElementById('media-preview-img');

// Scan error modal (shown when pipeline stops due to an error)
const scanErrorModal = document.getElementById('scan-error-modal');
const scanErrorBody = document.getElementById('scan-error-body');
const scanErrorHelp = document.getElementById('scan-error-help');
const scanErrorFlaggedHelp = document.getElementById('scan-error-flagged-help');
const scanErrorCloseBtn = document.getElementById('scan-error-close-btn');
const scanErrorCloseFooter = document.getElementById('scan-error-close-footer');
const scanErrorRefreshBtn = document.getElementById('scan-error-refresh-btn');
// New: flagged-mode modal controls
const scanErrorProceedBtn = document.getElementById('scan-error-proceed-btn');
const scanErrorMainBtn = document.getElementById('scan-error-main-btn');

// Internal state for scan-error modal interactions (countdown, promise resolve, handlers)
let _scanErrorCountdownTimer = null;
let _scanErrorResolve = null;
const _scanErrorHandlers = { proceed: null, main: null, close: null, refresh: null };

// Navigation
const inputSection = document.querySelector('.input-section');
const resultsContainer = document.getElementById('results-container');
const backButtonContainer = document.getElementById('back-button-container');
const backBtn = document.getElementById('back-btn');
// Main site wrapper used for adjusting layout when routing
const siteMain = document.querySelector('.site-main');

const apikeyQuotaBtnOrig = apikeyQuotaBtn ? apikeyQuotaBtn.innerHTML : 'Show Quota';

/* ------------------------------------------------------------------ */
/*  Routing                                                            */
/* ------------------------------------------------------------------ */

function initRouter() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
}

function handleRoute() {
    const hash = window.location.hash || '#home';
    if (hash === '#results') {
        showResultsPage();
    } else {
        showHomePage();
    }
}

function showHomePage() {
    if (inputSection) inputSection.hidden = false;
    if (backButtonContainer) backButtonContainer.hidden = true;
    if (resultsContainer) resultsContainer.hidden = true;
    if (typeof siteMain !== 'undefined' && siteMain) siteMain.style.paddingTop = '';
}

function showResultsPage() {
    if (inputSection) inputSection.hidden = true;
    if (backButtonContainer) backButtonContainer.hidden = false;
    if (resultsContainer) resultsContainer.hidden = false;
    if (typeof siteMain !== 'undefined' && siteMain) siteMain.style.paddingTop = '0';
}

function navigateToResults() {
    window.location.hash = '#results';
}

function navigateToHome() {
    window.location.hash = '#home';
}

/* ------------------------------------------------------------------ */
/*  Initialization                                                     */
/* ------------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', () => {
    loadApiKey();
    bindEvents();
    aboutModal?.setAttribute('hidden', '');
    apikeyQuotaModal?.setAttribute('hidden', '');
    initRouter();
    // If the user refreshed the page while on the results route, return
    // them to the home page to avoid a partially-initialized results view.
    try {
        const isResultsHash = window.location.hash === '#results';
        let navType = null;
        if (performance && typeof performance.getEntriesByType === 'function') {
            const entries = performance.getEntriesByType('navigation');
            if (entries && entries.length > 0) navType = entries[0].type;
        }
        // Fallback for older browsers
        if (!navType && performance && performance.navigation) {
            navType = performance.navigation.type === 1 ? 'reload' : 'navigate';
        }

        if (isResultsHash && navType === 'reload') {
            navigateToHome();
        }
    } catch (e) {
        // Non-fatal; continue initialization
    }

    logInfo('Application initialized');


});

/* ------------------------------------------------------------------ */
/*  Event Binding                                                      */
/* ------------------------------------------------------------------ */

function bindEvents() {
    scanForm?.addEventListener('submit', handleScanSubmit);

    document.querySelectorAll('.example-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const exampleUrl = btn.getAttribute('data-url');
            if (urlInput && exampleUrl) {
                urlInput.value = exampleUrl;
                urlInput.focus();
                toggleUrlClearBtn();
            }
        });
    });

    // About modal
    aboutBtn?.addEventListener('click', showAboutModal);
    aboutCloseBtn?.addEventListener('click', hideAboutModal);
    aboutOkBtn?.addEventListener('click', hideAboutModal);
    aboutModal?.addEventListener('click', (e) => { if (e.target === aboutModal) hideAboutModal(); });

    // Global handlers for Scan Error modal buttons so they behave even if
    // the modal was manipulated in DevTools or shown in different code paths.
    if (scanErrorProceedBtn) {
        scanErrorProceedBtn.addEventListener('click', () => {
            // If the proceed button is still disabled (countdown), ignore clicks
            if (scanErrorProceedBtn.disabled) return;
            if (_scanErrorResolve) {
                try { _scanErrorResolve('proceed'); } catch (e) { /* ignore */ }
                _scanErrorResolve = null;
            }
            _cleanupScanErrorModalState();
            hideScanErrorModal();
        });
    }

    if (scanErrorMainBtn) {
        scanErrorMainBtn.addEventListener('click', () => {
            if (_scanErrorResolve) {
                try { _scanErrorResolve('main'); } catch (e) { /* ignore */ }
                _scanErrorResolve = null;
            }
            _cleanupScanErrorModalState();
            hideScanErrorModal();
            navigateToHome();
        });
    }

    // API key
    apikeyActionBtn?.addEventListener('click', handleApiKeyAction);
    apikeyInput?.addEventListener('input', () => {
        if (apikeyError) apikeyError.classList.add('hidden');
        toggleApikeyClearBtn();
    });
    apikeyClearBtn?.addEventListener('click', () => {
        if (!apikeyInput) return;
        apikeyInput.value = '';
        apikeyInput.focus();
        if (apikeyError) {
            apikeyError.textContent = '';
            apikeyError.classList.add('hidden');
        }
        // Ensure Save button is ready for input
        if (apikeyActionBtn) {
            apikeyActionBtn.textContent = 'Save';
            apikeyActionBtn.className = 'btn btn-success btn-sm api-key-action';
            apikeyActionBtn.disabled = false;
        }
        toggleApikeyClearBtn();
    });
    apikeyQuotaBtn?.addEventListener('click', handleQuotaButtonClick);
    apikeyQuotaCloseBtn?.addEventListener('click', hideQuotaModal);
    apikeyQuotaCloseFooter?.addEventListener('click', hideQuotaModal);
    apikeyQuotaModal?.addEventListener('click', (e) => { if (e.target === apikeyQuotaModal) hideQuotaModal(); });
    apikeyInvalidCloseBtn?.addEventListener('click', hideApikeyInvalidModal);
    apikeyInvalidOkBtn?.addEventListener('click', hideApikeyInvalidModal);
    apikeyInvalidModal?.addEventListener('click', (e) => { if (e.target === apikeyInvalidModal) hideApikeyInvalidModal(); });
    // API key show/hide toggle
    const apikeyToggle = document.getElementById('apikey-toggle');
    apikeyToggle?.addEventListener('click', () => {
        if (!apikeyInput) return;
        // If a key is saved (readOnly + masked value), toggling should reveal
        // the real API key value stored in memory (`vtApiKey`). Otherwise
        // behave like a normal show/hide for editable input.
        const savedState = apikeyInput.readOnly && !!vtApiKey;
        if (savedState) {
            const revealed = apikeyInput.getAttribute('data-revealed') === 'true';
            if (!revealed) {
                apikeyInput.type = 'text';
                apikeyInput.value = vtApiKey;
                apikeyInput.setAttribute('data-revealed', 'true');
                apikeyToggle.setAttribute('aria-pressed', 'true');
                apikeyToggle.setAttribute('aria-label', 'Hide API key');
            } else {
                apikeyInput.type = 'password';
                apikeyInput.value = '\u2713 ' + '\u2022'.repeat(Math.min(16, vtApiKey.length));
                apikeyInput.setAttribute('data-revealed', 'false');
                apikeyToggle.setAttribute('aria-pressed', 'false');
                apikeyToggle.setAttribute('aria-label', 'Show API key');
            }
        } else {
            const currentlyVisible = apikeyInput.type === 'text';
            apikeyInput.type = currentlyVisible ? 'password' : 'text';
            apikeyToggle.setAttribute('aria-pressed', String(!currentlyVisible));
            apikeyToggle.setAttribute('aria-label', !currentlyVisible ? 'Hide API key' : 'Show API key');
        }
    });

    // API key required modal
    apikeyRequiredOkBtn?.addEventListener('click', hideApikeyRequiredModal);
    apikeyRequiredCloseBtn?.addEventListener('click', hideApikeyRequiredModal);
    apikeyRequiredModal?.addEventListener('click', (e) => { if (e.target === apikeyRequiredModal) hideApikeyRequiredModal(); });

    // Remove confirmation modal
    removeConfirmYesBtn?.addEventListener('click', confirmApiKeyRemove);
    removeConfirmNoBtn?.addEventListener('click', hideRemoveConfirmModal);
    removeConfirmCloseBtn?.addEventListener('click', hideRemoveConfirmModal);
    removeConfirmModal?.addEventListener('click', (e) => { if (e.target === removeConfirmModal) hideRemoveConfirmModal(); });

    // VT detail modal
    vtDetailCloseBtn?.addEventListener('click', hideVtDetailModal);
    vtDetailCloseFooter?.addEventListener('click', hideVtDetailModal);
    vtDetailModal?.addEventListener('click', (e) => { if (e.target === vtDetailModal) hideVtDetailModal(); });

    // Media preview modal
    mediaPreviewCloseBtn?.addEventListener('click', hideMediaPreviewModal);
    mediaPreviewCloseFooter?.addEventListener('click', hideMediaPreviewModal);
    mediaPreviewModal?.addEventListener('click', (e) => { if (e.target === mediaPreviewModal) hideMediaPreviewModal(); });

    // Scan error modal handlers
    scanErrorCloseBtn?.addEventListener('click', hideScanErrorModal);
    scanErrorCloseFooter?.addEventListener('click', hideScanErrorModal);
    scanErrorRefreshBtn?.addEventListener('click', () => { window.location.reload(); });
    scanErrorModal?.addEventListener('click', (e) => { if (e.target === scanErrorModal) hideScanErrorModal(); });

    // Keyboard
    document.addEventListener('keydown', handleKeyDown);

    // Navigation
    backBtn?.addEventListener('click', handleBackClick);
    urlInput?.addEventListener('input', () => {
        setUrlError('');
        toggleUrlClearBtn();
    });

    // URL clear button
    urlClearBtn?.addEventListener('click', () => {
        if (urlInput) {
            urlInput.value = '';
            urlInput.focus();
            setUrlError('');
            toggleUrlClearBtn();
        }
    });
}

/* ------------------------------------------------------------------ */
/*  URL Clear Button                                                   */
/* ------------------------------------------------------------------ */

function toggleUrlClearBtn() {
    if (!urlClearBtn || !urlInput) return;
    urlClearBtn.hidden = !urlInput.value;
}

function toggleApikeyClearBtn() {
    if (!apikeyClearBtn || !apikeyInput) return;
    // Hide clear when input is readOnly (saved state) or empty
    apikeyClearBtn.hidden = apikeyInput.readOnly || !apikeyInput.value;
}

/* ------------------------------------------------------------------ */
/*  Modal Helpers                                                      */
/* ------------------------------------------------------------------ */

function showAboutModal() {
    if (!aboutModal || !aboutBtn) return;
    aboutModal.hidden = false;
    aboutBtn.setAttribute('aria-expanded', 'true');
    enableModalKeyboardHandling(aboutModal, hideAboutModal, modalKeyboardHandlers, 'about');
    aboutCloseBtn?.focus();
}

function hideAboutModal() {
    if (!aboutModal || !aboutBtn) return;
    aboutModal.hidden = true;
    aboutBtn.setAttribute('aria-expanded', 'false');
    disableModalKeyboardHandling(modalKeyboardHandlers, 'about');
    aboutBtn?.focus();
}

function showApikeyRequiredModal() {
    if (!apikeyRequiredModal) return;
    apikeyRequiredModal.hidden = false;
    enableModalKeyboardHandling(apikeyRequiredModal, hideApikeyRequiredModal, modalKeyboardHandlers, 'apikeyRequired');
    apikeyRequiredOkBtn?.focus();
}

function showApikeyInvalidModal() {
    if (!apikeyInvalidModal) return;
    apikeyInvalidModal.hidden = false;
    enableModalKeyboardHandling(apikeyInvalidModal, hideApikeyInvalidModal, modalKeyboardHandlers, 'apikeyInvalid');
    apikeyInvalidOkBtn?.focus();
}

function hideApikeyInvalidModal() {
    if (!apikeyInvalidModal) return;
    apikeyInvalidModal.hidden = true;
    disableModalKeyboardHandling(modalKeyboardHandlers, 'apikeyInvalid');
    // restore focus to the API key input and make it editable again
    if (apikeyInput) {
        apikeyInput.readOnly = false;
        // Keep the input masked by default even when making it editable
        apikeyInput.type = 'password';
        apikeyInput.removeAttribute('data-revealed');
        apikeyInput.focus();
    }
    if (apikeyActionBtn) {
        apikeyActionBtn.disabled = false;
        apikeyActionBtn.textContent = 'Save';
        apikeyActionBtn.className = 'btn btn-success btn-sm api-key-action';
    }
}

function hideApikeyRequiredModal() {
    if (!apikeyRequiredModal) return;
    apikeyRequiredModal.hidden = true;
    disableModalKeyboardHandling(modalKeyboardHandlers, 'apikeyRequired');
    apikeyInput?.focus();
}

function showRemoveConfirmModal() {
    if (!removeConfirmModal) return;
    removeConfirmModal.hidden = false;
    enableModalKeyboardHandling(removeConfirmModal, hideRemoveConfirmModal, modalKeyboardHandlers, 'removeConfirm');
    removeConfirmNoBtn?.focus();
}

function hideRemoveConfirmModal() {
    if (!removeConfirmModal) return;
    removeConfirmModal.hidden = true;
    disableModalKeyboardHandling(modalKeyboardHandlers, 'removeConfirm');
    apikeyActionBtn?.focus();
}

function showQuotaModal() {
    if (!apikeyQuotaModal || !apikeyQuotaBtn) return;
    apikeyQuotaModal.hidden = false;
    apikeyQuotaBtn.setAttribute('aria-expanded', 'true');
    enableModalKeyboardHandling(apikeyQuotaModal, hideQuotaModal, modalKeyboardHandlers, 'quota');
    apikeyQuotaCloseBtn?.focus();
}

function hideQuotaModal() {
    if (!apikeyQuotaModal || !apikeyQuotaBtn) return;
    apikeyQuotaModal.hidden = true;
    disableModalKeyboardHandling(modalKeyboardHandlers, 'quota');
    apikeyQuotaBtn?.focus();
}

function showVtDetailModal(data) {
    if (!vtDetailModal || !vtDetailJson) return;

    // Render collapsible raw JSON
    vtDetailJson.textContent = JSON.stringify(data, null, 2);

    // Render parsed analysis table
    if (vtDetailParsed) {
        vtDetailParsed.innerHTML = '';
        renderVtAnalysisTable(vtDetailParsed, data);
    }

    vtDetailModal.hidden = false;
    enableModalKeyboardHandling(vtDetailModal, hideVtDetailModal, modalKeyboardHandlers, 'vtDetail');
    vtDetailCloseBtn?.focus();
}

function hideVtDetailModal() {
    if (!vtDetailModal) return;
    vtDetailModal.hidden = true;
    disableModalKeyboardHandling(modalKeyboardHandlers, 'vtDetail');
}

function showMediaPreviewModal(src, alt) {
    if (!mediaPreviewModal || !mediaPreviewImg) return;
    mediaPreviewImg.src = src;
    mediaPreviewImg.alt = alt || 'NFT Media Preview';
    mediaPreviewModal.hidden = false;
    enableModalKeyboardHandling(mediaPreviewModal, hideMediaPreviewModal, modalKeyboardHandlers, 'mediaPreview');
    mediaPreviewCloseBtn?.focus();
}

function hideMediaPreviewModal() {
    if (!mediaPreviewModal) return;
    if (mediaPreviewImg) mediaPreviewImg.src = '';
    mediaPreviewModal.hidden = true;
    disableModalKeyboardHandling(modalKeyboardHandlers, 'mediaPreview');
}

/**
 * Show the scan error modal with a descriptive message and abort any running scan.
 * @param {string} message
 */
function _cleanupScanErrorModalState() {
    // Clear countdown
    if (_scanErrorCountdownTimer) {
        clearInterval(_scanErrorCountdownTimer);
        _scanErrorCountdownTimer = null;
    }

    // Remove attached handlers
    if (_scanErrorHandlers.proceed && scanErrorProceedBtn) scanErrorProceedBtn.removeEventListener('click', _scanErrorHandlers.proceed);
    if (_scanErrorHandlers.main && scanErrorMainBtn) scanErrorMainBtn.removeEventListener('click', _scanErrorHandlers.main);
    if (_scanErrorHandlers.close && scanErrorCloseFooter) scanErrorCloseFooter.removeEventListener('click', _scanErrorHandlers.close);
    if (_scanErrorHandlers.refresh && scanErrorRefreshBtn) scanErrorRefreshBtn.removeEventListener('click', _scanErrorHandlers.refresh);

    _scanErrorHandlers.proceed = null;
    _scanErrorHandlers.main = null;
    _scanErrorHandlers.close = null;
    _scanErrorHandlers.refresh = null;

    // NOTE: do NOT resolve the pending promise here. The Promise is resolved
    // explicitly by the user's action handlers (proceed/main/close) to avoid
    // race conditions where cleanup would prematurely resolve it to 'close'.
}

/**
 * Show the scan error modal with a descriptive message and abort any running scan.
 * When called with { flagged: true } returns a Promise that resolves with the
 * user's choice: 'proceed'|'main'|'close'. For normal errors it behaves
 * non-blocking and returns undefined.
 * @param {string} message
 * @param {{flagged?: boolean, countdownSeconds?: number}} [options]
 * @returns {Promise<string|void>|void}
 */
function showScanErrorModal(message, options = {}) {
    // Only abort an in-progress scan for non-flagged (fatal) errors. For
    // flagged results we *pause* the flow and let the user decide to proceed.
    if (!options || !options.flagged) {
        try { abortScan(); } catch (e) {}
    }

    if (scanErrorBody && typeof message === 'string') scanErrorBody.textContent = message;
    if (!scanErrorModal) return;

    // Reset UI state
    scanErrorProceedBtn?.setAttribute('hidden', true);
    if (scanErrorProceedBtn) scanErrorProceedBtn.disabled = true;
    scanErrorMainBtn?.setAttribute('hidden', true);
    scanErrorRefreshBtn?.removeAttribute('hidden');
    scanErrorCloseFooter?.removeAttribute('hidden');

    // Hide the retry/help hint when this is a flagged/malicious stop
    if (scanErrorHelp) scanErrorHelp.hidden = !!(options && options.flagged);
    if (scanErrorFlaggedHelp) scanErrorFlaggedHelp.hidden = !(options && options.flagged);

    // Show modal
    scanErrorModal.hidden = false;
    enableModalKeyboardHandling(scanErrorModal, hideScanErrorModal, modalKeyboardHandlers, 'scanError');

    // If this is a flagged result, switch to flagged-mode UI and return a Promise
    if (options && options.flagged) {
        // Hide refresh button in flagged mode
        if (scanErrorRefreshBtn) scanErrorRefreshBtn.hidden = true;

        // Show proceed & main-page buttons
        if (scanErrorProceedBtn) scanErrorProceedBtn.hidden = false;
        if (scanErrorMainBtn) scanErrorMainBtn.hidden = false;

        // Start disabled countdown on Proceed button
        const countdownSeconds = Number.isInteger(options.countdownSeconds) ? options.countdownSeconds : 5;
        let remaining = countdownSeconds;
        if (scanErrorProceedBtn) {
            scanErrorProceedBtn.disabled = true;
            scanErrorProceedBtn.textContent = `Proceed (${remaining})`;
        }

        // Focus on the modal so assistive tech sees the change
        scanErrorProceedBtn?.setAttribute('aria-disabled', 'true');

        // Return a promise that resolves with the user's action
        return new Promise((resolve) => {
            _scanErrorResolve = resolve;

            _scanErrorCountdownTimer = setInterval(() => {
                remaining -= 1;
                if (remaining > 0) {
                    if (scanErrorProceedBtn) scanErrorProceedBtn.textContent = `Proceed (${remaining})`;
                } else {
                    clearInterval(_scanErrorCountdownTimer);
                    _scanErrorCountdownTimer = null;
                    if (scanErrorProceedBtn) {
                        scanErrorProceedBtn.textContent = 'Proceed';
                        scanErrorProceedBtn.disabled = false;
                        scanErrorProceedBtn.removeAttribute('aria-disabled');
                        scanErrorProceedBtn.focus();
                    }
                }
            }, 1000);

            // Handlers
            const onProceed = () => {
                // Resolve with 'proceed' so the awaiting pipeline continues.
                if (_scanErrorResolve) {
                    try { _scanErrorResolve('proceed'); } catch (e) { /* ignore */ }
                    _scanErrorResolve = null;
                }
                _cleanupScanErrorModalState();
                hideScanErrorModal();
                resolve('proceed');
            };
            const onMain = () => {
                if (_scanErrorResolve) {
                    try { _scanErrorResolve('main'); } catch (e) { /* ignore */ }
                    _scanErrorResolve = null;
                }
                _cleanupScanErrorModalState();
                hideScanErrorModal();
                resolve('main');
            };
            const onClose = () => {
                if (_scanErrorResolve) {
                    try { _scanErrorResolve('close'); } catch (e) { /* ignore */ }
                    _scanErrorResolve = null;
                }
                _cleanupScanErrorModalState();
                hideScanErrorModal();
                resolve('close');
            };

            // Wire handlers
            if (scanErrorProceedBtn) scanErrorProceedBtn.addEventListener('click', onProceed);
            if (scanErrorMainBtn) scanErrorMainBtn.addEventListener('click', onMain);
            if (scanErrorCloseFooter) scanErrorCloseFooter.addEventListener('click', onClose);

            _scanErrorHandlers.proceed = onProceed;
            _scanErrorHandlers.main = onMain;
            _scanErrorHandlers.close = onClose;
        });
    }

    // Non-flagged default behavior: keep Close + Refresh Page visible
    // Hook refresh button to reload page (existing behavior)
    const onRefresh = () => { window.location.reload(); };
    if (scanErrorRefreshBtn) scanErrorRefreshBtn.addEventListener('click', onRefresh);
    _scanErrorHandlers.refresh = onRefresh;

    scanErrorRefreshBtn?.focus();
}

function hideScanErrorModal() {
    if (!scanErrorModal) return;

    // Ensure timers/handlers cleaned up
    _cleanupScanErrorModalState();

    scanErrorModal.hidden = true;
    disableModalKeyboardHandling(modalKeyboardHandlers, 'scanError');
}

function handleKeyDown(event) {
    if (event.key === 'Escape') {
        if (vtDetailModal && !vtDetailModal.hidden) hideVtDetailModal();
        else if (mediaPreviewModal && !mediaPreviewModal.hidden) hideMediaPreviewModal();
        else if (aboutModal && !aboutModal.hidden) hideAboutModal();
        else if (apikeyQuotaModal && !apikeyQuotaModal.hidden) hideQuotaModal();
        else if (apikeyRequiredModal && !apikeyRequiredModal.hidden) hideApikeyRequiredModal();
        else if (removeConfirmModal && !removeConfirmModal.hidden) hideRemoveConfirmModal();
    }
}

/* ------------------------------------------------------------------ */
/*  API Key Management                                                 */
/* ------------------------------------------------------------------ */

function setQuotaButtonLoading(loading) {
    if (!apikeyQuotaBtn) return;
    if (loading) {
        apikeyQuotaBtn.disabled = true;
        apikeyQuotaBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Fetching...';
    } else {
        apikeyQuotaBtn.disabled = false;
        apikeyQuotaBtn.innerHTML = apikeyQuotaBtnOrig;
    }
}

function updateApiKeyUI() {
    if (!apikeyActionBtn || !apikeyQuotaBtn) return;
    const apikeyToggle = document.getElementById('apikey-toggle');
    const cached = sessionStorage.getItem('nft-scanner-vt-quota');

    if (vtApiKey) {
        if (apikeyInput) {
            apikeyInput.type = 'password';
            apikeyInput.value = '\u2713 ' + '\u2022'.repeat(Math.min(16, vtApiKey.length));
            apikeyInput.readOnly = true;
            apikeyInput.classList.add('input-success');
            apikeyInput.setAttribute('data-revealed', 'false');
        }
        apikeyActionBtn.hidden = false;
        apikeyActionBtn.disabled = false;
        apikeyActionBtn.textContent = 'Remove';
        apikeyActionBtn.className = 'btn btn-danger btn-sm api-key-action';
        // Show quota button; enable only if we have cached quotas
        if (apikeyQuotaBtn) {
            apikeyQuotaBtn.hidden = false;
            apikeyQuotaBtn.disabled = !cached;
        }
        if (apikeyToggle) {
            apikeyToggle.setAttribute('aria-pressed', 'false');
            apikeyToggle.setAttribute('aria-label', 'Show API key');
        }
        if (scanBtn) scanBtn.disabled = false;
        // Allow URL input when an API key is saved
        if (urlInput) {
            urlInput.disabled = false;
            urlInput.removeAttribute('aria-disabled');
            // ensure the disabled-help is hidden
            const urlDisabledHelp = document.getElementById('url-disabled-help');
            if (urlDisabledHelp) urlDisabledHelp.classList.add('hidden');
            // restore original aria-describedby (url-help and url-error)
            urlInput.setAttribute('aria-describedby', 'url-help url-error');
        }
        // Make the entire URL card interactive again
        if (urlCardWrap) {
            try { urlCardWrap.inert = false; } catch (e) {}
            urlCardWrap.classList.remove('inactive');
            urlCardWrap.removeAttribute('aria-disabled');
        }
        // hide clear when key is saved/masked
        if (typeof toggleApikeyClearBtn === 'function') toggleApikeyClearBtn();
    } else {
        if (apikeyInput) {
            // Keep editable input masked by default
            apikeyInput.type = 'password';
            apikeyInput.value = '';
            apikeyInput.readOnly = false;
            apikeyInput.classList.remove('input-success');
            apikeyInput.removeAttribute('data-revealed');
        }
        apikeyActionBtn.hidden = false;
        apikeyActionBtn.disabled = false;
        apikeyActionBtn.textContent = 'Save';
        apikeyActionBtn.className = 'btn btn-success btn-sm api-key-action';
        // Hide Show Quota until a valid API key is saved
        if (apikeyQuotaBtn) {
            apikeyQuotaBtn.hidden = true;
            apikeyQuotaBtn.disabled = true;
        }
        if (apikeyToggle) {
            apikeyToggle.setAttribute('aria-pressed', 'false');
            apikeyToggle.setAttribute('aria-label', 'Show API key');
        }
        if (scanBtn) scanBtn.disabled = true;
        // Prevent URL input editing until a valid API key is saved
        if (urlInput) {
            urlInput.disabled = true;
            urlInput.setAttribute('aria-disabled', 'true');
            // show disabled help and update aria-describedby to include it
            const urlDisabledHelp = document.getElementById('url-disabled-help');
            if (urlDisabledHelp) urlDisabledHelp.classList.remove('hidden');
            urlInput.setAttribute('aria-describedby', 'url-help url-disabled-help url-error');
        }
        // Make the entire URL card inert / non-interactive when no API key
        if (urlCardWrap) {
            try { urlCardWrap.inert = true; } catch (e) {}
            urlCardWrap.classList.add('inactive');
            urlCardWrap.setAttribute('aria-disabled', 'true');
        }
            if (typeof toggleApikeyClearBtn === 'function') toggleApikeyClearBtn();
    }
}

function loadApiKey() {
    try {
        const stored = localStorage.getItem('nft-scanner-vt-api-key');
        if (stored) {
            vtApiKey = stored;
            logInfo('API key loaded from localStorage');
        }
    } catch (error) {
        logError('StorageError', 'Failed to load API key', { error: error.message });
    }
    updateApiKeyUI();
    // IMPORTANT: Do NOT auto-fetch or reveal quota on page load. The Show Quota
    // Show Quota visibility: keep any cached quota if present so the Show
    // Quota button can persist across page reloads when a key was saved.
    // If quotas are cached in `sessionStorage` the button will be enabled;
    // otherwise it will be visible but disabled until the user requests it.
    try {
        const cached = sessionStorage.getItem('nft-scanner-vt-quota');
        if (vtApiKey) {
            if (apikeyQuotaBtn) {
                apikeyQuotaBtn.hidden = false;
                apikeyQuotaBtn.disabled = !cached;
            }
        } else {
            if (apikeyQuotaBtn) {
                apikeyQuotaBtn.hidden = true;
                apikeyQuotaBtn.disabled = true;
            }
        }
    } catch (err) {
        // non-fatal
    }
    // Ensure the apikey clear button is in the correct initial state
    try { if (typeof toggleApikeyClearBtn === 'function') toggleApikeyClearBtn(); } catch (e) {}
}

async function handleApiKeySave() {
    if (!apikeyInput) return;
    const key = apikeyInput.value.trim();
    if (!key) {
        if (apikeyError) {
            apikeyError.textContent = 'API key is required.';
            apikeyError.classList.remove('hidden');
        }
        return;
    }

    // Clear any previous error
    if (apikeyError) {
        apikeyError.classList.add('hidden');
        apikeyError.textContent = '';
    }
    // Enter validation/checking state (do not persist until validated)
    if (apikeyActionBtn) {
        apikeyActionBtn.textContent = 'Checking';
        apikeyActionBtn.className = 'btn btn-secondary btn-sm api-key-action';
        apikeyActionBtn.disabled = true;
    }
    // Prevent editing while checking
    apikeyInput.readOnly = true;

    setQuotaButtonLoading(true);
    try {
        const quotas = await fetchUserQuota(key);
        if (!quotas) {
            // Invalid key or failed to verify
            showApikeyInvalidModal();
            return;
        }

        // Valid key: persist and enable quota button
        try {
            localStorage.setItem('nft-scanner-vt-api-key', key);
            vtApiKey = key;
            sessionStorage.setItem('nft-scanner-vt-quota', JSON.stringify(quotas));
            if (apikeyQuotaBtn) {
                apikeyQuotaBtn.hidden = false;
                apikeyQuotaBtn.disabled = false;
            }
            updateApiKeyUI();
            logInfo('API key validated and saved');
        } catch (err) {
            logError('StorageError', 'Failed to persist validated API key', { error: err?.message || err });
            if (apikeyError) {
                apikeyError.textContent = 'Failed to save API key after validation.';
                apikeyError.classList.remove('hidden');
            }
        }
    } catch (err) {
        console.warn('[API Key] Error during validation:', err?.message || err);
        showApikeyInvalidModal();
    } finally {
        setQuotaButtonLoading(false);
        // If key was saved, updateApiKeyUI already made input readOnly and masked; otherwise, leave modal handler to re-enable
        if (vtApiKey) {
            // persisted; updateApiKeyUI has set appropriate states
        } else {
            // not persisted: ensure action button is enabled again for retry (modal's hide handler also restores)
            if (apikeyActionBtn) {
                apikeyActionBtn.disabled = false;
            }
        }
    }
}

async function handleApiKeyAction() {
    if (vtApiKey) {
        showRemoveConfirmModal();
    } else {
        await handleApiKeySave();
    }
}

function confirmApiKeyRemove() {
    hideRemoveConfirmModal();
    try {
        localStorage.removeItem('nft-scanner-vt-api-key');
        vtApiKey = '';
        sessionStorage.removeItem('nft-scanner-vt-quota');
        if (apikeyQuotaBtn) {
            apikeyQuotaBtn.hidden = true;
            apikeyQuotaBtn.disabled = true;
        }
        updateApiKeyUI();
        logInfo('API key removed');
    } catch (error) {
        logError('StorageError', 'Failed to remove API key', { error: error.message });
    }
}

async function fetchUserQuota(apiKey) {
    if (!apiKey) return null;
    try {
        const vtEndpoint = `https://www.virustotal.com/api/v3/users/${encodeURIComponent(apiKey)}`;
        const corsProxy = 'https://corsproxy.io/?';
        const resp = await fetch(
            `${corsProxy}${encodeURIComponent(vtEndpoint)}`,
            {
                method: 'GET',
                headers: { 'x-apikey': apiKey, 'Accept': 'application/json' },
                signal: AbortSignal.timeout(10_000),
            }
        );
        if (!resp.ok) return null;
        const data = await resp.json();
        return data?.data?.attributes?.quotas ?? null;
    } catch {
        return null;
    }
}

function renderQuotaAndShow() {
    const raw = sessionStorage.getItem('nft-scanner-vt-quota');
    if (!raw) return;
    let quotas;
    try { quotas = JSON.parse(raw); } catch { return; }

    const tbody = apikeyQuotaTable?.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const humanize = (k) => {
        const map = {
            api_requests_hourly: 'API Requests (Hourly)',
            api_requests_daily: 'API Requests (Daily)',
            api_requests_monthly: 'API Requests (Monthly)',
            intelligence_downloads_monthly: 'Intelligence Downloads (Monthly)',
            intelligence_searches_monthly: 'Intelligence Searches (Monthly)',
            intelligence_retrohunt_jobs_monthly: 'RetroHunt Jobs (Monthly)',
            intelligence_hunting_rules: 'Hunting Rules',
            intelligence_graphs_private: 'Private Graphs',
            monitor_storage_bytes: 'Monitor Storage (Bytes)',
            monitor_storage_files: 'Monitor Storage (Files)',
            collections_creation_monthly: 'Collections Creation (Monthly)',
            private_scans_monthly: 'Private Scans (Monthly)',
            private_scans_per_minute: 'Private Scans (Per Minute)',
            private_urlscans_monthly: 'Private URL Scans (Monthly)',
            private_urlscans_per_minute: 'Private URL Scans (Per Minute)',
        };
        return map[k] || k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    };

    Object.keys(quotas).forEach((key) => {
        const q = quotas[key];
        const allowed = (q && typeof q.allowed === 'number') ? q.allowed.toLocaleString() : (q?.allowed ?? '-');
        const used = (q && typeof q.used === 'number') ? q.used.toLocaleString() : (q?.used ?? '-');
        const row = document.createElement('tr');
        const td1 = document.createElement('td'); td1.textContent = humanize(key);
        const td2 = document.createElement('td'); td2.textContent = allowed;
        const td3 = document.createElement('td'); td3.textContent = used;
        row.append(td1, td2, td3);
        tbody.appendChild(row);
    });

    showQuotaModal();
}

async function handleQuotaButtonClick() {
    if (!apikeyQuotaBtn) return;
    const raw = sessionStorage.getItem('nft-scanner-vt-quota');
    if (raw) { renderQuotaAndShow(); return; }

    setQuotaButtonLoading(true);
    if (!vtApiKey) { setQuotaButtonLoading(false); return; }

    try {
        const quotas = await fetchUserQuota(vtApiKey);
        if (!quotas) throw new Error('Could not fetch quota');
        sessionStorage.setItem('nft-scanner-vt-quota', JSON.stringify(quotas));
        renderQuotaAndShow();
    } catch (err) {
        console.error('[Quota] Failed:', err);
    } finally {
        setQuotaButtonLoading(false);
    }
}

/* ------------------------------------------------------------------ */
/*  URL Error & Scan Button                                            */
/* ------------------------------------------------------------------ */

function setUrlError(message) {
    if (!urlError || !urlInput) return;
    if (message) {
        urlError.textContent = message;
        urlError.classList.remove('hidden');
        urlInput.setAttribute('aria-invalid', 'true');
    } else {
        urlError.textContent = '';
        urlError.classList.add('hidden');
        urlInput.removeAttribute('aria-invalid');
    }
}

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
/*  Step Card Helpers                                                  */
/* ------------------------------------------------------------------ */

const STEP_ICONS = {
    pending: '○',
    active: '<span class="spinner spinner-step" aria-hidden="true"></span>',
    success: '<span class="icon-success">✓</span>',
    warning: '<span class="icon-warning">⚠</span>',
    error: '<span class="icon-error">✕</span>',
    skipped: '<span class="icon-skipped">⊘</span>',
};

/** Clears all rendered step cards from the results container. */
function clearResults() {
    if (resultsContainer) resultsContainer.innerHTML = '';
}

/**
 * Creates a new step card and appends it to the results container.
 * Enhanced with status strip and collapsible log drawer.
 * @param {string} title - Step heading text
 * @param {string} [processId] - Optional process ID for log subscription
 * @returns {Object} References to card sub-elements for later updates
 */
function createStepCard(title, processId = null, showLogs = true) {
    const card = document.createElement('div');
    card.className = 'scan-step-card';
    card.setAttribute('data-status', 'active');

    const header = document.createElement('div');
    header.className = 'scan-step-header';

    const iconWrap = document.createElement('span');
    iconWrap.className = 'scan-step-icon';
    iconWrap.innerHTML = STEP_ICONS.active;

    const titleEl = document.createElement('h3');
    titleEl.className = 'scan-step-title';
    titleEl.textContent = title;

    const badgeArea = document.createElement('span');
    badgeArea.className = 'scan-step-badge-area';

    // Retry button (hidden by default, shown when step status === 'error')
    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'btn btn-ghost btn-xs scan-step-retry';
    retryBtn.title = 'Retry this step';
    retryBtn.setAttribute('aria-label', 'Retry this step');
    retryBtn.textContent = 'Retry';
    retryBtn.hidden = true;

    header.append(iconWrap, titleEl, badgeArea, retryBtn);

    // Status strip for live updates
    const statusStrip = document.createElement('div');
    statusStrip.className = 'scan-step-status-strip';
    statusStrip.setAttribute('role', 'status');
    statusStrip.setAttribute('aria-live', 'polite');
    statusStrip.style.display = 'none'; // Hidden by default

    const body = document.createElement('div');
    body.className = 'scan-step-body';

    // Collapsible log drawer (optional)
    let logDrawer = null;
    let logContainer = null;
    if (showLogs) {
        logDrawer = document.createElement('details');
        logDrawer.className = 'scan-step-log-drawer';
        const logSummary = document.createElement('summary');
        logSummary.className = 'scan-step-log-toggle';
        logSummary.textContent = 'Show logs';
        logDrawer.appendChild(logSummary);

        logContainer = document.createElement('div');
        logContainer.className = 'scan-step-log-container';
        logContainer.setAttribute('role', 'log');
        logContainer.setAttribute('aria-live', 'polite');
        logDrawer.appendChild(logContainer);

        // Toggle text on open/close
        logDrawer.addEventListener('toggle', () => {
            logSummary.textContent = logDrawer.open ? 'Hide logs' : 'Show logs';
        });
    }

    if (logDrawer) card.append(header, statusStrip, body, logDrawer);
    else card.append(header, statusStrip, body);
    resultsContainer.appendChild(card);

    requestAnimationFrame(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));

    // Subscribe to process logs if processId provided and logs are visible
    if (processId && logContainer) {
        onProcessEvent(processId, 'log', (entry) => {
            appendLogEntry(logContainer, entry);
        });

        onProcessEvent(processId, 'statusChange', (data) => {
            updateStatusStrip(statusStrip, data.status);
        });
    }

    // Build the step object (include retry button reference)
    const step = { card, header, body, iconWrap, titleEl, badgeArea, statusStrip, logContainer, logDrawer, retryBtn };

    // Retry button handler — delegates to retryStep which will inspect step.meta
    retryBtn.addEventListener('click', (e) => {
        e.preventDefault();
        retryStep(step).catch(err => {
            console.error('[NFT-Scanner] Retry failed', { timestamp: new Date().toISOString(), step: step.titleEl.textContent, error: err });
        });
    });

    return step;
}


/**
 * Creates and appends a log drawer to an existing step card (used when logs
 * should be revealed after an interaction, e.g., Media Scan choice).
 * @param {Object} step - Step object returned from createStepCard
 * @param {string|null} processId - Optional process id to subscribe to
 */
function attachLogDrawerToStep(step, processId = null) {
    if (!step || !step.card || step.logDrawer) return;

    const logDrawer = document.createElement('details');
    logDrawer.className = 'scan-step-log-drawer';
    const logSummary = document.createElement('summary');
    logSummary.className = 'scan-step-log-toggle';
    logSummary.textContent = 'Show logs';
    logDrawer.appendChild(logSummary);

    const logContainer = document.createElement('div');
    logContainer.className = 'scan-step-log-container';
    logContainer.setAttribute('role', 'log');
    logContainer.setAttribute('aria-live', 'polite');
    logDrawer.appendChild(logContainer);

    logDrawer.addEventListener('toggle', () => {
        logSummary.textContent = logDrawer.open ? 'Hide logs' : 'Show logs';
    });

    step.card.appendChild(logDrawer);
    // expose the new nodes back onto the step object for callers
    step.logDrawer = logDrawer;
    step.logContainer = logContainer;

    if (processId) {
        onProcessEvent(processId, 'log', (entry) => appendLogEntry(logContainer, entry));
        onProcessEvent(processId, 'statusChange', (data) => updateStatusStrip(step.statusStrip, data.status));
    }
}

/**
 * Appends a log entry to the log container.
 * @param {HTMLElement} container - Log container element
 * @param {Object} entry - Log entry
 */
function appendLogEntry(container, entry) {
    const logEntry = document.createElement('div');
    logEntry.className = `scan-step-log-entry log-${entry.level}`;
    
    const timestamp = document.createElement('span');
    timestamp.className = 'log-timestamp';
    // Always display timestamps in UTC with seconds and AM/PM to match log UX requirements
    timestamp.textContent = new Date(entry.timestamp)
        .toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) + ' UTC';
    
    const message = document.createElement('span');
    message.className = 'log-message';
    // If the message is JSON, parse it and include it in the meta block
    let parsedMessage = null;
    try {
        if (typeof entry.message === 'string' && (entry.message.trim().startsWith('{') || entry.message.trim().startsWith('['))) {
            parsedMessage = JSON.parse(entry.message);
        }
    } catch (e) {
        parsedMessage = null;
    }

    // Human-friendly conversions for timing phrases (e.g. "Waiting 5000ms")
    let displayMessage = parsedMessage ? (parsedMessage.message || '[JSON payload]') : entry.message;
    // Convert explicit "Waiting 5000ms" -> "Wait 5 seconds"
    displayMessage = displayMessage.replace(/\bWaiting\s+(\d+)ms\b/i, (_, ms) => {
        const s = Number(ms) / 1000;
        return `Wait ${s} second${s === 1 ? '' : 's'}`;
    });
    // Fallback: convert remaining bare "1234ms" tokens to "1.23s"
    displayMessage = displayMessage.replace(/(\d+)ms/g, (m, ms) => `${(Number(ms) / 1000).toFixed(2)}s`);

    message.textContent = displayMessage;
    
    logEntry.append(timestamp, message);
    
    // Combine parsed message JSON and meta into a single display object if present
    const combinedMeta = {};
    if (parsedMessage) combinedMeta.payload = parsedMessage;
    if (entry.meta && Object.keys(entry.meta).length > 0) combinedMeta.meta = entry.meta;

    // Helper: convert ms-like numeric fields to seconds (human readable)
    function convertMsValues(obj) {
        if (obj === null || obj === undefined) return obj;
        if (Array.isArray(obj)) return obj.map(convertMsValues);
        if (typeof obj === 'object') {
            const out = {};
            for (const [k, v] of Object.entries(obj)) {
                out[k] = convertMsValues(v);
            }
            return out;
        }
        // Strings like '1500ms' or '1500 ms'
        if (typeof obj === 'string') {
            const m = obj.match(/^(\\s*)(\\d+)(\\s*)ms$/i);
            if (m) {
                const num = Number(m[2]);
                return `${(num / 1000).toFixed(2)}s`;
            }
            return obj;
        }
        // Numbers that look like milliseconds (heuristic)
        if (typeof obj === 'number') {
            // If value >= 1000 and key name likely a time value, convert.
            // Heuristic used by caller by passing likely fields; here just convert large numbers.
            if (obj >= 1000 && obj < 86400000) {
                return `${(obj / 1000).toFixed(2)}s`;
            }
            return obj;
        }
        return obj;
    }

    if (Object.keys(combinedMeta).length > 0) {
        try {
                const converted = convertMsValues(combinedMeta);
                // Prefer human-friendly display for known shapes
                const payloadMeta = converted.payload?.meta || converted.meta || converted.payload || null;

                function isPlainObject(v) {
                    return v && typeof v === 'object' && !Array.isArray(v);
                }

                if (isPlainObject(payloadMeta)) {
                    const keys = Object.keys(payloadMeta);
                    if (keys.length > 0) {
                        // Compose a single-line message that includes selected meta values
                        // e.g. "Starting analysis polling | Analysis Id: ... | Max Polls: 6"
                        const base = String(displayMessage || '');
                        const inlineParts = [];
                        const waitParts = [];

                        for (const k of keys) {
                            const val = payloadMeta[k];
                            const prettyKey = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());

                            // Treat interval-like numeric values as "Wait X seconds"
                            if (/interval|pollInterval|timeout/i.test(k) && (typeof val === 'number' || /^\d+$/.test(String(val)))) {
                                const seconds = (Number(String(val).replace(/\D/g, '')) / 1000);
                                waitParts.push(`Wait ${Number.isInteger(seconds) ? seconds : seconds.toFixed(2)} second${seconds === 1 ? '' : 's'}`);
                                continue;
                            }

                            // Primitive/simple values -> inline key: value
                            if (val === null || typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
                                inlineParts.push(`${prettyKey}: ${String(val)}`);
                                continue;
                            }

                            // Small arrays / small plain objects -> stringify inline
                            if (Array.isArray(val) || (typeof val === 'object' && Object.keys(val).length <= 3)) {
                                inlineParts.push(`${prettyKey}: ${JSON.stringify(val)}`);
                                continue;
                            }

                            // Complex/large value -> attach collapsible JSON block below
                            const jsonText = JSON.stringify(val, null, 2);
                            const details = document.createElement('details');
                            details.className = 'log-meta-details';
                            const summary = document.createElement('summary');
                            summary.className = 'log-meta-summary';
                            summary.textContent = `${prettyKey} (details)`;
                            const pre = document.createElement('pre');
                            pre.className = 'log-meta';
                            pre.textContent = jsonText;
                            details.append(summary, pre);
                            logEntry.appendChild(details);
                        }

                        // Build final inline text
                        let finalText = base;
                        if (inlineParts.length) finalText += (finalText ? ' | ' : '') + inlineParts.join(' | ');
                        if (waitParts.length) {
                            // append waitParts as sentence(s) after a period
                            finalText += (finalText.endsWith('.') ? ' ' : '. ') + waitParts.join(' ');
                        }

                        // Avoid duplicating 'Wait' if already present in base
                        if (!/\bWait\s+\d+/i.test(base)) {
                            message.textContent = finalText;
                        }
                    } else {
                        // Fallback: keep collapsible JSON
                        const jsonText = JSON.stringify(payloadMeta, null, 2);
                        const details = document.createElement('details');
                        details.className = 'log-meta-details';
                        const summary = document.createElement('summary');
                        summary.className = 'log-meta-summary';
                        summary.textContent = 'Show details';
                        const pre = document.createElement('pre');
                        pre.className = 'log-meta';
                        pre.textContent = jsonText;
                        details.append(summary, pre);
                        logEntry.appendChild(details);
                    }
                } else {
                    // Fallback: show converted combinedMeta as JSON (collapsible if large)
                    const jsonText = JSON.stringify(converted, null, 2);
                    const isLarge = jsonText.length > 400 || jsonText.split('\n').length > 12;
                    if (isLarge) {
                        const details = document.createElement('details');
                        details.className = 'log-meta-details';
                        const summary = document.createElement('summary');
                        summary.className = 'log-meta-summary';
                        summary.textContent = 'Show details';
                        const pre = document.createElement('pre');
                        pre.className = 'log-meta';
                        pre.textContent = jsonText;
                        details.append(summary, pre);
                        logEntry.appendChild(details);
                    } else {
                        const pre = document.createElement('pre');
                        pre.className = 'log-meta';
                        pre.textContent = jsonText;
                        logEntry.appendChild(pre);
                    }
                }
        } catch (e) {
            const meta = document.createElement('pre');
            meta.className = 'log-meta';
            meta.textContent = String(combinedMeta);
            logEntry.appendChild(meta);
        }
    }
    
    container.appendChild(logEntry);
    
    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
}

/**
 * Updates the status strip with current operation info.
 * @param {HTMLElement} strip - Status strip element
 * @param {string} status - Status message
 */
function updateStatusStrip(strip, status) {
    strip.textContent = status;
    strip.style.display = status ? 'block' : 'none';
}

/**
 * Updates a step card's status (icon + data attribute).
 * @param {Object} step - Step card reference object
 * @param {string} status - One of: pending, active, success, warning, error, skipped
 */
function setStepStatus(step, status) {
    step.card.setAttribute('data-status', status);
    step.iconWrap.innerHTML = STEP_ICONS[status] || STEP_ICONS.pending;

    // Show Retry control only for steps in `error` state and if the step supports retry
    try {
        if (step.retryBtn) {
            const supported = step.meta && ['url-scan', 'media-url-scan', 'media-file-scan'].includes(step.meta.type);
            const retryable = step.meta ? (step.meta.retryable !== false) : false;
            step.retryBtn.hidden = !(status === 'error' && supported && retryable);
            // ensure button is enabled when visible
            if (!step.retryBtn.hidden) step.retryBtn.disabled = false;
        }
    } catch (e) {
        // Non-fatal if step object shape differs
    }
}


/**
 * Adds a small badge next to the step title.
 * @param {Object} step - Step card reference object
 * @param {string} text - Badge label
 * @param {string} [className] - Additional CSS class
 */
function addStepBadge(step, text, className) {
    const badge = document.createElement('span');
    badge.className = `step-badge ${className || ''}`;
    badge.textContent = text;
    step.badgeArea.appendChild(badge);
}

/* ------------------------------------------------------------------ */
/*  Table Helpers                                                      */
/* ------------------------------------------------------------------ */

/**
 * Creates a table with headers inside a scrollable wrapper.
 * Includes resize handles on each column header.
 * @param {string[]} headers - Column header texts
 * @returns {{ wrapper: HTMLDivElement, table: HTMLTableElement, tbody: HTMLTableSectionElement }}
 */
function createScanTable(headers, options = {}) {
    const vertical = !!options.vertical;
    const wrapper = document.createElement('div');
    wrapper.className = vertical ? 'metadata-table-wrapper' : 'table-wrapper';

    const table = document.createElement('table');
    table.className = vertical ? 'metadata-table' : 'scan-table';

    let tbody = document.createElement('tbody');

    if (!vertical) {
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headers.forEach((h) => {
            const th = document.createElement('th');
            th.textContent = h;
            // Resize handle
            const handle = document.createElement('div');
            handle.className = 'col-resize-handle';
            th.appendChild(handle);
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        table.appendChild(tbody);
        wrapper.appendChild(table);

        // Enable column resizing for horizontal tables
        enableColumnResize(table);
    } else {
        // Vertical metadata-style table: no thead, tbody will contain rows of label/value
        table.appendChild(tbody);
        wrapper.appendChild(table);
    }

    return { wrapper, table, tbody, vertical };
}

/**
 * Populate a vertical metadata-style tbody with label/value pairs.
 * `values` may contain strings or HTMLElements to append into the value cell.
 * @param {HTMLTableSectionElement} tbody
 * @param {string[]} labels
 * @param {(string|HTMLElement)[]} values
 */
function populateVerticalRow(tbody, labels, values) {
    // Remove any previous rows for this item (we'll append a fresh set)
    // Note: caller should remove placeholders if present
    for (let i = 0; i < labels.length; i++) {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.textContent = labels[i];
        const td = document.createElement('td');
        const v = values[i];
        if (v instanceof HTMLElement) td.appendChild(v);
        else td.textContent = v == null ? '-' : String(v);
        tr.append(th, td);
        tbody.appendChild(tr);
    }
}

/**
 * Enables drag-to-resize on table column headers.
 * @param {HTMLTableElement} table
 */
function enableColumnResize(table) {
    const handles = table.querySelectorAll('.col-resize-handle');
    handles.forEach((handle) => {
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const th = handle.parentElement;
            const startX = e.pageX;
            const startWidth = th.offsetWidth;
            handle.classList.add('resizing');

            const onMouseMove = (moveEvent) => {
                const newWidth = Math.max(40, startWidth + (moveEvent.pageX - startX));
                th.style.width = `${newWidth}px`;
                th.style.minWidth = `${newWidth}px`;
            };
            const onMouseUp = () => {
                handle.classList.remove('resizing');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    });
}

/**
 * Creates a placeholder row with "-" in every column.
 * @param {number} colCount - Number of columns
 * @returns {HTMLTableRowElement}
 */
function createPlaceholderRow(colCount) {
    const row = document.createElement('tr');
    row.className = 'placeholder-row';
    for (let i = 0; i < colCount; i++) {
        const td = document.createElement('td');
        td.textContent = '-';
        row.appendChild(td);
    }
    return row;
}

/**
 * Creates a magnifying-glass button that opens the VT detail modal.
 * @param {Object} analysisData - Raw analysis JSON to display
 * @returns {HTMLButtonElement}
 */
function createMagnifyButton(analysisData) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-ghost btn-sm btn-magnify';
    btn.type = 'button';
    btn.textContent = '🔍';
    btn.title = 'View analysis details';
    btn.setAttribute('aria-label', 'View VirusTotal analysis details');
    btn.addEventListener('click', () => showVtDetailModal(analysisData));
    return btn;
}

/**
 * Retry a previously failed step. Uses step.meta (set by the pipeline) to
 * determine how to re-run the specific operation (URL scan, media URL scan,
 * or file scan). Updates the step card in-place and preserves accessibility.
 * @param {Object} step
 */
async function retryStep(step) {
    if (!step) return;
    if (!step.meta) {
        step.body.insertAdjacentHTML('beforeend', '<p class="step-msg step-msg-error">Retry not available for this step.</p>');
        return;
    }

    // Do not allow retry if marked non-retryable (e.g. flagged/unsafe result)
    if (step.meta.retryable === false) {
        step.body.insertAdjacentHTML('beforeend', '<p class="step-msg step-msg-error">This step cannot be retried because it was stopped due to a flagged/unsafe result.</p>');
        return;
    }

    // Prevent concurrent retries
    if (step._retrying) return;
    step._retrying = true;

    const btn = step.retryBtn;
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Retrying...';
    }

    logInfo('Retrying step', { step: step.titleEl.textContent, meta: step.meta });

    try {
        // Set visual state to active while we retry
        setStepStatus(step, 'active');

        // Find the table tbody if present and replace with a placeholder
        const table = step.body.querySelector('table');
        let tbody = table ? table.querySelector('tbody') : null;
        if (tbody) {
            tbody.innerHTML = '';
            const ph = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 2;
            td.textContent = 'Retrying...';
            ph.appendChild(td);
            tbody.appendChild(ph);
        } else {
            // Non-table steps: show a simple message
            step.body.innerHTML = '<p class="step-msg">Retrying…</p>';
        }

        // Dispatch by step type
        const type = step.meta.type;

        if (type === 'url-scan' || type === 'media-url-scan') {
            const url = step.meta.url;
            const res = await scanURL(url, vtApiKey, null, { processId: step.meta.processId || null });

            // Rebuild vertical rows (headers provided in meta)
            if (tbody) {
                tbody.innerHTML = '';
                const headers = step.meta.headers || ['Status', 'Scanned URL', 'RESULTS'];
                const info = getStatusInfo(res);
                const statusEl = document.createElement('span');
                statusEl.className = `status-badge ${info.cls}`;
                statusEl.textContent = info.text;

                const urlEl = document.createElement('span');
                urlEl.className = 'cell-url';
                urlEl.textContent = url;
                urlEl.title = url;

                const sumEl = document.createElement('div');
                sumEl.innerHTML = res.scanned ? formatVtSummary(res) : (res.error || '-');
                if (res.rawAnalysis) {
                    const mbtn = createMagnifyButton(res.rawAnalysis);
                    mbtn.classList.add('vt-inline-btn');
                    const vtWrap = document.createElement('span');
                    vtWrap.className = 'vt-details';
                    vtWrap.appendChild(document.createTextNode(' '));
                    vtWrap.appendChild(mbtn);
                    const vtLabelEl = document.createElement('span');
                    vtLabelEl.className = 'vt-label';
                    vtLabelEl.textContent = 'DETAIL';
                    vtWrap.appendChild(vtLabelEl);
                    sumEl.appendChild(vtWrap);
                }

                populateVerticalRow(tbody, headers, [statusEl, urlEl, sumEl]);
            }

            // Update status and handle flagged results like original pipeline
            if (res.scanned !== true) {
                setStepStatus(step, 'error');
                step.body.insertAdjacentHTML('beforeend', `<p class="step-msg step-msg-error">${escapeHtml(res.error || 'Scan failed to complete')}</p>`);
            } else if (res.safe === false) {
                step.meta = step.meta || {};
                step.meta.retryable = false;
                setStepStatus(step, 'error');
                const userChoice = await showScanErrorModal('The resource was flagged as potentially unsafe.', { flagged: true });
                if (userChoice === 'proceed') {
                    setStepStatus(step, 'warning');
                    step.body.insertAdjacentHTML('beforeend', '<p class="step-msg step-msg-warning">Proceed selected — continuing despite flagged result.</p>');
                } else if (userChoice === 'main') {
                    navigateToHome();
                    return;
                } else {
                    // close/abort — leave as error
                }
            } else {
                setStepStatus(step, 'success');
            }

            return;
        }

        if (type === 'media-file-scan') {
            // Ensure we have a blob to upload — re-fetch if necessary
            let blob = step.meta.blob;
            if (!blob && step.meta.url) {
                const fetchRes = await fetchMedia(step.meta.url, null);
                if (!fetchRes.success) {
                    setStepStatus(step, 'error');
                    step.body.insertAdjacentHTML('beforeend', `<p class="step-msg step-msg-error">${escapeHtml(fetchRes.error || 'Failed to fetch media')}</p>`);
                    return;
                }
                blob = fetchRes.blob;
                // Preserve preview metadata for UI
                step.meta.blob = blob;
                step.meta.mimeType = fetchRes.mimeType;
                step.meta.size = fetchRes.size;
                step.meta.objectUrl = fetchRes.objectUrl;
            }

            const fileRes = await scanFile(blob, step.meta.filename || 'file', vtApiKey, null, { processId: step.meta.processId || null });

            if (tbody) {
                tbody.innerHTML = '';
                const headers = step.meta.headers || ['Status', 'Type', 'Size', 'Media Preview', 'VirusTotal Results'];

                const fInfo = getStatusInfo(fileRes);
                const fStatusEl = document.createElement('span');
                fStatusEl.className = `status-badge ${fInfo.cls}`;
                fStatusEl.textContent = fInfo.text;

                const typeEl = document.createElement('span');
                typeEl.textContent = step.meta.mimeType || '-';

                const sizeEl = document.createElement('span');
                sizeEl.textContent = step.meta.size ? formatBytes(step.meta.size) : '-';

                const prevEl = document.createElement('div');
                prevEl.className = 'cell-media';
                if (step.meta.objectUrl) {
                    const thumb = document.createElement('img');
                    thumb.src = step.meta.objectUrl;
                    thumb.alt = 'Media preview';
                    thumb.className = 'media-thumb';
                    thumb.addEventListener('click', () => showMediaPreviewModal(step.meta.objectUrl, 'NFT Media'));
                    prevEl.appendChild(thumb);
                } else {
                    prevEl.textContent = '-';
                }

                const fSumEl = document.createElement('div');
                fSumEl.innerHTML = fileRes.scanned ? formatVtSummary(fileRes) : (fileRes.error || '-');
                if (fileRes.rawAnalysis) {
                    const btn = createMagnifyButton(fileRes.rawAnalysis);
                    btn.classList.add('vt-inline-btn');
                    const vtWrap = document.createElement('span');
                    vtWrap.className = 'vt-details';
                    vtWrap.appendChild(document.createTextNode(' '));
                    vtWrap.appendChild(btn);
                    const vtLabel = document.createElement('span');
                    vtLabel.className = 'vt-label';
                    vtLabel.textContent = 'DETAIL';
                    vtWrap.appendChild(vtLabel);
                    fSumEl.appendChild(vtWrap);
                }

                populateVerticalRow(tbody, headers, [fStatusEl, typeEl, sizeEl, prevEl, fSumEl]);
            }

            if (fileRes.scanned !== true) {
                setStepStatus(step, 'error');
                step.body.insertAdjacentHTML('beforeend', `<p class="step-msg step-msg-error">${escapeHtml(fileRes.error || 'File scan failed')}</p>`);
            } else if (fileRes.safe === false) {
                step.meta = step.meta || {};
                step.meta.retryable = false;
                setStepStatus(step, 'error');
                const fileChoice = await showScanErrorModal('A media file was flagged as potentially unsafe. The scan has been stopped.', { flagged: true });
                if (fileChoice === 'proceed') {
                    setStepStatus(step, 'warning');
                    step.body.insertAdjacentHTML('beforeend', '<p class="step-msg step-msg-warning">Proceed selected — continuing despite flagged result.</p>');
                } else if (fileChoice === 'main') {
                    navigateToHome();
                    return;
                } else {
                    return;
                }
            } else {
                setStepStatus(step, fileRes.scanned ? 'success' : 'warning');
            }

            return;
        }

        // Unsupported retry type
        step.body.insertAdjacentHTML('beforeend', '<p class="step-msg step-msg-error">Retry not supported for this step.</p>');
        setStepStatus(step, 'error');

    } catch (err) {
        setStepStatus(step, 'error');
        step.body.insertAdjacentHTML('beforeend', `<p class="step-msg step-msg-error">${escapeHtml(err.message || String(err))}</p>`);
        logError('Retry failed', { step: step.titleEl.textContent, error: err });
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Retry';
        }
        step._retrying = false;
    }
}


/* ------------------------------------------------------------------ */
/*  Formatting Helpers                                                 */
/* ------------------------------------------------------------------ */

/**
 * Summarises VT scan stats as a short string.
 * @param {import('./validators/security-scanner.js').ScanResult} result
 * @returns {string}
 */
function formatVtSummary(result) {
    if (!result || !result.stats) return '-';
    const { harmless = 0, malicious = 0, suspicious = 0, undetected = 0 } = result.stats;
    const parts = [];
    if (malicious > 0) parts.push(`<span class="vt-malicious"><span class="vt-count">${malicious}</span><span class="vt-label">Malicious</span></span>`);
    if (suspicious > 0) parts.push(`<span class="vt-suspicious"><span class="vt-count">${suspicious}</span><span class="vt-label">Suspicious</span></span>`);
    parts.push(`<span class="vt-clean"><span class="vt-count">${harmless}</span><span class="vt-label">Clean</span></span>`);
    parts.push(`<span class="vt-undetected"><span class="vt-count">${undetected}</span><span class="vt-label">Undetected</span></span>`);
    // No separator — parts render as separate block lines via CSS
    return parts.join('');
}

/**
 * Returns a label and CSS class for a scan result status badge.
 * @param {import('./validators/security-scanner.js').ScanResult} result
 * @returns {{ text: string, cls: string }}
 */
function getStatusInfo(result) {
    if (result.skipped) return { text: 'Skipped', cls: 'status-skipped' };
    if (!result.scanned) return { text: 'Failed', cls: 'status-error' };
    if (result.safe === false) return { text: 'Unsafe', cls: 'status-unsafe' };
    if (result.safe === true) return { text: 'Safe', cls: 'status-safe' };
    return { text: 'Pending', cls: 'status-pending' };
}

/**
 * Formats bytes into a human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Escapes HTML entities in a string for safe insertion.
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* ------------------------------------------------------------------ */
/*  Metadata Rendering                                                 */
/* ------------------------------------------------------------------ */

/**
 * Renders parsed metadata fields as a table.
 * All values set via textContent (XSS-safe).
 * @param {HTMLElement} container - Target element
 * @param {Object} result - Parsed metadata result
 */
function renderParsedMetadata(container, result) {
    const wrapper = document.createElement('div');
    wrapper.className = 'metadata-table-wrapper';

    const table = document.createElement('table');
    table.className = 'metadata-table';

    const tbody = document.createElement('tbody');

    const addRow = (label, value) => {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.textContent = label;
        const td = document.createElement('td');
        if (typeof value === 'string') {
            td.textContent = value;
        } else {
            td.appendChild(value);
        }
        tr.append(th, td);
        tbody.appendChild(tr);
    };

    if (result.name) addRow('Name', result.name);
    if (result.description) addRow('Description', result.description);
    if (result.image) addRow('Image URL', result.image);

    // Properties (Enjin) as a nested sub-table
    if (result.properties && typeof result.properties === 'object') {
        const subTable = document.createElement('table');
        subTable.className = 'meta-sub-table';
        for (const [key, value] of Object.entries(result.properties)) {
            const subRow = document.createElement('tr');
            const subKey = document.createElement('td');
            subKey.className = 'meta-sub-key';
            subKey.textContent = key;
            const subVal = document.createElement('td');
            subVal.textContent = String(value);
            subRow.append(subKey, subVal);
            subTable.appendChild(subRow);
        }
        addRow('Properties', subTable);
    }

    // Attributes (ERC-721/1155) as nested sub-table
    if (Array.isArray(result.attributes) && result.attributes.length > 0) {
        const subTable = document.createElement('table');
        subTable.className = 'meta-sub-table';
        for (const attr of result.attributes) {
            const traitType = attr.trait_type ?? attr.key ?? 'trait';
            const subRow = document.createElement('tr');
            const subKey = document.createElement('td');
            subKey.className = 'meta-sub-key';
            subKey.textContent = traitType;
            const subVal = document.createElement('td');
            subVal.textContent = String(attr.value ?? '');
            subRow.append(subKey, subVal);
            subTable.appendChild(subRow);
        }
        addRow('Attributes', subTable);
    }

    // Additional raw fields not captured in standard parse
    const knownKeys = new Set(['name', 'description', 'image', 'properties', 'attributes', 'media', 'fallback_image', 'external_url', 'animation_url']);
    if (result.raw) {
        for (const [key, value] of Object.entries(result.raw)) {
            if (knownKeys.has(key)) continue;
            if (typeof value === 'object') {
                addRow(key, JSON.stringify(value));
            } else {
                addRow(key, String(value));
            }
        }
        // Show known url fields
        if (result.raw.external_url) addRow('External URL', result.raw.external_url);
        if (result.raw.animation_url) addRow('Animation URL', result.raw.animation_url);
        if (result.raw.fallback_image) addRow('Fallback Image', result.raw.fallback_image);
    }

    table.appendChild(tbody);
    wrapper.appendChild(table);
    container.appendChild(wrapper);
}

/**
 * Renders a VirusTotal analysis result as a parsed table inside a container.
 * Follows the same visual format as the Show Quota modal.
 * @param {HTMLElement} container - Target element
 * @param {Object} data - Raw VT analysis JSON
 */
function renderVtAnalysisTable(container, data) {
    const attrs = data?.data?.attributes;
    if (!attrs) {
        const p = document.createElement('p');
        p.className = 'step-msg';
        p.textContent = 'No analysis data available.';
        container.appendChild(p);
        return;
    }

    /* Helper: apply category/result filters to tbody rows. Returns visible count.
       - categoryFilter: exact-match filter against the Category column
       - resultQuery: substring search across the entire row (Engine, Category, Result)
    */
    function applyVtFilters(tbody, categoryFilter = '', resultQuery = '') {
        const cat = String(categoryFilter || '').toLowerCase();
        const q = String(resultQuery || '').trim().toLowerCase();
        let visible = 0;
        tbody.querySelectorAll('tr').forEach((tr) => {
            const rowCat = String(tr.dataset.vtCategory || '').toLowerCase();

            // If the user supplied a category, require exact match; otherwise allow all
            const matchesCat = !cat || rowCat === cat;

            // For the free-text filter we match against the full row text so the
            // single filter input searches Engine, Category and Result columns.
            const rowText = (tr.textContent || '').toLowerCase();
            const matchesQuery = !q || rowText.includes(q);

            tr.hidden = !(matchesCat && matchesQuery);
            if (!tr.hidden) visible += 1;
        });
        return visible;
    }

    /* Helper: stable-ish sort of tbody rows by column index (0-based). */
    function sortTbodyRows(tbody, colIndex, asc = true) {
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
        rows.sort((a, b) => {
            const aText = String(a.children[colIndex]?.textContent || '').trim();
            const bText = String(b.children[colIndex]?.textContent || '').trim();
            return asc ? collator.compare(aText, bText) : collator.compare(bText, aText);
        });
        rows.forEach((r) => tbody.appendChild(r));
    }

    /* Helper: create filter toolbar (Category select + Result text input + Clear). */
    function createVtFilterToolbar(containerEl, tbody, categories) {
        const toolbar = document.createElement('div');
        toolbar.className = 'vt-filter-toolbar';

        // Category filter (select)
        const catWrap = document.createElement('div');
        catWrap.className = 'filter-control';
        const catLabel = document.createElement('label');
        catLabel.htmlFor = 'vt-cat-filter';
        catLabel.className = 'sr-only';
        catLabel.textContent = 'Filter by Category';
        const catSelect = document.createElement('select');
        catSelect.id = 'vt-cat-filter';
        catSelect.className = 'filter-select';
        const optAll = document.createElement('option'); optAll.value = ''; optAll.textContent = 'All';
        catSelect.appendChild(optAll);
        categories.sort().forEach((c) => {
            const o = document.createElement('option'); o.value = c; o.textContent = c; catSelect.appendChild(o);
        });
        catWrap.append(catLabel, catSelect);
        toolbar.appendChild(catWrap);

        // Result filter (text input)
        const resWrap = document.createElement('div');
        resWrap.className = 'filter-control';
        const resLabel = document.createElement('label');
        resLabel.htmlFor = 'vt-result-filter';
        resLabel.className = 'sr-only';
        resLabel.textContent = 'Filter rows';
        const resInput = document.createElement('input');
        resInput.id = 'vt-result-filter';
        resInput.className = 'filter-input';
        resInput.type = 'search';
        resInput.placeholder = 'Filter';
        resWrap.append(resLabel, resInput);
        toolbar.appendChild(resWrap);

        // Clear button
        const btnWrap = document.createElement('div');
        btnWrap.className = 'filter-control';
        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'btn btn-ghost btn-sm';
        clearBtn.textContent = 'Clear';
        btnWrap.appendChild(clearBtn);
        toolbar.appendChild(btnWrap);

        // Wire events
        const update = () => applyVtFilters(tbody, catSelect.value, resInput.value);
        catSelect.addEventListener('change', update);
        resInput.addEventListener('input', update);
        clearBtn.addEventListener('click', () => { catSelect.value = ''; resInput.value = ''; update(); });

        containerEl.appendChild(toolbar);
        return { catSelect, resInput, toolbar };
    }

    // Summary info table
    const infoWrapper = document.createElement('div');
    infoWrapper.className = 'metadata-table-wrapper';
    const infoTable = document.createElement('table');
    infoTable.className = 'metadata-table';
    const infoTbody = document.createElement('tbody');

    const addInfoRow = (label, value) => {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.textContent = label;
        const td = document.createElement('td');
        td.textContent = value || '-';
        tr.append(th, td);
        infoTbody.appendChild(tr);
    };

    if (attrs.status) addInfoRow('Status', attrs.status);
    if (attrs.date) addInfoRow('Date', new Date(attrs.date * 1000).toLocaleString());

    // Stats
    const stats = attrs.stats ?? attrs.last_analysis_stats;
    if (stats) {
        addInfoRow('Harmless', String(stats.harmless ?? 0));
        addInfoRow('Malicious', String(stats.malicious ?? 0));
        addInfoRow('Suspicious', String(stats.suspicious ?? 0));
        addInfoRow('Undetected', String(stats.undetected ?? 0));
        addInfoRow('Timeout', String(stats.timeout ?? 0));
    }

    infoTable.appendChild(infoTbody);
    infoWrapper.appendChild(infoTable);
    container.appendChild(infoWrapper);

    // Engine results table
    const results = attrs.results;
    if (results && typeof results === 'object') {
        const heading = document.createElement('h4');
        heading.className = 'vt-engine-heading';
        heading.textContent = 'Engine Results';
        container.appendChild(heading);

        const { wrapper, tbody } = createScanTable(['Engine', 'Category', 'Result']);

        // collect unique categories for the filter select
        const categoriesSet = new Set();

        for (const [engine, info] of Object.entries(results)) {
            const tr = document.createElement('tr');
            const engTd = document.createElement('td');
            engTd.textContent = engine;

            const categoryValue = String(info?.category ?? '-');
            const catTd = document.createElement('td');
            catTd.textContent = categoryValue;

            const resultText = String(info?.result ?? '');

            // Determine VT visual class: prefer category (canonical), fallback to result text
            let vtClass = 'vt-undetected';
            const catLower = categoryValue.toLowerCase();
            if (catLower === 'malicious') vtClass = 'vt-malicious';
            else if (catLower === 'suspicious') vtClass = 'vt-suspicious';
            else if (catLower === 'harmless') vtClass = 'vt-clean';
            else if (catLower === 'undetected') vtClass = 'vt-undetected';
            else {
                const rt = resultText.toLowerCase();
                if (rt === 'clean' || rt === 'harmless') vtClass = 'vt-clean';
                else if (rt === 'malicious') vtClass = 'vt-malicious';
                else if (rt === 'suspicious') vtClass = 'vt-suspicious';
                else if (rt === 'undetected') vtClass = 'vt-undetected';
            }

            const resTd = document.createElement('td');
            resTd.innerHTML = `<span class="${vtClass}">${escapeHtml(resultText || categoryValue || '-')}</span>`;

            // expose data attributes for filtering + searching
            tr.dataset.vtCategory = categoryValue;
            tr.dataset.vtResult = (resultText || '').toLowerCase();

            tr.append(engTd, catTd, resTd);
            tbody.appendChild(tr);

            categoriesSet.add(categoryValue);
        }

        // Add filter toolbar above the table
        createVtFilterToolbar(container, tbody, Array.from(categoriesSet).filter(Boolean));

        // Enable sortable headers for Category and Result (columns 1 and 2)
        const tableEl = wrapper.querySelector('table');
        const ths = Array.from(tableEl.querySelectorAll('th'));
        [1, 2].forEach((colIndex) => {
            const th = ths[colIndex];
            th.classList.add('sortable');
            th.addEventListener('click', () => {
                const current = th.dataset.sortDir === 'asc' ? 'asc' : (th.dataset.sortDir === 'desc' ? 'desc' : null);
                const newDir = current === 'asc' ? 'desc' : 'asc';
                // clear other headers
                ths.forEach((h) => { h.classList.remove('sort-asc', 'sort-desc'); delete h.dataset.sortDir; });
                th.classList.add(newDir === 'asc' ? 'sort-asc' : 'sort-desc');
                th.dataset.sortDir = newDir;
                sortTbodyRows(tbody, colIndex, newDir === 'asc');
            });
        });

        container.appendChild(wrapper);
    }
}

/**
 * Creates a label+value metadata field element (fallback, not primary display).
 * @param {string} label
 * @param {string} value
 * @returns {HTMLDivElement}
 */
function createMetaField(label, value) {
    const field = document.createElement('div');
    field.className = 'meta-field';
    const labelEl = document.createElement('span');
    labelEl.className = 'meta-label';
    labelEl.textContent = label;
    const valueEl = document.createElement('span');
    valueEl.className = 'meta-value';
    valueEl.textContent = value;
    field.append(labelEl, valueEl);
    return field;
}

/* ------------------------------------------------------------------ */
/*  Row Builders                                                       */
/* ------------------------------------------------------------------ */

/**
 * Builds a table row for the metadata URL security scan.
 * @param {string} url - Scanned URL
 * @param {Object} result - Scan result
 * @returns {HTMLTableRowElement}
 */
function buildUrlScanRow(url, result) {
    const row = document.createElement('tr');
    const info = getStatusInfo(result);

    const sCell = document.createElement('td');
    sCell.innerHTML = `<span class="status-badge ${info.cls}">${info.text}</span>`;

    const uCell = document.createElement('td');
    uCell.className = 'cell-url';
    uCell.textContent = url;
    uCell.title = url;

    const sumCell = document.createElement('td');
    // Place the VT "more details" control inline inside the RESULTS cell
    sumCell.innerHTML = result.scanned ? formatVtSummary(result) : (result.error || '-');
    if (result.rawAnalysis) {
        const btn = createMagnifyButton(result.rawAnalysis);
        btn.classList.add('vt-inline-btn');
        const vtWrap = document.createElement('span');
        vtWrap.className = 'vt-details';
        vtWrap.appendChild(document.createTextNode(' '));
        vtWrap.appendChild(btn);
        const vtLabel = document.createElement('span');
        vtLabel.className = 'vt-label';
        vtLabel.textContent = 'DETAIL';
        vtWrap.appendChild(vtLabel);
        sumCell.appendChild(vtWrap);
    }

    row.append(sCell, uCell, sumCell);
    return row;
}

/**
 * Builds a table row for a media URL security scan.
 * @param {Object} mediaObj - { url, field, type }
 * @param {Object} result - Scan result
 * @returns {HTMLTableRowElement}
 */
function buildMediaUrlScanRow(mediaObj, result) {
    const row = document.createElement('tr');
    const info = getStatusInfo(result);

    const sCell = document.createElement('td');
    sCell.innerHTML = `<span class="status-badge ${info.cls}">${info.text}</span>`;

    const fCell = document.createElement('td');
    fCell.className = 'cell-field';
    fCell.textContent = mediaObj.field;
    fCell.title = mediaObj.field;

    const uCell = document.createElement('td');
    uCell.className = 'cell-url';
    uCell.textContent = mediaObj.url;
    uCell.title = mediaObj.url;

    const sumCell = document.createElement('td');
    // Move the VT detail control into the RESULTS cell so it's adjacent to the summary
    sumCell.innerHTML = result.scanned ? formatVtSummary(result) : (result.error || '-');
    if (result.rawAnalysis) {
        const btn = createMagnifyButton(result.rawAnalysis);
        btn.classList.add('vt-inline-btn');
        const vtWrap = document.createElement('span');
        vtWrap.className = 'vt-details';
        vtWrap.appendChild(document.createTextNode(' '));
        vtWrap.appendChild(btn);
        const vtLabel = document.createElement('span');
        vtLabel.className = 'vt-label';
        vtLabel.textContent = 'DETAIL';
        vtWrap.appendChild(vtLabel);
        sumCell.appendChild(vtWrap);
    }

    row.append(sCell, fCell, uCell, sumCell);
    return row;
}

/**
 * Builds a table row for a media file scan (upload to VT).
 * @param {Object} mediaResult - Result from fetchMedia
 * @param {Object} fileResult - ScanResult from scanFile
 * @returns {HTMLTableRowElement}
 */
function buildFileScanRow(mediaResult, fileResult) {
    const row = document.createElement('tr');
    const info = getStatusInfo(fileResult);

    const sCell = document.createElement('td');
    sCell.innerHTML = `<span class="status-badge ${info.cls}">${info.text}</span>`;

    const typeCell = document.createElement('td');
    typeCell.textContent = mediaResult.mimeType || '-';

    const sizeCell = document.createElement('td');
    sizeCell.textContent = mediaResult.size ? formatBytes(mediaResult.size) : '-';

    const prevCell = document.createElement('td');
    prevCell.className = 'cell-media';
    if (mediaResult.objectUrl) {
        const thumb = document.createElement('img');
        thumb.src = mediaResult.objectUrl;
        thumb.alt = 'Media preview';
        thumb.className = 'media-thumb';
        thumb.addEventListener('click', () => showMediaPreviewModal(mediaResult.objectUrl, 'NFT Media'));
        prevCell.appendChild(thumb);
    } else {
        prevCell.textContent = '-';
    }

    const sumCell = document.createElement('td');
    // Put details button after the summary inside the RESULTS cell
    sumCell.innerHTML = fileResult.scanned ? formatVtSummary(fileResult) : (fileResult.error || '-');
    if (fileResult.rawAnalysis) {
        const btn = createMagnifyButton(fileResult.rawAnalysis);
        btn.classList.add('vt-inline-btn');
        const vtWrap = document.createElement('span');
        vtWrap.className = 'vt-details';
        vtWrap.appendChild(document.createTextNode(' '));
        vtWrap.appendChild(btn);
        const vtLabelEl = document.createElement('span');
        vtLabelEl.className = 'vt-label';
        vtLabelEl.textContent = 'DETAIL';
        vtWrap.appendChild(vtLabelEl);
        sumCell.appendChild(vtWrap);
    }

    row.append(sCell, typeCell, sizeCell, prevCell, sumCell);
    return row;
}

/* ------------------------------------------------------------------ */
/*  Scan Pipeline                                                      */
/* ------------------------------------------------------------------ */

/**
 * Handles the scan form submission.
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

    // Validate URL format before proceeding
    const validation = validateURL(rawUrl);
    if (!validation.valid) {
        setUrlError(validation.reason);
        urlInput?.focus();
        return;
    }

    if (!vtApiKey) {
        showApikeyRequiredModal();
        return;
    }

    setUrlError('');
    // Prepare abort controller for this scan so it can be cancelled (Back button)
    try { if (scanAbortController) scanAbortController.abort(); } catch (e) {}
    scanAbortController = new AbortController();
    setScanLoading(true);
    clearResults();
    navigateToResults();

    try {
        await runPipeline(rawUrl, scanAbortController.signal);
    } catch (err) {
        // Log full error (message + stack) to aid debugging during development
        logError('PipelineError', 'Unhandled error in scan pipeline', { error: err && err.message, stack: err && err.stack });
        // Show a user-friendly message in the UI
        try { showScanErrorModal(getUserMessage(err)); } catch (e) { /* ignore UI errors */ }
    } finally {
        setScanLoading(false);
        // cleanup controller after scan finishes
        scanAbortController = null;
    }
}

/**
 * Abort an in-progress scan if any, and clean up UI state.
 */
function abortScan() {
    if (scanAbortController) {
        try { scanAbortController.abort(); } catch (e) {}
        scanAbortController = null;
    }
    // Ensure UI reflects stopped state
    setScanLoading(false);
    // Provide light notification to user
    setUrlError('Scan cancelled');
}

/**
 * Back button behavior: stop running scan (if any) and navigate home.
 */
function handleBackClick() {
    if (isScanning) {
        abortScan();
    }
    navigateToHome();
}

/**
 * Runs the full sequential validation pipeline.
 * Each step renders a card; the next step only runs if the previous passed.
 * @param {string} rawUrl - User-entered URL (already validated)
 */
async function runPipeline(rawUrl, externalSignal = null) {
    const validation = validateURL(rawUrl); // Already validated, but get details
    const protocol = validation.protocol === 'ipfs' ? 'IPFS' : 'HTTPS';
    const resolvedUrl = validation.resolvedUrl;

    const scanStats = {
        totalUrlScans: 0,
        safeUrlScans: 0,
        unsafeUrlScans: 0,
        totalMediaUrlScans: 0,
        safeMediaUrlScans: 0,
        unsafeMediaUrlScans: 0,
        totalFileScans: 0,
        safeFileScans: 0,
        unsafeFileScans: 0
    };

    /* ---- Step 1: URL Security Scan (VirusTotal) ---- */
    const step1ProcessId = `vt-ui-${Math.random().toString(36).substring(2,10)}`;
    const step1 = createStepCard('URL Security Scan (VirusTotal)', step1ProcessId);
    // Attach meta so Retry knows how to re-run this step
    step1.meta = { type: 'url-scan', url: resolvedUrl, headers: ['Status', 'Scanned URL', 'RESULTS'], processId: step1ProcessId };
    const urlHeaders = step1.meta.headers;
    const { wrapper: uWrap, tbody: uTbody, vertical: uVertical } = createScanTable(urlHeaders, { vertical: true });
    // simple placeholder for vertical table
    const uPlaceholder = document.createElement('tr');
    const uPhTd = document.createElement('td');
    uPhTd.colSpan = 2;
    uPhTd.textContent = '-';
    uPlaceholder.appendChild(uPhTd);
    uTbody.appendChild(uPlaceholder);
    step1.body.appendChild(uWrap);

    const urlScan = await scanURL(resolvedUrl, vtApiKey, externalSignal, { processId: step1ProcessId });

    // remove placeholder rows
    try { uTbody.removeChild(uPlaceholder); } catch (e) {}

    // Build vertical label/value rows
    const info = getStatusInfo(urlScan);
    const statusEl = document.createElement('span');
    statusEl.className = `status-badge ${info.cls}`;
    statusEl.textContent = info.text;

    const urlEl = document.createElement('span');
    urlEl.className = 'cell-url';
    urlEl.textContent = resolvedUrl;
    urlEl.title = resolvedUrl;

    const sumEl = document.createElement('div');
    sumEl.innerHTML = urlScan.scanned ? formatVtSummary(urlScan) : (urlScan.error || '-');
    if (urlScan.rawAnalysis) {
        const btn = createMagnifyButton(urlScan.rawAnalysis);
        btn.classList.add('vt-inline-btn');
        const vtWrap = document.createElement('span');
        vtWrap.className = 'vt-details';
        vtWrap.appendChild(document.createTextNode(' '));
        vtWrap.appendChild(btn);
        const vtLabelEl = document.createElement('span');
        vtLabelEl.className = 'vt-label';
        vtLabelEl.textContent = 'DETAIL';
        vtWrap.appendChild(vtLabelEl);
        sumEl.appendChild(vtWrap);
    }

    const detailsEl = document.createElement('span');
    detailsEl.textContent = '-';

    populateVerticalRow(uTbody, urlHeaders, [statusEl, urlEl, sumEl]);

    // Fail-fast: stop if scan did not complete successfully
    if (urlScan.scanned !== true) {
        setStepStatus(step1, 'error');
        step1.body.insertAdjacentHTML(
            'beforeend',
            '<p class="step-msg step-msg-error">URL scan did not complete successfully. Scan stopped.</p>'
        );
        showScanErrorModal(urlScan.error || 'URL scan failed to complete. Please try again.');
        return;
    }

    if (urlScan.safe === false) {
        // mark non-retryable because the stop reason is a flagged/unsafe result
        step1.meta = step1.meta || {};
        step1.meta.retryable = false;
        setStepStatus(step1, 'error');
        step1.body.insertAdjacentHTML(
            'beforeend',
            '<p class="step-msg step-msg-error">The metadata URL was flagged as potentially unsafe. Scan stopped.</p>'
        );

        // Offer user choices when resource is flagged (Proceed / Home / Close)
        const userChoice = await showScanErrorModal('The metadata URL was flagged as potentially unsafe. The scan has been stopped.', { flagged: true });
        if (userChoice === 'proceed') {
            // User chose to proceed — update UI to reflect override and continue
            setStepStatus(step1, 'warning');
            step1.body.insertAdjacentHTML('beforeend', '<p class="step-msg step-msg-warning">Proceed selected — continuing despite flagged result.</p>');
            /* continue to next steps */
        } else if (userChoice === 'main') {
            navigateToHome();
            return;
        } else {
            // 'close' or timeout/default — stop pipeline
            return;
        }
    }
    setStepStatus(step1, urlScan.scanned ? 'success' : 'warning');

    scanStats.totalUrlScans++;
    if (urlScan.safe === false) {
        scanStats.unsafeUrlScans++;
    } else {
        scanStats.safeUrlScans++;
    }

    /* ---- Step 2: Fetch Metadata JSON ---- */
    const step2 = createStepCard('Fetching Metadata...', null, false);
    const fetchResult = await fetchMetadataJSON(resolvedUrl, externalSignal);

    if (!fetchResult.success) {
        setStepStatus(step2, 'error');
        step2.titleEl.textContent = 'Metadata Fetch Failed';
        step2.body.innerHTML = `<p class="step-msg step-msg-error">${escapeHtml(getUserMessage(fetchResult.error))}</p>`;
        showScanErrorModal(getUserMessage(fetchResult.error) || 'Failed to fetch metadata.');
        return;
    }

    setStepStatus(step2, 'success');
    step2.titleEl.textContent = 'Metadata Fetched Successfully';

    /* ---- Step 3: Metadata Parsing & Validation ---- */
    const step3 = createStepCard('Metadata Parsing & Validation', null, false);
    const parseResult = parseMetadata(fetchResult.text);

    if (!parseResult.valid) {
        setStepStatus(step3, 'error');
        step3.body.innerHTML = `<p class="step-msg step-msg-error">${escapeHtml(parseResult.reason)}</p>`;
        showScanErrorModal(parseResult.reason || 'Metadata parsing failed.');
        return;
    }

    const standardLabel = getStandardLabel(parseResult.standard);
    setStepStatus(step3, parseResult.warnings.length > 0 ? 'warning' : 'success');
    addStepBadge(step3, standardLabel, `badge-${parseResult.standard}`);

    if (parseResult.warnings.length > 0) {
        const warningsDiv = document.createElement('div');
        warningsDiv.className = 'step-warnings';
        parseResult.warnings.forEach((w) => {
            const p = document.createElement('p');
            p.textContent = `⚠ ${w}`;
            warningsDiv.appendChild(p);
        });
        step3.body.appendChild(warningsDiv);
    }

    /* ---- Step 4: Parsed Metadata + Collapsible Raw JSON ---- */
    const step4 = createStepCard('Parsed Metadata', null, false);
    setStepStatus(step4, 'success');

    renderParsedMetadata(step4.body, parseResult);

    const globalParsedMetadata = parseResult;

    // Collapsible raw JSON
    const rawDetails = document.createElement('details');
    rawDetails.className = 'raw-json-details';
    const rawSummary = document.createElement('summary');
    rawSummary.textContent = 'Raw JSON Metadata';
    rawDetails.appendChild(rawSummary);
    const rawPre = document.createElement('pre');
    rawPre.className = 'raw-json';
    const rawCode = document.createElement('code');
    rawCode.textContent = JSON.stringify(parseResult.raw, null, 2);
    rawPre.appendChild(rawCode);
    rawDetails.appendChild(rawPre);
    step4.body.appendChild(rawDetails);

    /* ---- Step 5: Media Scan Options ---- */
    const allUrls = extractAllUrls(parseResult.raw, parseResult.standard);

    if (allUrls.length === 0) {
        const stepEmpty = createStepCard('Media Security Scan', null, false);
        setStepStatus(stepEmpty, 'skipped');
        stepEmpty.body.innerHTML = '<p class="step-msg">No media URLs found in metadata.</p>';
        logInfo('Pipeline complete (no media)', { url: rawUrl });
        return;
    }

    const mainMediaUrl = parseResult.image;
    const fallbackUrl =
        (parseResult.raw.fallback_image && parseResult.raw.fallback_image !== mainMediaUrl)
            ? parseResult.raw.fallback_image
            : null;

    const step5 = createStepCard('Media Security Scan', null, false);
    setStepStatus(step5, 'pending');
    step5.iconWrap.innerHTML = STEP_ICONS.pending;

    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'media-scan-options';

    const optLabel = document.createElement('p');
    optLabel.className = 'options-label';
    optLabel.textContent = 'Choose which media to scan:';
    optionsDiv.appendChild(optLabel);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group';

    // Build choice buttons
    if (mainMediaUrl) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-secondary btn-sm';
        b.textContent = 'Main Media';
        btnGroup.appendChild(b);
    }
    if (fallbackUrl) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-secondary btn-sm';
        b.textContent = 'Fallback Image';
        btnGroup.appendChild(b);
    }
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'btn btn-secondary btn-sm';
    allBtn.textContent = 'Scan ALL';
    btnGroup.appendChild(allBtn);

    optionsDiv.appendChild(btnGroup);
    step5.body.appendChild(optionsDiv);

    // Attach buttons to DOM first, then wait for user click
    const scanChoice = await new Promise((resolve) => {
        btnGroup.querySelectorAll('button').forEach((btn) => {
            const text = btn.textContent;
            if (text === 'Main Media') btn.addEventListener('click', () => {
                btnGroup.querySelectorAll('button').forEach(b => b.className = 'btn btn-secondary btn-sm');
                btn.className = 'btn btn-primary btn-sm';
                resolve('main');
            });
            else if (text === 'Fallback Image') btn.addEventListener('click', () => {
                btnGroup.querySelectorAll('button').forEach(b => b.className = 'btn btn-secondary btn-sm');
                btn.className = 'btn btn-primary btn-sm';
                resolve('fallback');
            });
            else if (text === 'Scan ALL') btn.addEventListener('click', () => {
                btnGroup.querySelectorAll('button').forEach(b => b.className = 'btn btn-secondary btn-sm');
                btn.className = 'btn btn-primary btn-sm';
                resolve('all');
            });
        });
    });

    // Disable buttons after choice
    btnGroup.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    setStepStatus(step5, 'success');

    // Determine which URLs to scan — sorted: Main Media first, then Fallback, then rest
    let urlsToScan = [];
    if (scanChoice === 'main') {
        const match = allUrls.find((u) => u.url === mainMediaUrl);
        urlsToScan = match ? [match] : [{ url: mainMediaUrl, field: 'image', type: 'media' }];
    } else if (scanChoice === 'fallback') {
        const match = allUrls.find((u) => u.field === 'fallback_image');
        urlsToScan = match ? [match] : [{ url: fallbackUrl, field: 'fallback_image', type: 'media' }];
    } else {
        // "all" — sort: main media first, fallback second, rest after
        const mainMatch = allUrls.find((u) => u.url === mainMediaUrl);
        const fbMatch = fallbackUrl ? allUrls.find((u) => u.field === 'fallback_image') : null;
        const rest = allUrls.filter((u) => u !== mainMatch && u !== fbMatch);
        urlsToScan = [mainMatch, fbMatch, ...rest].filter(Boolean);
    }

    /* ---- Steps 7+8: Scan media URLs one-by-one, then upload files ---- */
    for (const mediaObj of urlsToScan) {
        // Validate/normalize the media URL (convert ipfs:// -> HTTP gateway) before scanning
        const mediaValidation = validateURL(mediaObj.url);
        const resolvedMediaUrl = mediaValidation.valid ? mediaValidation.resolvedUrl : mediaObj.url;

        // 7a: URL Scan for this media
        const mediaProcessId = `vt-ui-${Math.random().toString(36).substring(2,10)}`;
        const mediaStep = createStepCard(`URL Scan: ${mediaObj.field.replace('.url', '')}`, mediaProcessId);
        // meta for retry (store resolved URL so retry submits the same value VT saw)
        mediaStep.meta = { type: 'media-url-scan', url: resolvedMediaUrl, originalUrl: mediaObj.url, field: mediaObj.field, headers: ['Status', 'Field', 'Scanned URL', 'RESULTS'], processId: mediaProcessId };
        const mHeaders = mediaStep.meta.headers;
        const { wrapper: mWrap, tbody: mTbody, vertical: mVertical } = createScanTable(mHeaders, { vertical: true });
        const mPlaceholder = document.createElement('tr');
        const mPhTd = document.createElement('td');
        mPhTd.colSpan = 2;
        mPhTd.textContent = '-';
        mPlaceholder.appendChild(mPhTd);
        mTbody.appendChild(mPlaceholder);
        mediaStep.body.appendChild(mWrap);

        // If validation failed, show error and skip this media entry
        if (!mediaValidation.valid) {
            try { mTbody.removeChild(mPlaceholder); } catch (e) {}
            const failRow = document.createElement('tr');
            const failCell = document.createElement('td');
            failCell.colSpan = 6;
            failCell.className = 'step-msg step-msg-error';
            failCell.textContent = `Invalid media URL: ${mediaValidation.reason}`;
            failRow.appendChild(failCell);
            mTbody.appendChild(failRow);
            setStepStatus(mediaStep, 'error');
            continue; // move to next media
        }

        const mResult = await scanURL(resolvedMediaUrl, vtApiKey, externalSignal, { processId: mediaProcessId });

        try { mTbody.removeChild(mPlaceholder); } catch (e) {}

        const mInfo = getStatusInfo(mResult);
        const mStatusEl = document.createElement('span');
        mStatusEl.className = `status-badge ${mInfo.cls}`;
        mStatusEl.textContent = mInfo.text;

        const fEl = document.createElement('span');
        fEl.className = 'cell-field';
        fEl.textContent = mediaObj.field;
        fEl.title = mediaObj.field;

        const mUrlEl = document.createElement('span');
        mUrlEl.className = 'cell-url';
        mUrlEl.textContent = resolvedMediaUrl;
        mUrlEl.title = resolvedMediaUrl;

        const mSumEl = document.createElement('div');
        mSumEl.innerHTML = mResult.scanned ? formatVtSummary(mResult) : (mResult.error || '-');
        if (mResult.rawAnalysis) {
            const btn = createMagnifyButton(mResult.rawAnalysis);
            btn.classList.add('vt-inline-btn');
            const vtWrap = document.createElement('span');
            vtWrap.className = 'vt-details';
            vtWrap.appendChild(document.createTextNode(' '));
            vtWrap.appendChild(btn);
            const vtLabelEl = document.createElement('span');
            vtLabelEl.className = 'vt-label';
            vtLabelEl.textContent = 'DETAIL';
            vtWrap.appendChild(vtLabelEl);
            mSumEl.appendChild(vtWrap);
        }

        const mDetailsEl = document.createElement('span');
        mDetailsEl.textContent = '-';

        populateVerticalRow(mTbody, mHeaders, [mStatusEl, fEl, mUrlEl, mSumEl]);

        // Fail-fast: stop if scan did not complete successfully
        if (mResult.scanned !== true) {
            setStepStatus(mediaStep, 'error');
            showScanErrorModal(mResult.error || 'Media URL scan failed to complete. The scan has been stopped.');
            return;
        }

        if (mResult.safe === false) {
            // mark non-retryable because the resource was flagged unsafe
            mediaStep.meta = mediaStep.meta || {};
            mediaStep.meta.retryable = false;
            setStepStatus(mediaStep, 'error');
            // Prompt user with flagged modal and await decision
            const mediaChoice = await showScanErrorModal('A media URL was flagged as potentially unsafe. The scan has been stopped.', { flagged: true });
            if (mediaChoice === 'proceed') {
                // User chose to proceed — mark warning and continue
                setStepStatus(mediaStep, 'warning');
                mediaStep.body.insertAdjacentHTML('beforeend', '<p class="step-msg step-msg-warning">Proceed selected — continuing despite flagged result.</p>');
            } else if (mediaChoice === 'main') {
                navigateToHome();
                return;
            } else {
                return;
            }
        }
        setStepStatus(mediaStep, mResult.scanned ? 'success' : 'warning');

        scanStats.totalMediaUrlScans++;
        if (mResult.safe === false) {
            scanStats.unsafeMediaUrlScans++;
        } else {
            scanStats.safeMediaUrlScans++;
        }

        // 7b: File Scan — download media and upload to VT /files endpoint
        if (mediaObj.type === 'media' && mResult.safe !== false) {
            const fileProcessId = `vt-ui-${Math.random().toString(36).substring(2,10)}`;
            const fileStep = createStepCard(`File Scan: ${mediaObj.field.replace('.url', '')}`, fileProcessId);
            const fHeaders = ['Status', 'Type', 'Size', 'Media Preview', 'VirusTotal Results'];
            const { wrapper: fWrap, tbody: fTbody, vertical: fVertical } = createScanTable(fHeaders, { vertical: true });
            const fPlaceholder = document.createElement('tr');
            const fPhTd = document.createElement('td');
            fPhTd.colSpan = 2;
            fPhTd.textContent = '-';
            fPlaceholder.appendChild(fPhTd);
            fTbody.appendChild(fPlaceholder);
            fileStep.body.appendChild(fWrap);

            // Fetch the media file
            const mediaFetchResult = await fetchMedia(mediaObj.url, externalSignal);

            if (!mediaFetchResult.success) {
                fTbody.removeChild(fPlaceholder);
                const failRow = document.createElement('tr');
                const failCell = document.createElement('td');
                failCell.colSpan = 6;
                failCell.className = 'step-msg step-msg-error';
                failCell.textContent = mediaFetchResult.error;
                failRow.appendChild(failCell);
                fTbody.appendChild(failRow);
                setStepStatus(fileStep, 'error');
                showScanErrorModal(mediaFetchResult.error || 'Failed to fetch media file.');
                return;
            }

            // Preserve metadata for potential Retry, then upload blob to VirusTotal /files endpoint
            fileStep.meta = {
                type: 'media-file-scan',
                url: resolvedMediaUrl,
                originalUrl: mediaObj.url,
                field: mediaObj.field,
                headers: fHeaders,
                processId: fileProcessId,
                blob: mediaFetchResult.blob,
                filename: `media_${mediaObj.field}`,
                mimeType: mediaFetchResult.mimeType,
                size: mediaFetchResult.size,
                objectUrl: mediaFetchResult.objectUrl
            };

            const fileResult = await scanFile(mediaFetchResult.blob, `media_${mediaObj.field}`, vtApiKey, externalSignal, { processId: fileProcessId });

            try { fTbody.removeChild(fPlaceholder); } catch (e) {}

            const fInfo = getStatusInfo(fileResult);
            const fStatusEl = document.createElement('span');
            fStatusEl.className = `status-badge ${fInfo.cls}`;
            fStatusEl.textContent = fInfo.text;

            const typeEl = document.createElement('span');
            typeEl.textContent = mediaFetchResult.mimeType || '-';

            const sizeEl = document.createElement('span');
            sizeEl.textContent = mediaFetchResult.size ? formatBytes(mediaFetchResult.size) : '-';

            const prevEl = document.createElement('div');
            prevEl.className = 'cell-media';
            if (mediaFetchResult.objectUrl) {
                const thumb = document.createElement('img');
                thumb.src = mediaFetchResult.objectUrl;
                thumb.alt = 'Media preview';
                thumb.className = 'media-thumb';
                thumb.addEventListener('click', () => showMediaPreviewModal(mediaFetchResult.objectUrl, 'NFT Media'));
                prevEl.appendChild(thumb);
            } else {
                prevEl.textContent = '-';
            }

            const fSumEl = document.createElement('div');
            fSumEl.innerHTML = fileResult.scanned ? formatVtSummary(fileResult) : (fileResult.error || '-');
            if (fileResult.rawAnalysis) {
                const btn = createMagnifyButton(fileResult.rawAnalysis);
                btn.classList.add('vt-inline-btn');
                const vtWrap = document.createElement('span');
                vtWrap.className = 'vt-details';
                vtWrap.appendChild(document.createTextNode(' '));
                vtWrap.appendChild(btn);
                const vtLabel = document.createElement('span');
                vtLabel.className = 'vt-label';
                vtLabel.textContent = 'DETAIL';
                vtWrap.appendChild(vtLabel);
                fSumEl.appendChild(vtWrap);
            }

            const fDetailsEl = document.createElement('span');
            fDetailsEl.textContent = '-';

            populateVerticalRow(fTbody, fHeaders, [fStatusEl, typeEl, sizeEl, prevEl, fSumEl]);

            // Fail-fast: stop if file scan did not complete successfully
            if (fileResult.scanned !== true) {
                setStepStatus(fileStep, 'error');
                showScanErrorModal(fileResult.error || 'Media file scan failed to complete. The scan has been stopped.');
                return;
            }

            if (fileResult.safe === false) {
                // mark non-retryable because the file was flagged unsafe
                fileStep.meta = fileStep.meta || {};
                fileStep.meta.retryable = false;
                setStepStatus(fileStep, 'error');
                const fileChoice = await showScanErrorModal('A media file was flagged as potentially unsafe. The scan has been stopped.', { flagged: true });
                if (fileChoice === 'proceed') {
                    // User chose to proceed — mark warning and continue
                    setStepStatus(fileStep, 'warning');
                    fileStep.body.insertAdjacentHTML('beforeend', '<p class="step-msg step-msg-warning">Proceed selected — continuing despite flagged result.</p>');
                } else if (fileChoice === 'main') {
                    navigateToHome();
                    return;
                } else {
                    return;
                }
            } else if (fileResult.scanned) {
                setStepStatus(fileStep, 'success');
            } else {
                setStepStatus(fileStep, 'warning');
            }

            scanStats.totalFileScans++;
            if (fileResult.safe === false) {
                scanStats.unsafeFileScans++;
            } else {
                scanStats.safeFileScans++;
            }
        }
    }

    /* ---- Summary ---- */
    const summaryCard = createStepCard('Scan Summary', null, false);
    setStepStatus(summaryCard, 'success');
    summaryCard.body.innerHTML = '<p>Scan of this metadata has been completed successfully!</p>';

    const summaryTable = document.createElement('table');
    // compact summary table — narrower columns so it fits inside the card
    summaryTable.className = 'scan-table scan-summary-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Scan Type</th><th>Total</th><th>Safe</th><th>Unsafe</th></tr>';
    summaryTable.appendChild(thead);
    const tbody = document.createElement('tbody');

    const addRow = (type, total, safe, unsafe) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${type}</td><td>${total}</td><td>${safe}</td><td>${unsafe}</td>`;
        tbody.appendChild(tr);
    };

    addRow('Metadata URL', scanStats.totalUrlScans, scanStats.safeUrlScans, scanStats.unsafeUrlScans);
    addRow('Media URLs', scanStats.totalMediaUrlScans, scanStats.safeMediaUrlScans, scanStats.unsafeMediaUrlScans);
    addRow('Media Files', scanStats.totalFileScans, scanStats.safeFileScans, scanStats.unsafeFileScans);

    summaryTable.appendChild(tbody);
    summaryCard.body.appendChild(summaryTable);
    // Append summary to the same `resultsContainer` as other step cards so
    // it shares the same width and layout constraints.
    if (resultsContainer) {
        resultsContainer.appendChild(summaryCard.card);
        // Add a small spacer so the final card doesn't butt up against the footer
        const spacer = document.createElement('div');
        spacer.className = 'results-footer-spacer';
        resultsContainer.appendChild(spacer);
    } else if (typeof siteMain !== 'undefined' && siteMain) {
        // Fallback: if results container is missing, append to siteMain
        siteMain.appendChild(summaryCard.card);
    }

    logInfo('Pipeline complete', { url: rawUrl, standard: parseResult.standard });
}
