// Neo4j driver errors for "can't reach the database" carry these codes/names —
// used to tell "CognoDB is unreachable" (503, expected, recoverable) apart from
// an actual bug in our query (500, our fault).
const UNAVAILABLE_ERROR_CODES = new Set([
  "ServiceUnavailable",
  "SessionExpired",
  "ConnectionTimeout",
]);

function isDbUnavailableError(err) {
  if (UNAVAILABLE_ERROR_CODES.has(err.code)) return true;
  return /could not perform|failed to connect|connection.*closed|econnrefused|getaddrinfo/i.test(
    err.message || ""
  );
}

// Wraps an async route handler so a rejected promise reaches Express's error
// pipeline via next(err) instead of crashing the process (Express 4 does not
// do this automatically for async handlers).
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: "Not found" });
}

// Must be registered last, after every route. Express recognizes it as an
// error handler because it declares 4 parameters.
export function errorHandler(err, _req, res, _next) {
  if (isDbUnavailableError(err)) {
    res.status(503).json({
      error: "Database unavailable",
      message: "Could not reach CognoDB right now. Please try again shortly.",
    });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error", message: err.message });
}
