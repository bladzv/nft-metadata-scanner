/**
 * @module process-logger
 * @description Pub/sub process logging system for tracking long-running operations.
 * Automatically redacts sensitive data (API keys, partial URLs) before publishing.
 */

/**
 * @typedef {Object} ProcessLogEntry
 * @property {string} timestamp - ISO timestamp
 * @property {string} level - Log level: 'info' | 'warn' | 'error' | 'debug'
 * @property {string} message - Log message
 * @property {Object} [meta] - Additional context (redacted)
 */

/**
 * @typedef {Object} ProcessState
 * @property {string} id - Process ID
 * @property {string} status - Current status: 'pending' | 'active' | 'success' | 'error' | 'warning'
 * @property {number} startTime - Start timestamp (ms)
 * @property {Object} meta - Process metadata
 * @property {ProcessLogEntry[]} logs - Log entries
 * @property {Map<string, Set<Function>>} listeners - Event listeners
 */

/** @type {Map<string, ProcessState>} */
const processes = new Map();

// Pending listeners for processes that are subscribed before the process
// is created. Keyed by process id -> event -> Set(callback)
const pendingListeners = new Map();

/**
 * Redacts sensitive information from metadata objects.
 * @param {any} value - Value to redact
 * @returns {any} Redacted value
 */
function redact(value) {
    if (typeof value === 'string') {
        // Redact API keys (x-apikey header values)
        if (/^[a-f0-9]{64}$/i.test(value)) {
            return `${value.substring(0, 8)}...${value.substring(56)}`;
        }
        // Redact URLs containing API keys
        if (value.includes('x-apikey') || value.includes('apikey')) {
            return value.replace(/([a-f0-9]{64})/gi, (match) => `${match.substring(0, 8)}...`);
        }
        // Truncate long URLs for readability
        if (value.startsWith('http') && value.length > 100) {
            return `${value.substring(0, 97)}...`;
        }
    }
    
    if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
            return value.map(redact);
        }
        const redacted = {};
        for (const [key, val] of Object.entries(value)) {
            if (['apiKey', 'api_key', 'apikey', 'x-apikey'].includes(key.toLowerCase())) {
                redacted[key] = typeof val === 'string' && val.length > 16
                    ? `${val.substring(0, 8)}...${val.substring(val.length - 4)}`
                    : '[REDACTED]';
            } else {
                redacted[key] = redact(val);
            }
        }
        return redacted;
    }
    
    return value;
}

/**
 * Creates a new tracked process.
 * @param {string} id - Unique process identifier
 * @param {Object} [meta={}] - Process metadata
 * @returns {string} Process ID
 */
export function createProcess(id, meta = {}) {
    if (processes.has(id)) {
        console.warn(`[ProcessLogger] Process "${id}" already exists; recreating`);
    }
    
    processes.set(id, {
        id,
        status: 'pending',
        startTime: Date.now(),
        meta: redact(meta),
        logs: [],
        listeners: new Map(),
    });
    
    // Attach any pending listeners that were registered before the process existed
    if (pendingListeners.has(id)) {
        const events = pendingListeners.get(id);
        const created = processes.get(id);
        for (const [event, callbacks] of events.entries()) {
            created.listeners.set(event, new Set());
            for (const cb of callbacks) created.listeners.get(event).add(cb);
        }
        pendingListeners.delete(id);
    }

    console.log(`[ProcessLogger] Created process: ${id}`, redact(meta));
    return id;
}

/**
 * Logs a message for a process.
 * @param {string} id - Process ID
 * @param {'info'|'warn'|'error'|'debug'} level - Log level
 * @param {string} message - Log message
 * @param {Object} [meta={}] - Additional context
 */
export function log(id, level, message, meta = {}) {
    const process = processes.get(id);
    if (!process) {
        console.warn(`[ProcessLogger] Process "${id}" not found; creating it`);
        createProcess(id);
        return log(id, level, message, meta);
    }
    
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        meta: redact(meta),
    };
    
    process.logs.push(entry);
    
    // Console output with structured format
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[consoleMethod](`[ProcessLogger:${id}] [${level.toUpperCase()}]`, message, entry.meta);
    
    // Notify listeners
    emit(id, 'log', entry);
}

