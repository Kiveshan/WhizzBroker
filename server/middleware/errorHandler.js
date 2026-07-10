// Central Express error handler. Controllers can throw (or call next(err))
// instead of hand-rolling res.status(500) blocks; this also catches
// body-parser/multer errors that previously fell through to Express's default
// HTML error page.
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.url} failed:`, err);

  // Don't leak internals on unexpected errors in production.
  const isProduction =
    process.env.NODE_ENV === "production" || process.env.NODE_ENV === "deployed";
  const message =
    status >= 500 && isProduction ? "Internal server error" : err.message;

  res.status(status).json({
    error: status >= 500 ? "Internal server error" : "Request failed",
    message,
    code: err.code || "INTERNAL_ERROR",
  });
};

// JSON 404 for unmatched routes (only reachable outside deployed mode, where
// the SPA catch-all serves index.html first).
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: "Not found",
    message: `No route matches ${req.method} ${req.url}`,
    code: "NOT_FOUND",
  });
};

export { errorHandler, notFoundHandler };
