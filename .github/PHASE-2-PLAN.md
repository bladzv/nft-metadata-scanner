Plan: Per-step Progress UI + Robust VT Timeouts & Rate Limiting (Fail‑Fast)
TL;DR — Add a process-logger and per-step UI (status strip + collapsible logs), introduce a resilient `fetchWithRetries` used by VT flows (respecting HTTP 429 / `Retry-After`, exponential backoff, jitter, and sliding-window `RateLimiter`), adapt `pollAnalysis` to use adaptive polling and server-directed backoff, and enforce strict sequential scans (fail‑fast: require `scanned === true` and `safe !== false` before proceeding). Key files: `security-scanner.js:1-396`, `main.js:1433-1720`, plus new utilities and CSS/UI bits.

## Status Tables

### Feature status

| Feature | Status |
|---|---:|
| Add a process logger | Done |
| Add resilient fetch helper | Done |
| Improve rate-limit/backoff integration in VT utility | Partially Done |
| Enforce Sequential Scans (Fail‑Fast) in pipeline | Partially Done |
| Make `scanMultipleUrls` strict-by-default | Not Done |
| UI: per‑step status strip + collapsible logs | Partially Done |
| Error messaging and telemetry | Partially Done |
| Small UX guardrails | Partially Done |
| Tests & manual validation | Not Done |

## Status (Done / Partially Done / Not Done)

- **Add a process logger**: Done
	- `js/utils/process-logger.js` was added with pending-listener support so UI can subscribe before a process is created. Logs are redacted for sensitive values.

- **Add resilient fetch helper**: Done
	- `js/utils/fetch-with-retries.js` exists with cancellable waits, 429/`Retry-After` parsing, backoff + jitter, and integration points for the `RateLimiter`.

- **Improve rate-limit/backoff integration in VT utility**: Partially Done
	- Implemented: polling was made exempt from the rate limiter, `fetchWithRetries` is used for submissions/uploads, and VT 409 handling was added to poll existing analyses.
	- Remaining: add adaptive polling multipliers (start at 2000ms, ×1.5 up to max), reduce maxPolls based on `RateLimiter` remaining quota, and ensure `getRateLimitStatus()` reflects the combined behavior.

- **Enforce Sequential Scans (Fail‑Fast) in pipeline**: Partially Done
	- Implemented: pipeline halts for `safe === false` and obvious errors; improved error logging and early subscription so UI sees failures.
	- Remaining: explicitly treat `scanned !== true` as fatal in `main.js:1433-1720` (set step to error, log, show `showScanErrorModal(...)`, and return to stop pipeline) for all scan types.

- **Make `scanMultipleUrls` strict-by-default**: Not Done
	- Remaining: change signature to `options = { stopOnError: true }`, iterate sequentially, stop early on `scanned !== true` or `safe === false`, and return partial results with failure reason.

- **UI: per‑step status strip + collapsible logs**: Partially Done
	- Implemented: optional log drawers were added and early subscription enables logs to appear; duplicate collapse icons removed for summary card.
	- Remaining: add inline status strip (spinner / "Polling..." / elapsed time / API quota snapshot), ARIA live region wiring, and CSS for `.scan-step-log` and `.scan-step-status-strip`.

- **Error messaging and telemetry**: Partially Done
	- Implemented: richer error logging and stack traces; structured console logs added for key failures.
	- Remaining: map canonical errors from `fetchWithRetries` (RateLimit, ServerBackoff, NetworkTimeout) to user-friendly messages in `error-handler.js` and ensure telemetry format follows project policy.

- **Small UX guardrails**: Partially Done
	- Implemented: UI spacing, reload redirect, and some pipeline guard fixes.
	- Remaining: disable concurrent-scan controls while pipeline runs, add quota-status button using `getRateLimitStatus()`, and optionally add per-step retry CTA.

- **Tests & manual validation**: Not Done
	- Remaining: add unit/integration tests for `fetchWithRetries` and `scanMultipleUrls`, and perform manual 429/network-failure/malicious-detection tests.

## Steps (unchanged — for reference)

### Add a process logger

Create `js/utils/process-logger.js` (pub/sub API).
Expose: `createProcess(id, meta)`, `log(id, level, message, meta)`, `on(id, event, cb)`, `dispose(id)`.
Ensure logs redact API keys and sensitive fields before publishing.

### Add resilient fetch helper

Create `js/utils/fetch-with-retries.js` or add to an existing utils file.
Behavior:
- Config: `maxAttempts` (default 5), `baseDelayMs` (500), `maxDelayMs` (30_000), `factor` (2), `jitter` (±15%).
- On HTTP 429: parse `Retry-After` (seconds or HTTP date). Use server-provided wait if present.
- On 5xx: retry with backoff.
- Abort support: accept `signal`.
- Respect `RateLimiter.waitForSlot()` before each attempt.
- Return `{ resp, err }` similar to `safeAsync`, and canonicalized errors for UI.

### Improve rate-limit/backoff integration in VT utility