/**
 * Updates process status.
 * @param {string} id - Process ID
 * @param {'pending'|'active'|'success'|'error'|'warning'} status - New status
 */
export function setStatus(id, status) {
    const process = processes.get(id);
    if (!process) {
        console.warn(`[ProcessLogger] Cannot set status for unknown process: ${id}`);
        return;
    }
    
    process.status = status;
    emit(id, 'statusChange', { status, timestamp: new Date().toISOString() });
}

/**
 * Subscribes to process events.
 * @param {string} id - Process ID
 * @param {'log'|'statusChange'|'complete'} event - Event name
 * @param {Function} callback - Event handler
 */
export function on(id, event, callback) {
    const process = processes.get(id);
    if (!process) {
        // Store as pending listener to be attached when the process is created
        if (!pendingListeners.has(id)) pendingListeners.set(id, new Map());
        const events = pendingListeners.get(id);
        if (!events.has(event)) events.set(event, new Set());
        events.get(event).add(callback);
        return;
    }
    
    if (!process.listeners.has(event)) {
        process.listeners.set(event, new Set());
    }
    process.listeners.get(event).add(callback);
}

/**
 * Unsubscribes from process events.
 * @param {string} id - Process ID
 * @param {string} event - Event name
 * @param {Function} callback - Event handler to remove
 */
export function off(id, event, callback) {
    const process = processes.get(id);
    if (process && process.listeners.has(event)) {
        process.listeners.get(event).delete(callback);
        return;
    }
    // Also remove from pending listeners if present
    if (pendingListeners.has(id)) {
        const events = pendingListeners.get(id);
        if (events.has(event)) {
            events.get(event).delete(callback);
            if (events.get(event).size === 0) events.delete(event);
        }
        if (events.size === 0) pendingListeners.delete(id);
    }
}

/**
 * Emits an event to process listeners.
 * @param {string} id - Process ID
 * @param {string} event - Event name
 * @param {any} data - Event data
 */
function emit(id, event, data) {
    const process = processes.get(id);
    if (!process || !process.listeners.has(event)) return;
    
    for (const callback of process.listeners.get(event)) {
        try {
            callback(data);
        } catch (err) {
            console.error(`[ProcessLogger] Listener error for ${id}:${event}`, err);
        }
    }
}

/**
 * Marks a process as complete and optionally disposes it.
 * @param {string} id - Process ID
 * @param {'success'|'error'|'warning'} finalStatus - Final status
 * @param {boolean} [dispose=false] - Whether to remove the process
 */
export function complete(id, finalStatus = 'success', dispose = false) {
    const process = processes.get(id);
    if (!process) return;
    
    process.status = finalStatus;
    const duration = Date.now() - process.startTime;
    
    emit(id, 'complete', { status: finalStatus, duration, timestamp: new Date().toISOString() });
    
    console.log(`[ProcessLogger] Process "${id}" completed with status: ${finalStatus} (${duration}ms)`);
    
    if (dispose) {
        processes.delete(id);
    }
}

/**
 * Disposes a process and removes all listeners.
 * @param {string} id - Process ID
 */
export function dispose(id) {
    const process = processes.get(id);
    if (!process) return;
    
    // Clear all listeners
    process.listeners.clear();
    processes.delete(id);
    
    console.log(`[ProcessLogger] Disposed process: ${id}`);
}

/**
 * Gets the current state of a process.
 * @param {string} id - Process ID
 * @returns {ProcessState|null} Process state
 */
export function getProcess(id) {
    return processes.get(id) || null;
}

/**
 * Gets all log entries for a process.
 * @param {string} id - Process ID
 * @returns {ProcessLogEntry[]} Log entries
 */
export function getLogs(id) {
    const process = processes.get(id);
    return process ? [...process.logs] : [];
}
