/**
 * @module main
 * @description Application entry point. Wires up event listeners,
 * orchestrates the validation pipeline, and manages global state.
 */

import { validateURL } from './validators/url-validator.js';
import { parseMetadata, extractAllUrls, getStandardLabel } from './validators/metadata-parser.js';
import { scanURL, scanMultipleUrls } from './validators/security-scanner.js';
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

/** @type {string} In-memory VirusTotal API key (loaded from localStorage) */
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
const aboutModal = document.getElementById('about-modal');
const aboutCloseBtn = document.getElementById('about-close-btn');
const aboutOkBtn = document.getElementById('about-ok-btn');
const aboutModalContent = document.getElementById('about-modal-content');
// API key / quota elements (inline)
const apikeyInput = document.getElementById('apikey-input');
const apikeyActionBtn = document.getElementById('apikey-action-btn');
const apikeyQuotaBtn = document.getElementById('apikey-quota-btn');
const apikeyQuotaModal = document.getElementById('apikey-quota-modal');
const apikeyQuotaCloseBtn = document.getElementById('apikey-quota-close-btn');
const apikeyQuotaCloseFooter = document.getElementById('apikey-quota-close-footer');
const apikeyQuotaTable = document.getElementById('apikey-quota-table');

// Generic modals (API key required, remove confirmation)
const apikeyRequiredModal = document.getElementById('apikey-required-modal');
const apikeyRequiredOkBtn = document.getElementById('apikey-required-ok-btn');
const apikeyRequiredCloseBtn = document.getElementById('apikey-required-close-btn');
const removeConfirmModal = document.getElementById('remove-confirm-modal');
const removeConfirmYesBtn = document.getElementById('remove-confirm-yes-btn');
const removeConfirmNoBtn = document.getElementById('remove-confirm-no-btn');
const removeConfirmCloseBtn = document.getElementById('remove-confirm-close-btn');

// Page navigation elements
const inputSection = document.querySelector('.input-section');
const pipelineSection = document.getElementById('pipeline-section');
const resultsSection = document.getElementById('results-section');
const backButtonContainer = document.getElementById('back-button-container');
const backBtn = document.getElementById('back-btn');

// Store original quota button content so we can restore after spinner
const apikeyQuotaBtnOrig = apikeyQuotaBtn ? apikeyQuotaBtn.innerHTML : 'Show Quota';

/** Toggle quota button loading state (spinner + label) */
function setQuotaButtonLoading(loading) {
    if (!apikeyQuotaBtn) return;
    if (loading) {
        apikeyQuotaBtn.disabled = true;
        apikeyQuotaBtn.innerHTML = `<span class="spinner" aria-hidden="true"></span> Fetching...`;
    } else {
        apikeyQuotaBtn.disabled = false;
        apikeyQuotaBtn.innerHTML = apikeyQuotaBtnOrig;
    }
}
const scanAllUrlsToggle = document.getElementById('scan-all-urls');

/* ------------------------------------------------------------------ */
/*  Routing (Hash-based navigation)                                   */
/* ------------------------------------------------------------------ */

/**
 * Initializes the hash-based router.
 * Handles navigation between home and results pages.
 */
function initRouter() {
    // Listen for hash changes (browser back/forward)
    window.addEventListener('hashchange', handleRoute);
    // Handle initial route
    handleRoute();
}

/**
 * Handles route changes based on window.location.hash.
 * Shows/hides sections to create multi-page experience.
 */
function handleRoute() {
    const hash = window.location.hash || '#home';
    
    if (hash === '#results') {
        // Show results page (pipeline + results sections)
        showResultsPage();
    } else {
        // Show home page (input section)
        showHomePage();
    }
}

/**
 * Shows the home page - input form and API key section.
 */
function showHomePage() {
    if (inputSection) inputSection.hidden = false;
    if (backButtonContainer) backButtonContainer.hidden = true;
    if (pipelineSection) pipelineSection.hidden = true;
    if (resultsSection) resultsSection.hidden = true;
}

