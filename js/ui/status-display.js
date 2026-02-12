/**
 * @module status-display
 * @description Manages the validation pipeline UI — updates step icons,
 * status colors, and ARIA attributes as the scan progresses.
 */

/**
 * @typedef {'pending'|'active'|'success'|'warning'|'error'|'skipped'} StepStatus
 */

/** @type {Object<StepStatus, string>} Icons for each status */
const STATUS_ICONS = {
    pending: '○',
    active: '⟳',
    success: '✓',
    warning: '⚠',
    error: '✕',
    skipped: '⊘',
};

/** @type {HTMLOListElement|null} Cached reference to pipeline steps container */
let stepsContainer = null;

/**
 * Initialises the status display by caching the pipeline container reference.
 * Call once during app initialization.
 */
export function initStatusDisplay() {
    stepsContainer = document.getElementById('pipeline-steps');
}

/**
 * Shows or hides the pipeline section.
 * @param {boolean} visible - Whether to show the pipeline
 */
export function showPipeline(visible) {
    const section = document.getElementById('pipeline-section');
    if (section) {
        section.hidden = !visible;
    }
}

/**
 * Resets all pipeline steps to pending state.
 */
export function resetPipeline() {
    if (!stepsContainer) return;

    const steps = stepsContainer.querySelectorAll('.pipeline-step');
    steps.forEach((step) => {
        step.removeAttribute('data-status');
        const icon = step.querySelector('.step-icon');
        const srStatus = step.querySelector('.step-status');
        if (icon) icon.textContent = STATUS_ICONS.pending;
        if (srStatus) srStatus.textContent = 'pending';
    });
}

/**
 * Updates a single pipeline step's status.
 * @param {string} stepName - The data-step attribute value (e.g., 'url-validation')
 * @param {StepStatus} status - New status for the step
 */
export function updateStep(stepName, status) {
    if (!stepsContainer) return;

    const step = stepsContainer.querySelector(`[data-step="${stepName}"]`);
    if (!step) return;

    step.setAttribute('data-status', status);

    const icon = step.querySelector('.step-icon');
    const srStatus = step.querySelector('.step-status');

    if (icon) {
        icon.textContent = STATUS_ICONS[status] ?? STATUS_ICONS.pending;
    }
    if (srStatus) {
        srStatus.textContent = status;
    }
}

/**
 * Convenience: marks a step as active (in-progress).
 * @param {string} stepName - Step identifier
 */
export function markActive(stepName) {
    updateStep(stepName, 'active');
}

/**
 * Convenience: marks a step as successfully completed.
 * @param {string} stepName - Step identifier
 */
export function markSuccess(stepName) {
    updateStep(stepName, 'success');
}

/**
 * Convenience: marks a step as failed.
 * @param {string} stepName - Step identifier
 */
export function markError(stepName) {
    updateStep(stepName, 'error');
}

/**
 * Convenience: marks a step as skipped.
 * @param {string} stepName - Step identifier
 */
export function markSkipped(stepName) {
    updateStep(stepName, 'skipped');
}

/**
 * Convenience: marks a step with a warning.
 * @param {string} stepName - Step identifier
 */
export function markWarning(stepName) {
    updateStep(stepName, 'warning');
}
