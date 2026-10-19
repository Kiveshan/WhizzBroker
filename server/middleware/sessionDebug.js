// verifyToken (middleware/auth.js) also accepts the JWT as a ?token= query
// parameter, so redact it before the URL reaches the logs.
const redactToken = (url) => url.replace(/([?&]token=)[^&]*/gi, "$1[REDACTED]");

const requestLogger = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${redactToken(req.url)}`);
  next();
};

export { requestLogger };
