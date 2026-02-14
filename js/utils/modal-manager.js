/**
 * @module modal-manager
 * @description Centralized modal keyboard navigation and focus management.
 * Handles ESC key to close modals and implements focus trapping.
 */

/**
 * Gets all focusable elements within a container.
 * Includes buttons, links, form inputs, and other interactive elements.
 * @param {HTMLElement} container - Container to search for focusable elements
 * @returns {HTMLElement[]} Array of focusable elements
 */
function getFocusableElements(container) {
    const selector = [
        'button',
        'a[href]',
        'input[type="text"]',
        'input[type="password"]',
        'input[type="url"]',
        'input[type="email"]',
        'input[type="number"]',
        'textarea',
        'select',
        '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(container.querySelectorAll(selector));
}

/**
 * Traps focus within a modal dialog.
 * When Tab is pressed at the last focusable element, focus wraps to first element.
 * When Shift+Tab is pressed at the first focusable element, focus wraps to last element.
 * @param {KeyboardEvent} event - The keyboard event
 * @param {HTMLElement[]} focusableElements - Focusable elements in the modal
 */
function handleTabKey(event, focusableElements) {
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
        // Shift+Tab pressed
        if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
        }
    } else {
        // Tab pressed
        if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
        }
    }
}

/**
 * Registers keyboard navigation handler for a modal dialog.
 * - ESC key closes the modal
 * - Tab/Shift+Tab implements focus trapping
 * @param {HTMLElement} modalElement - The modal element
 * @param {Function} closeCallback - Function to call when ESC is pressed
 * @returns {Function} Handler function (for easy removal later)
 */
export function setupModalKeyboardHandling(modalElement, closeCallback) {
    const handleKeydown = (event) => {
        // ESC key closes the modal
        if (event.key === 'Escape') {
            event.preventDefault();
            closeCallback();
            return;
        }

        // Tab key: implement focus trapping
        if (event.key === 'Tab') {
            const focusableElements = getFocusableElements(modalElement);
            handleTabKey(event, focusableElements);
        }
    };

    // Add event listener
    modalElement.addEventListener('keydown', handleKeydown);

    // Return handler for cleanup
    return () => {
        modalElement.removeEventListener('keydown', handleKeydown);
    };
}

/**
 * Enables modal keyboard handling when modal opens.
 * Called from showModal functions.
 * @param {HTMLElement} modalElement - The modal element
 * @param {Function} closeCallback - Function to call when ESC is pressed
 * @param {Object} handlers - Object to store handler references for cleanup
 * @param {string} handlerKey - Key to store handler in the handlers object
 */
export function enableModalKeyboardHandling(
    modalElement,
    closeCallback,
    handlers,
    handlerKey
) {
    if (!modalElement || !handlers) return;

    // Remove previous handler if it exists
    if (handlers[handlerKey]) {
        handlers[handlerKey]();
    }

    // Set up new handler
    const removeHandler = setupModalKeyboardHandling(modalElement, closeCallback);
    handlers[handlerKey] = removeHandler;
}

/**
 * Disables modal keyboard handling when modal closes.
 * Called from hideModal functions.
 * @param {Object} handlers - Object storing handler references
 * @param {string} handlerKey - Key of handler to remove
 */
export function disableModalKeyboardHandling(handlers, handlerKey) {
    if (!handlers || !handlers[handlerKey]) return;

    handlers[handlerKey]();
    delete handlers[handlerKey];
}
