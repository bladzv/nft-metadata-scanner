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

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

/** @type {string} In-memory VirusTotal API key */
let vtApiKey = '';

/** @type {boolean} Whether a scan is currently running */
let isScanning = false;

/* ------------------------------------------------------------------ */
/*  DOM References                                                     */
/* ------------------------------------------------------------------ */

const scanForm = document.getElementById('scan-form');
const urlInput = document.getElementById('url-input');
const scanBtn = document.getElementById('scan-btn');
const urlError = document.getElementById('url-error');
const urlClearBtn = document.getElementById('url-clear-btn');

// About modal
const aboutBtn = document.getElementById('about-btn');
const aboutModal = document.getElementById('about-modal');
const aboutCloseBtn = document.getElementById('about-close-btn');
const aboutOkBtn = document.getElementById('about-ok-btn');

// API key elements
const apikeyInput = document.getElementById('apikey-input');
const apikeyActionBtn = document.getElementById('apikey-action-btn');
const apikeyQuotaBtn = document.getElementById('apikey-quota-btn');
const apikeyQuotaModal = document.getElementById('apikey-quota-modal');
const apikeyQuotaCloseBtn = document.getElementById('apikey-quota-close-btn');
const apikeyQuotaCloseFooter = document.getElementById('apikey-quota-close-footer');
const apikeyQuotaTable = document.getElementById('apikey-quota-table');
const apikeyError = document.getElementById('apikey-error');

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

// Navigation
const inputSection = document.querySelector('.input-section');
const resultsContainer = document.getElementById('results-container');
const backButtonContainer = document.getElementById('back-button-container');
const backBtn = document.getElementById('back-btn');

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
    if (siteMain) siteMain.style.paddingTop = '';
}