/**
 * Shows the results page - pipeline and results sections.
 * Note: Pipeline is always shown, results section visibility is controlled separately.
 */
function showResultsPage() {
    if (inputSection) inputSection.hidden = true;
    if (backButtonContainer) backButtonContainer.hidden = false;
    if (pipelineSection) pipelineSection.hidden = false;
    // Don't automatically show results section - let the pipeline control it
}

/**
 * Navigates to the results page.
 */
function navigateToResults() {
    window.location.hash = '#results';
}

/**
 * Navigates to the home page.
 */
function navigateToHome() {
    window.location.hash = '#home';
}

/* ------------------------------------------------------------------ */
/*  Initialization                                                     */
/* ------------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', () => {
    initStatusDisplay();
    loadApiKey();
    bindEvents();
    // Ensure modals are hidden on load
    aboutModal?.setAttribute('hidden', '');
    apikeyQuotaModal?.setAttribute('hidden', '');
    // Initialize routing
    initRouter();
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

    // About modal
    aboutBtn?.addEventListener('click', showAboutModal);
    aboutCloseBtn?.addEventListener('click', hideAboutModal);
    aboutOkBtn?.addEventListener('click', hideAboutModal);
    aboutModal?.addEventListener('click', handleModalBackdropClick);
    aboutModalContent?.addEventListener('click', (event) => event.stopPropagation());

    // API key inline controls (single action button toggles between Save/Remove)
    apikeyActionBtn?.addEventListener('click', handleApiKeyAction);
    apikeyQuotaBtn?.addEventListener('click', handleQuotaButtonClick);
    apikeyQuotaCloseBtn?.addEventListener('click', hideQuotaModal);
    apikeyQuotaCloseFooter?.addEventListener('click', hideQuotaModal);
    apikeyQuotaModal?.addEventListener('click', (event) => {
        if (event.target === apikeyQuotaModal) hideQuotaModal();
    });

    // API key required modal
    apikeyRequiredOkBtn?.addEventListener('click', hideApikeyRequiredModal);
    apikeyRequiredCloseBtn?.addEventListener('click', hideApikeyRequiredModal);
    apikeyRequiredModal?.addEventListener('click', (event) => {
        if (event.target === apikeyRequiredModal) hideApikeyRequiredModal();
    });

    // Remove confirmation modal
    removeConfirmYesBtn?.addEventListener('click', confirmApiKeyRemove);
    removeConfirmNoBtn?.addEventListener('click', hideRemoveConfirmModal);
    removeConfirmCloseBtn?.addEventListener('click', hideRemoveConfirmModal);
    removeConfirmModal?.addEventListener('click', (event) => {
        if (event.target === removeConfirmModal) hideRemoveConfirmModal();
    });

    // Keyboard events
    document.addEventListener('keydown', handleKeyDown);

    // Back button (navigation)
    backBtn?.addEventListener('click', navigateToHome);

    // Clear error on input change
    urlInput?.addEventListener('input', () => setUrlError(''));
}

/* ------------------------------------------------------------------ */
/*  About Modal                                                       */
/* ------------------------------------------------------------------ */

/** Shows the about modal. */
function showAboutModal() {
    if (!aboutModal || !aboutBtn) return;
    aboutModal.hidden = false;
    aboutModal.setAttribute('aria-hidden', 'false');
    aboutBtn.setAttribute('aria-expanded', 'true');
    // Focus the close button for accessibility
    aboutCloseBtn?.focus();
}

/** Hides the about modal. */
function hideAboutModal() {
    if (!aboutModal || !aboutBtn) return;
    aboutModal.hidden = true;
    aboutModal.setAttribute('aria-hidden', 'true');
    aboutBtn.setAttribute('aria-expanded', 'false');
    // Return focus to the about button
    aboutBtn?.focus();
}

/** Handles clicks on the modal backdrop. */
function handleModalBackdropClick(event) {
    if (event.target === aboutModal) {
        hideAboutModal();
    } else if (event.target === apikeyQuotaModal) {
        hideQuotaModal();
    }
}