Modify `security-scanner.js:1-396`:
Replace direct fetch calls in `pollAnalysis`, `scanURL`, `scanFile`, and `scanMultipleUrls` with `fetchWithRetries`.
Update `pollAnalysis`:
- Use adaptive polling: start `pollIntervalMs = 2000`, multiply by `1.5` after each non-terminal attempt up to `maxPollIntervalMs` (e.g., 10s).
- Reduce `maxPolls` if `RateLimiter.remaining` is low, or pause and honor `Retry-After`.
- When server returns HTTP 429, use `fetchWithRetries` server wait behavior and log to `process-logger`.
- Keep per-request abort timeouts (15s/30s) but let server-directed `Retry-After` extend polling gaps (do not extend individual request timeouts).
- Export `getRateLimitStatus()` unchanged but ensure it reflects new behavior.

### Enforce Sequential Scans (Fail‑Fast) in pipeline

Update `main.js:1433-1720`:
After each scan call (`scanURL`, `scanFile`, `scanMultipleUrls`), treat `scanned !== true` as fatal:
- Set the step card to error, log via `process-logger` + `logError`, show existing modal (`showScanErrorModal(...)`), and `return` to stop pipeline.
- Keep existing behavior of halting when `safe === false`.
- For `scanMultipleUrls`, call with `{ stopOnError: true }` (see next step).
- Update UI path that previously treated `scanned === false` as warning to treat as error when it represents a failed/incomplete scan.

### Make scanMultipleUrls strict-by-default

Change signature in `security-scanner.js:364-396` to accept `options = { stopOnError: true }`.
Iterate sequentially and stop early if an item returns `scanned !== true` or `safe === false`.
Return partial results array and the failure reason in the last item (so UI can render the exact cause).

### UI: per‑step status strip + collapsible logs

Enhance `createStepCard` and `setStepStatus` in `main.js:1433-1720`:
- Add an inline status strip showing: spinner / "Polling..." / elapsed time / API quota snapshot.
- Add a collapsible log drawer inside each step card tied to `process-logger` events. Provide toggle button text like "Show logs" / "Hide logs".
- Make logs accessible: `role="log" aria-live="polite"` for new entries.
- Ensure all displayed logs mask API keys and sensitive URLs (use `process-logger` redaction).
- Add styles in `components.css` for `.scan-step-log`, `.scan-step-status-strip`, and collapsed state.

### Error messaging and telemetry

Update `error-handler.js` to map new canonical errors from `fetchWithRetries` (e.g., `RateLimit`, `ServerBackoff`, `NetworkTimeout`) to user-friendly messages.
Log structured events to console with strict format (timestamp + type + context) per project policy.

### Small UX guardrails

- Disable concurrent scans UI controls while pipeline running.
- Expose quota status button to show `getRateLimitStatus()` results.
- Provide a retry CTA in the step card for failed steps to re-run only that step (optional, implement after Phase 1).

## Tests & manual validation

### Manual tests:

- Simulate HTTP 429 responses (via mock CORS proxy or a test proxy) and verify backoff and pause happen, UI shows `Retry-After` countdown and pipeline halts if scan remains incomplete.
- Simulate network failures and verify pipeline stops with `scanned !== true`.
- Simulate malicious detection (`safe === false`) and verify immediate halt.
- Verify "Scan ALL" ordering and that the loop halts at first failure.

### Unit/Integration:

- Add unit tests for `fetchWithRetries` behavior (parse `Retry-After`, backoff timings, jitter).
- Add tests for `scanMultipleUrls` stop-on-error behavior.

## Verification

### Smoke steps to run in browser:

- Start a normal scan: verify per-step status strip shows spinner, logs appear, and pipeline reaches the summary card.
- Force 429 on the first VT request: verify `fetchWithRetries` honors `Retry-After`, UI shows pause and a log message, and the pipeline halts if `scanned !== true`.
- Force network failure on a media download: verify pipeline stops at that file scan and shows step error modal.
- Use multiple media URLs with the 2nd failing: verify pipeline halts at the 2nd and summary is not shown.
- Inspect console logs for structured entries produced by `logError` and `process-logger`.

## Decisions

- Fail-fast chosen: pipeline will stop on any scan that does not complete (`scanned !== true`) or that is explicitly unsafe (`safe === false`). This matches the user's requirement: "Previous scan should always pass before proceed".
- Partial results returned from `scanMultipleUrls` (with stop reason) rather than throwing, to let UI show failure context without uncaught exceptions.
- Rate-limiter preserved (sliding-window) and enforced before each `fetchWithRetries` attempt to avoid exceeding VT public quotas; server `Retry-After` is honored and can pause polling beyond client timeouts.
- Keep per-request timeouts (15s/30s) but separate them from server-directed backoff between attempts/polls.

## Files to edit

- Add: `js/utils/process-logger.js` (Done)
- Add: `js/utils/fetch-with-retries.js` (or append to existing utils file) (Done)
- Edit: `security-scanner.js:1-396` — `pollAnalysis`, `scanURL`, `scanFile`, `scanMultipleUrls`, `getRateLimitStatus` (Partially Done)
- Edit: `main.js:1433-1720` — `runPipeline`, `createStepCard`, `setStepStatus`, `createScanTable` integration points (Partially Done)
- Edit: `components.css` — styles for status strip and logs (Not Done)
- Optionally edit: `index.html` to ensure step-card container supports collapsible log UI (Not Done)