function showResultsPage() {
    if (inputSection) inputSection.hidden = true;
    if (backButtonContainer) backButtonContainer.hidden = false;
    if (resultsContainer) resultsContainer.hidden = false;
    if (siteMain) siteMain.style.paddingTop = '0';
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

    // API key
    apikeyActionBtn?.addEventListener('click', handleApiKeyAction);
    apikeyInput?.addEventListener('input', () => { if (apikeyError) apikeyError.classList.add('hidden'); });
    apikeyQuotaBtn?.addEventListener('click', handleQuotaButtonClick);
    apikeyQuotaCloseBtn?.addEventListener('click', hideQuotaModal);
    apikeyQuotaCloseFooter?.addEventListener('click', hideQuotaModal);
    apikeyQuotaModal?.addEventListener('click', (e) => { if (e.target === apikeyQuotaModal) hideQuotaModal(); });

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

    // Keyboard
    document.addEventListener('keydown', handleKeyDown);

    // Navigation
    backBtn?.addEventListener('click', navigateToHome);
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

/* ------------------------------------------------------------------ */
/*  Modal Helpers                                                      */
/* ------------------------------------------------------------------ */

function showAboutModal() {
    if (!aboutModal || !aboutBtn) return;
    aboutModal.hidden = false;
    aboutBtn.setAttribute('aria-expanded', 'true');
    aboutCloseBtn?.focus();
}

function hideAboutModal() {
    if (!aboutModal || !aboutBtn) return;
    aboutModal.hidden = true;
    aboutBtn.setAttribute('aria-expanded', 'false');
    aboutBtn?.focus();
}

function showApikeyRequiredModal() {
    if (!apikeyRequiredModal) return;
    apikeyRequiredModal.hidden = false;
    apikeyRequiredOkBtn?.focus();
}

function hideApikeyRequiredModal() {
    if (!apikeyRequiredModal) return;
    apikeyRequiredModal.hidden = true;
    apikeyInput?.focus();
}

function showRemoveConfirmModal() {
    if (!removeConfirmModal) return;
    removeConfirmModal.hidden = false;
    removeConfirmNoBtn?.focus();
}

function hideRemoveConfirmModal() {
    if (!removeConfirmModal) return;
    removeConfirmModal.hidden = true;
    apikeyActionBtn?.focus();
}

function showQuotaModal() {
    if (!apikeyQuotaModal || !apikeyQuotaBtn) return;
    apikeyQuotaModal.hidden = false;
    apikeyQuotaBtn.setAttribute('aria-expanded', 'true');
    apikeyQuotaCloseBtn?.focus();
}

function hideQuotaModal() {
    if (!apikeyQuotaModal || !apikeyQuotaBtn) return;
    apikeyQuotaModal.hidden = true;
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
    vtDetailCloseBtn?.focus();
}

function hideVtDetailModal() {
    if (!vtDetailModal) return;
    vtDetailModal.hidden = true;
}

function showMediaPreviewModal(src, alt) {
    if (!mediaPreviewModal || !mediaPreviewImg) return;
    mediaPreviewImg.src = src;
    mediaPreviewImg.alt = alt || 'NFT Media Preview';
    mediaPreviewModal.hidden = false;
    mediaPreviewCloseBtn?.focus();
}

function hideMediaPreviewModal() {
    if (!mediaPreviewModal) return;
    if (mediaPreviewImg) mediaPreviewImg.src = '';
    mediaPreviewModal.hidden = true;
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
    const cached = sessionStorage.getItem('nft-scanner-vt-quota');

    if (vtApiKey) {
        if (apikeyInput) {
            apikeyInput.value = '\u2713 ' + '\u2022'.repeat(Math.min(16, vtApiKey.length));
            apikeyInput.readOnly = true;
            apikeyInput.classList.add('input-success');
        }
        apikeyActionBtn.hidden = false;
        apikeyActionBtn.disabled = false;
        apikeyActionBtn.textContent = 'Remove';
        apikeyActionBtn.className = 'btn btn-danger btn-sm api-key-action';
        if (cached) {
            apikeyQuotaBtn.hidden = false;
            apikeyQuotaBtn.disabled = false;
        } else {
            apikeyQuotaBtn.hidden = true;
            apikeyQuotaBtn.disabled = true;
        }
        if (scanBtn) scanBtn.disabled = false;
    } else {
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

    if (vtApiKey) {
        setQuotaButtonLoading(true);
        fetchUserQuota(vtApiKey)
            .then((quota) => {
                if (quota) {
                    sessionStorage.setItem('nft-scanner-vt-quota', JSON.stringify(quota));
                    if (apikeyQuotaBtn) {
                        apikeyQuotaBtn.hidden = false;
                        apikeyQuotaBtn.disabled = false;
                    }
                }
            })
            .catch(() => {})
            .finally(() => setQuotaButtonLoading(false));
    }
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

    try {
        localStorage.setItem('nft-scanner-vt-api-key', key);
        vtApiKey = key;
        updateApiKeyUI();
        logInfo('API key saved');

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
            console.warn('[API Key] Failed to fetch quota:', err?.message || err);
        } finally {
            setQuotaButtonLoading(false);
        }
    } catch (error) {
        if (apikeyError) {
            apikeyError.textContent = 'Failed to save API key. Please try again.';
            apikeyError.classList.remove('hidden');
        }
        logError('StorageError', 'Failed to save API key', { error: error.message });
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
            apikeyQuotaBtn.hidden = false;
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
        const resp = await fetch(
            `https://www.virustotal.com/api/v3/users/${encodeURIComponent(apiKey)}`,
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
 * @param {string} title - Step heading text
 * @returns {Object} References to card sub-elements for later updates
 */
function createStepCard(title) {
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

    header.append(iconWrap, titleEl, badgeArea);

    const body = document.createElement('div');
    body.className = 'scan-step-body';

    card.append(header, body);
    resultsContainer.appendChild(card);

    requestAnimationFrame(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));

    return { card, header, body, iconWrap, titleEl, badgeArea };
}

/**
 * Updates a step card's status (icon + data attribute).
 * @param {Object} step - Step card reference object
 * @param {string} status - One of: pending, active, success, warning, error, skipped
 */
function setStepStatus(step, status) {
    step.card.setAttribute('data-status', status);
    step.iconWrap.innerHTML = STEP_ICONS[status] || STEP_ICONS.pending;
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
function createScanTable(headers) {
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';

    const table = document.createElement('table');
    table.className = 'scan-table';

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

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    wrapper.appendChild(table);

    // Enable column resizing
    enableColumnResize(table);

    return { wrapper, table, tbody };
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
    if (malicious > 0) parts.push(`<span class="vt-malicious">${malicious} malicious</span>`);
    if (suspicious > 0) parts.push(`<span class="vt-suspicious">${suspicious} suspicious</span>`);
    parts.push(`<span class="vt-clean">${harmless} clean</span>`);
    parts.push(`<span class="vt-undetected">${undetected} undetected</span>`);
    return parts.join(' · ');
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
        for (const [engine, info] of Object.entries(results)) {
            const tr = document.createElement('tr');
            const engTd = document.createElement('td');
            engTd.textContent = engine;
            const catTd = document.createElement('td');
            catTd.textContent = info?.category ?? '-';
            const resTd = document.createElement('td');
            const result = info?.result ?? 'clean';
            resTd.innerHTML = `<span class="vt-${result.toLowerCase()}">${result}</span>`;
            tr.append(engTd, catTd, resTd);
            tbody.appendChild(tr);
        }
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
    sumCell.innerHTML = result.scanned ? formatVtSummary(result) : (result.error || '-');

    const dCell = document.createElement('td');
    dCell.className = 'cell-center';
    if (result.rawAnalysis) {
        dCell.appendChild(createMagnifyButton(result.rawAnalysis));
    } else {
        dCell.textContent = '-';
    }

    row.append(sCell, uCell, sumCell, dCell);
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
    sumCell.innerHTML = result.scanned ? formatVtSummary(result) : (result.error || '-');

    const dCell = document.createElement('td');
    dCell.className = 'cell-center';
    if (result.rawAnalysis) {
        dCell.appendChild(createMagnifyButton(result.rawAnalysis));
    } else {
        dCell.textContent = '-';
    }

    row.append(sCell, fCell, uCell, sumCell, dCell);
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
    prevCell.className = 'cell-center';
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
    sumCell.innerHTML = fileResult.scanned ? formatVtSummary(fileResult) : (fileResult.error || '-');

    const dCell = document.createElement('td');
    dCell.className = 'cell-center';
    if (fileResult.rawAnalysis) {
        dCell.appendChild(createMagnifyButton(fileResult.rawAnalysis));
    } else {
        dCell.textContent = '-';
    }

    row.append(sCell, typeCell, sizeCell, prevCell, sumCell, dCell);
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
    setScanLoading(true);
    clearResults();
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
 * Runs the full sequential validation pipeline.
 * Each step renders a card; the next step only runs if the previous passed.
 * @param {string} rawUrl - User-entered URL (already validated)
 */
async function runPipeline(rawUrl) {
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
    const step1 = createStepCard('URL Security Scan (VirusTotal)');
    const urlHeaders = ['Status', 'Scanned URL', 'VirusTotal Results Summary', 'More Details'];
    const { wrapper: uWrap, tbody: uTbody } = createScanTable(urlHeaders);
    const uPlaceholder = createPlaceholderRow(4);
    uTbody.appendChild(uPlaceholder);
    step1.body.appendChild(uWrap);

    const urlScan = await scanURL(resolvedUrl, vtApiKey);

    uTbody.removeChild(uPlaceholder);
    uTbody.appendChild(buildUrlScanRow(resolvedUrl, urlScan));

    if (urlScan.safe === false) {
        setStepStatus(step1, 'error');
        step1.body.insertAdjacentHTML(
            'beforeend',
            '<p class="step-msg step-msg-error">The metadata URL was flagged as potentially unsafe. Scan stopped.</p>'
        );
        return;
    }
    setStepStatus(step1, urlScan.scanned ? 'success' : 'warning');

    scanStats.totalUrlScans++;
    if (urlScan.safe === false) {
        scanStats.unsafeUrlScans++;
    } else {
        scanStats.safeUrlScans++;
    }

    /* ---- Step 2: Fetch Metadata JSON ---- */
    const step2 = createStepCard('Fetching Metadata...');
    const fetchResult = await fetchMetadataJSON(resolvedUrl);

    if (!fetchResult.success) {
        setStepStatus(step2, 'error');
        step2.titleEl.textContent = 'Metadata Fetch Failed';
        step2.body.innerHTML = `<p class="step-msg step-msg-error">${escapeHtml(getUserMessage(fetchResult.error))}</p>`;
        return;
    }

    setStepStatus(step2, 'success');
    step2.titleEl.textContent = 'Metadata Fetched Successfully';

    /* ---- Step 3: Metadata Parsing & Validation ---- */
    const step3 = createStepCard('Metadata Parsing & Validation');
    const parseResult = parseMetadata(fetchResult.text);

    if (!parseResult.valid) {
        setStepStatus(step3, 'error');
        step3.body.innerHTML = `<p class="step-msg step-msg-error">${escapeHtml(parseResult.reason)}</p>`;
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
    const step4 = createStepCard('Parsed Metadata');
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
        const stepEmpty = createStepCard('Media Security Scan');
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

    const step5 = createStepCard('Media Security Scan');
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
        // 7a: URL Scan for this media
        const mediaStep = createStepCard(`URL Scan: ${mediaObj.field.replace('.url', '')}`);
        const mHeaders = ['Status', 'Field', 'Scanned URL', 'VirusTotal Results Summary', 'More Details'];
        const { wrapper: mWrap, tbody: mTbody } = createScanTable(mHeaders);
        const mPlaceholder = createPlaceholderRow(5);
        mTbody.appendChild(mPlaceholder);
        mediaStep.body.appendChild(mWrap);

        const mResult = await scanURL(mediaObj.url, vtApiKey);

        mTbody.removeChild(mPlaceholder);
        mTbody.appendChild(buildMediaUrlScanRow(mediaObj, mResult));

        if (mResult.safe === false) {
            setStepStatus(mediaStep, 'error');
            continue;
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
            const fileStep = createStepCard(`File Scan: ${mediaObj.field.replace('.url', '')}`);
            const fHeaders = ['Status', 'Type', 'Size', 'Media Preview', 'VirusTotal Results', 'More Details'];
            const { wrapper: fWrap, tbody: fTbody } = createScanTable(fHeaders);
            const fPlaceholder = createPlaceholderRow(6);
            fTbody.appendChild(fPlaceholder);
            fileStep.body.appendChild(fWrap);

            // Fetch the media file
            const mediaFetchResult = await fetchMedia(mediaObj.url);

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
                continue;
            }

            // Upload blob to VirusTotal /files endpoint
            const fileResult = await scanFile(mediaFetchResult.blob, `media_${mediaObj.field}`, vtApiKey);

            fTbody.removeChild(fPlaceholder);
            fTbody.appendChild(buildFileScanRow(mediaFetchResult, fileResult));

            if (fileResult.safe === false) {
                setStepStatus(fileStep, 'error');
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
    const summaryCard = createStepCard('Scan Summary');
    setStepStatus(summaryCard, 'success');
    summaryCard.body.innerHTML = '<p>Scan of this metadata has been completed successfully!</p>';

    const summaryTable = document.createElement('table');
    summaryTable.className = 'scan-table';
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
    siteMain.appendChild(summaryCard);

    logInfo('Pipeline complete', { url: rawUrl, standard: parseResult.standard });
}