/** Handles keyboard events for modals. */
function handleKeyDown(event) {
    if (event.key === 'Escape') {
        if (aboutModal && !aboutModal.hidden) {
            hideAboutModal();
        } else if (apikeyQuotaModal && !apikeyQuotaModal.hidden) {
            hideQuotaModal();
        } else if (apikeyRequiredModal && !apikeyRequiredModal.hidden) {
            hideApikeyRequiredModal();
        } else if (removeConfirmModal && !removeConfirmModal.hidden) {
            hideRemoveConfirmModal();
        }
    }
}

/* ------------------------------------------------------------------ */
/*  API Key Required Modal                                             */
/* ------------------------------------------------------------------ */

/** Shows the "API key required" modal. */
function showApikeyRequiredModal() {
    if (!apikeyRequiredModal) return;
    apikeyRequiredModal.hidden = false;
    apikeyRequiredModal.setAttribute('aria-hidden', 'false');
    apikeyRequiredOkBtn?.focus();
}

/** Hides the "API key required" modal. */
function hideApikeyRequiredModal() {
    if (!apikeyRequiredModal) return;
    apikeyRequiredModal.hidden = true;
    apikeyRequiredModal.setAttribute('aria-hidden', 'true');
    apikeyInput?.focus();
}

/* ------------------------------------------------------------------ */
/*  Remove Confirmation Modal                                          */
/* ------------------------------------------------------------------ */

/** Shows the removal confirmation modal. */
function showRemoveConfirmModal() {
    if (!removeConfirmModal) return;
    removeConfirmModal.hidden = false;
    removeConfirmModal.setAttribute('aria-hidden', 'false');
    removeConfirmNoBtn?.focus();
}

/** Hides the removal confirmation modal. */
function hideRemoveConfirmModal() {
    if (!removeConfirmModal) return;
    removeConfirmModal.hidden = true;
    removeConfirmModal.setAttribute('aria-hidden', 'true');
    apikeyActionBtn?.focus();
}

/** Executes API key removal after user confirmation. */
function confirmApiKeyRemove() {
    hideRemoveConfirmModal();
    try {
        localStorage.removeItem('nft-scanner-vt-api-key');
        vtApiKey = '';
        sessionStorage.removeItem('nft-scanner-vt-quota');
        if (apikeyQuotaBtn) {
            apikeyQuotaBtn.hidden = false;
            apikeyQuotaBtn.disabled = true;
        }
        updateApiKeyUI();
        logInfo('API key removed from localStorage');
    } catch (error) {
        logError('Failed to remove API key from localStorage', error);
    }
}

/* ------------------------------------------------------------------ */
/*  API Key Modal                                                     */
/* ------------------------------------------------------------------ */

/** Shows the quota modal. */
function showQuotaModal() {
    if (!apikeyQuotaModal || !apikeyQuotaBtn) return;
    apikeyQuotaModal.hidden = false;
    apikeyQuotaModal.setAttribute('aria-hidden', 'false');
    apikeyQuotaBtn.setAttribute('aria-expanded', 'true');
    // focus close button
    apikeyQuotaCloseBtn?.focus();
}

/** Hides the quota modal. */
function hideQuotaModal() {
    if (!apikeyQuotaModal || !apikeyQuotaBtn) return;
    apikeyQuotaModal.hidden = true;
    apikeyQuotaModal.setAttribute('aria-hidden', 'true');
    apikeyQuotaBtn?.focus();
}

/** Updates the API key UI based on current state. */
function updateApiKeyUI() {
    if (!apikeyActionBtn || !apikeyQuotaBtn) return;

    const cached = sessionStorage.getItem('nft-scanner-vt-quota');

    if (vtApiKey) {
        // Show saved state: mask API key inside input and make it read-only
        if (apikeyInput) {
            apikeyInput.value = '\u2713 ' + '\u2022'.repeat(Math.min(16, vtApiKey.length));
            apikeyInput.readOnly = true;
            apikeyInput.classList.add('input-success');
        }

        // Action button becomes Remove (red)
        apikeyActionBtn.hidden = false;
        apikeyActionBtn.disabled = false;
        apikeyActionBtn.textContent = 'Remove';
        apikeyActionBtn.className = 'btn btn-danger btn-sm api-key-action';

        // Show quota button only if we have cached quota
        if (cached) {
            apikeyQuotaBtn.hidden = false;
            apikeyQuotaBtn.disabled = false;
        } else {
            apikeyQuotaBtn.hidden = true;
            apikeyQuotaBtn.disabled = true;
        }

        if (scanBtn) scanBtn.disabled = false;
    } else {
        // No key saved: input editable, action button is Save (green), Show Quota disabled
        if (apikeyInput) {
            apikeyInput.value = '';
            apikeyInput.readOnly = false;
            apikeyInput.classList.remove('input-success');
        }

        apikeyActionBtn.hidden = false;
        apikeyActionBtn.disabled = false;
        apikeyActionBtn.textContent = 'Save';
        apikeyActionBtn.className = 'btn btn-success btn-sm api-key-action';

        apikeyQuotaBtn.hidden = false;
        apikeyQuotaBtn.disabled = true;

        if (scanBtn) scanBtn.disabled = true;
    }
}

/** Loads API key from localStorage. */
function loadApiKey() {
    try {
        const stored = localStorage.getItem('nft-scanner-vt-api-key');
        if (stored) {
            vtApiKey = stored;
            console.log('[API Key] Loaded from localStorage');
            logInfo('API key loaded from localStorage');
        } else {
            console.log('[API Key] No API key found in localStorage');
        }
    } catch (error) {
        console.error('[API Key] Failed to load from localStorage:', error);
        logError('Failed to load API key from localStorage', error);
    }
    updateApiKeyUI();

    // If we have a stored key, try to fetch quota in background to enable quota button
    if (vtApiKey) {
        // Fetch quota on load and show loading state on quota button
        setQuotaButtonLoading(true);
        fetchUserQuota(vtApiKey).then((quota) => {
            if (quota) {
                sessionStorage.setItem('nft-scanner-vt-quota', JSON.stringify(quota));
                if (apikeyQuotaBtn) {
                    apikeyQuotaBtn.hidden = false;
                    apikeyQuotaBtn.disabled = false;
                }
            }
        }).catch(() => {
            // ignore failures silently
        }).finally(() => {
            setQuotaButtonLoading(false);
        });
    }
}

/* ------------------------------------------------------------------ */
/*  API Key                                                            */
/* ------------------------------------------------------------------ */

/** Saves the API key to localStorage and in-memory variable. */
async function handleApiKeySave() {
    if (!apikeyInput) return;
    const key = apikeyInput.value.trim();
    if (!key) return;

    try {
        localStorage.setItem('nft-scanner-vt-api-key', key);
        vtApiKey = key;
        updateApiKeyUI();
        logInfo('API key saved to localStorage');

        // After saving, immediately fetch the user's quota and show spinner
        setQuotaButtonLoading(true);
        try {
            const quotas = await fetchUserQuota(key);
            if (quotas) {
                sessionStorage.setItem('nft-scanner-vt-quota', JSON.stringify(quotas));
                if (apikeyQuotaBtn) {
                    apikeyQuotaBtn.hidden = false;
                    apikeyQuotaBtn.disabled = false;
                }
            }
        } catch (err) {
            console.warn('[API Key] Failed to fetch quota:', err && err.message ? err.message : err);
        } finally {
            setQuotaButtonLoading(false);
        }
    } catch (error) {
        logError('Failed to save API key to localStorage', error);
    }
}

/** Single action handler that toggles between Save and Remove based on state. */
async function handleApiKeyAction(event) {
    if (vtApiKey) {
        // If key exists, action means remove
        handleApiKeyRemove();
    } else {
        // Otherwise save
        await handleApiKeySave();
    }
}

/** Opens the removal confirmation modal instead of using browser confirm(). */
function handleApiKeyRemove() {
    showRemoveConfirmModal();
}

/**
 * Fetches the user's VirusTotal quota by calling the user endpoint.
 * Attempts to parse and return the `quotas` object from the response.
 * @param {string} apiKey
 * @returns {Promise<Object|null>} quotas or null on failure
 */
async function fetchUserQuota(apiKey) {
    if (!apiKey) return null;

    try {
        // Use the API key as the identifier in the users endpoint per app behavior.
        const endpoint = `https://www.virustotal.com/api/v3/users/${encodeURIComponent(apiKey)}`;

        const resp = await fetch(endpoint, {
            method: 'GET',
            headers: { 'x-apikey': apiKey, 'Accept': 'application/json' },
            signal: AbortSignal.timeout(10_000),
        });

        if (!resp.ok) {
            console.warn('[VirusTotal] Failed to fetch user info:', resp.status);
            return null;
        }

        const data = await resp.json();
        const quotas = data?.data?.attributes?.quotas ?? null;
        return quotas;
    } catch (error) {
        console.error('[VirusTotal] Error fetching user quota:', error);
        return null;
    }
}

/**
 * Renders the quota object into the quota modal table and shows the modal.
 */
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
            private_urlscans_per_minute: 'Private URL Scans (Per Minute)'
        };
        if (map[k]) return map[k];
        // Fallback: convert snake_case to Title Case
        return k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    };

    Object.keys(quotas).forEach((key) => {
        const q = quotas[key];
        const allowed = (q && typeof q.allowed === 'number') ? q.allowed.toLocaleString() : (q?.allowed ?? '-');
        const used = (q && typeof q.used === 'number') ? q.used.toLocaleString() : (q?.used ?? '-');

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${humanize(key)}</td>
            <td>${allowed}</td>
            <td>${used}</td>
        `;
        tbody.appendChild(row);
    });

    showQuotaModal();
}

/**
 * Handler for the quota button. Shows cached quota or fetches if not present.
 */
async function handleQuotaButtonClick() {
    if (!apikeyQuotaBtn) return;

    const raw = sessionStorage.getItem('nft-scanner-vt-quota');
    if (raw) {
        // Already cached - show directly without fetching
        renderQuotaAndShow();
        return;
    }

    // Not cached - fetch with spinner
    const origHtml = apikeyQuotaBtn.innerHTML;
    apikeyQuotaBtn.disabled = true;
    apikeyQuotaBtn.innerHTML = `<span class="spinner" aria-hidden="true"></span> Fetching...`;

    if (!vtApiKey) {
        alert('No VirusTotal API key available to fetch quota.');
        apikeyQuotaBtn.disabled = false;
        apikeyQuotaBtn.innerHTML = origHtml;
        return;
    }

    try {
        const quotas = await fetchUserQuota(vtApiKey);
        if (!quotas) throw new Error('Could not fetch quota');
        sessionStorage.setItem('nft-scanner-vt-quota', JSON.stringify(quotas));
        renderQuotaAndShow();
    } catch (err) {
        console.error('[Quota] Failed to fetch or render quota:', err);
        alert('Failed to fetch quota from VirusTotal. See console for details.');
    } finally {
        apikeyQuotaBtn.disabled = false;
        apikeyQuotaBtn.innerHTML = origHtml;
    }
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

    // Check for API key — show modal if missing
    if (!vtApiKey) {
        showApikeyRequiredModal();
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

    // Navigate to results page
    navigateToResults();

    try {
        await runPipeline(rawUrl);
    } catch (err) {
        logError('PipelineError', 'Unhandled error in scan pipeline', { error: err.message });
    } finally {
        setScanLoading(false);
    }
}

/**
 * Updates a pipeline step's label text.
 * @param {string} stepName - The data-step attribute value
 * @param {string} newLabel - New label text
 */
function updateStepLabel(stepName, newLabel) {
    const step = document.querySelector(`[data-step="${stepName}"]`);
    if (step) {
        const label = step.querySelector('.step-label');
        if (label) {
            label.textContent = newLabel;
        }
    }
}

/**
 * Updates a pipeline step to show expandable scan results for multiple URLs.
 * @param {string} stepId - Pipeline step ID
 * @param {Array<{url: string, field: string, type: string, result: ScanResult}>} scanResults - Scan results
 * @param {boolean} isComplete - Whether scanning is complete
 */
function updateExpandableScanStep(stepId, scanResults, isComplete = true) {
    const stepElement = document.querySelector(`[data-step="${stepId}"]`);
    if (!stepElement) return;

    // Create details element for expandable results
    const details = document.createElement('details');
    details.className = 'scan-results-details';

    const summary = document.createElement('summary');
    summary.className = 'scan-results-summary';

    const completedCount = scanResults.filter(r => r.result && r.result.scanned !== undefined).length;
    const totalCount = scanResults.length;

    if (isComplete) {
        const safeCount = scanResults.filter(r => r.result.safe === true).length;
        const unsafeCount = scanResults.filter(r => r.result.safe === false).length;
        const skippedCount = scanResults.filter(r => r.result.skipped).length;
        summary.textContent = `Scanned ${totalCount} URL${totalCount !== 1 ? 's' : ''} (${safeCount} safe, ${unsafeCount} unsafe, ${skippedCount} skipped)`;
    } else {
        summary.textContent = `Scanning URLs... (${completedCount}/${totalCount})`;
        // Add a progress bar
        const progressBar = document.createElement('div');
        progressBar.className = 'scan-progress-bar';
        const progressFill = document.createElement('div');
        progressFill.className = 'scan-progress-fill';
        progressFill.style.width = `${(completedCount / totalCount) * 100}%`;
        progressBar.appendChild(progressFill);
        summary.appendChild(progressBar);
    }

    details.appendChild(summary);

    // Create table for results
    const table = document.createElement('table');
    table.className = 'scan-results-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Status</th>
            <th>Field</th>
            <th>URL</th>
            <th>VirusTotal Results</th>
        </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    scanResults.forEach(({ url, field, type, result }) => {
        const row = document.createElement('tr');

        const statusIcon = getScanResultIcon(result);
        const statusText = getScanResultText(result);
        const truncatedUrl = url.length > 60 ? url.substring(0, 57) + '...' : url;

        const vtResults = getVirusTotalResultsDisplay(result);

        row.innerHTML = `
            <td class="scan-status">
                <span class="scan-result-icon">${statusIcon}</span>
                <span class="scan-result-text">${statusText}</span>
            </td>
            <td class="scan-field">${field} <small>(${type})</small></td>
            <td class="scan-url" title="${url}">${truncatedUrl}</td>
            <td class="scan-vt-results">${vtResults}</td>
        `;

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    details.appendChild(table);

    // Replace the step content while keeping the step structure
    const stepLabel = stepElement.querySelector('.step-label');
    if (stepLabel) {
        stepElement.appendChild(details);
    }
}

/**
 * Gets the appropriate icon for a scan result.
 * @param {ScanResult} result - Scan result
 * @returns {string} HTML icon
 */
function getScanResultIcon(result) {
    if (result.skipped) return '⏭️';
    if (!result.scanned) return '⚠️';
    if (result.safe === false) return '❌';
    if (result.safe === true) return '✅';
    return '❓';
}

/**
 * Gets the status text for a scan result.
 * @param {ScanResult} result - Scan result
 * @returns {string} Status text
 */
function getScanResultText(result) {
    if (result.skipped) return 'Skipped';
    if (!result.scanned) return 'Failed';
    if (result.safe === false) return 'Unsafe';
    if (result.safe === true) return 'Safe';
    return 'Unknown';
}

/**
 * Gets the detailed VirusTotal results display.
 * @param {ScanResult} result - Scan result
 * @returns {string} HTML for VirusTotal results
 */
function getVirusTotalResultsDisplay(result) {
    if (result.skipped) {
        return '<em>No API key provided</em>';
    }

    if (!result.scanned) {
        return `<em>Scan failed: ${result.error || 'Unknown error'}</em>`;
    }

    if (!result.stats) {
        return '<em>No detailed results available</em>';
    }

    const { harmless = 0, malicious = 0, suspicious = 0, undetected = 0 } = result.stats;
    const total = harmless + malicious + suspicious + undetected;

    if (total === 0) {
        return '<em>Analysis pending</em>';
    }

    return `
        <div class="vt-stats">
            <div class="vt-stat vt-harmless" title="Harmless detections">
                <span class="vt-count">${harmless}</span>
                <span class="vt-label">Clean</span>
            </div>
            <div class="vt-stat vt-malicious" title="Malicious detections">
                <span class="vt-count">${malicious}</span>
                <span class="vt-label">Malware</span>
            </div>
            <div class="vt-stat vt-suspicious" title="Suspicious detections">
                <span class="vt-count">${suspicious}</span>
                <span class="vt-label">Suspicious</span>
            </div>
            <div class="vt-stat vt-undetected" title="Undetected by engines">
                <span class="vt-count">${undetected}</span>
                <span class="vt-label">Undetected</span>
            </div>
        </div>
    `;
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
    // Initially mark as pending - will be updated after metadata parsing
    markActive('url-scan');

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

    // Update the step label to show detected standard
    updateStepLabel('metadata-parse', `Metadata Parsing & Validation (${getStandardLabel(parseResult.standard)})`);

    if (parseResult.warnings.length > 0) {
        markWarning('metadata-parse');
    } else {
        markSuccess('metadata-parse');
    }

    showResults(true);
    renderMetadata(parseResult);

    // --- Step 5: Comprehensive URL Security Scan ---
    const scanAllUrls = scanAllUrlsToggle?.checked ?? false;
    const allUrls = extractAllUrls(parseResult.raw, parseResult.standard);

    console.log('[Pipeline] Extracted URLs for scanning:', allUrls);

    if (allUrls.length === 0) {
        markSkipped('url-scan');
        markSkipped('media-scan');
        markSkipped('media-display');
        return;
    }

    if (!vtApiKey) {
        console.log('[Pipeline] No API key available, skipping VirusTotal scans');
        markSkipped('url-scan');
    } else {
        console.log('[Pipeline] Starting VirusTotal scans with API key');
        let scanResults;
        let hasUnsafeUrl = false;

        if (scanAllUrls) {
            // Scan all URLs found in metadata
            console.log('[Pipeline] Scanning all URLs in metadata');
            scanResults = await scanMultipleUrls(allUrls, vtApiKey);
            hasUnsafeUrl = scanResults.some(item => item.result.safe === false);

            // Update url-scan step to show comprehensive results
            updateExpandableScanStep('url-scan', scanResults, true);
        } else {
            // Scan only the main image URL
            const imageUrl = parseResult.image;
            if (!imageUrl) {
                console.log('[Pipeline] No image URL found, skipping scan');
                markSkipped('url-scan');
            } else {
                console.log('[Pipeline] Scanning only main image URL:', imageUrl);
                const mediaScan = await scanURL(imageUrl, vtApiKey);
                scanResults = [{ url: imageUrl, field: 'image', type: 'media', result: mediaScan }];
                hasUnsafeUrl = mediaScan.safe === false;

                // Update url-scan step to show results
                updateExpandableScanStep('url-scan', scanResults, true);
            }
        }

        if (scanResults && scanResults.some(item => !item.result.scanned && !item.result.skipped)) {
            markWarning('url-scan');
        } else if (hasUnsafeUrl) {
            markWarning('url-scan');
        } else {
            markSuccess('url-scan');
        }
    }

    // --- Step 6: Media Display ---
    markActive('media-display');

    // Find the main image URL for display
    const imageUrl = parseResult.image;
    if (!imageUrl) {
        markSkipped('media-display');
        return;
    }

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

    logInfo('Pipeline complete', { url: rawUrl, standard: parseResult.standard, urlsScanned: allUrls.length });
}
