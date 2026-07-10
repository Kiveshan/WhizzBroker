import jwt from "jsonwebtoken"
import crypto from "crypto"
import { secretKey } from "../config/secrets.js"
import { ROLES } from "../config/roles.js"

// Strict JWT verification. Every request reaching this middleware MUST present a
// valid token (Authorization: Bearer <jwt>, or ?token=<jwt> for download links).
// Public/pre-auth endpoints are NOT handled here — they are mounted ahead of the
// global guard in routes/index.js. There is intentionally no NODE_ENV-based bypass.
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization
  const headerToken = authHeader ? authHeader.split(" ")[1] : null
  const token = headerToken || req.query.token

  if (!token) {
    return res.status(401).json({
      error: "Authentication required",
      message: "No token provided",
      code: "NO_TOKEN",
    })
  }

  try {
    const decoded = jwt.verify(token, secretKey)
    req.user = decoded
    return next()
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expired",
        message: "Your session has expired. Please log in again.",
        code: "TOKEN_EXPIRED",
      })
    } else if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Invalid token",
        message: "Invalid authentication token. Please log in again.",
        code: "INVALID_TOKEN",
      })
    }
    return res.status(401).json({
      error: "Authentication failed",
      message: "Failed to authenticate token. Please log in again.",
      code: "AUTH_FAILED",
    })
  }
}

const verifyAdminAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      message: "You must be logged in to access this resource",
      code: "NO_USER",
    })
  }

  if (req.user.roleid !== ROLES.ADMIN) {
    return res.status(403).json({
      error: "Unauthorized",
      message: "You do not have permission to access this resource",
      code: "INSUFFICIENT_PERMISSIONS",
    })
  }

  return next()
}

// Authenticates the EventBridge/Lambda statement-generation jobs via a shared
// API_SECRET bearer token, falling back to normal JWT auth for UI users.
// Fail-closed: if API_SECRET is not configured, the job path is disabled rather
// than matching an undefined token. Constant-time compare to avoid timing leaks.
const authenticateScheduledJob = (req, res, next) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(" ")[1]
  const apiSecret = process.env.API_SECRET

  if (token && apiSecret) {
    const tokenBuf = Buffer.from(token)
    const secretBuf = Buffer.from(apiSecret)
    if (
      tokenBuf.length === secretBuf.length &&
      crypto.timingSafeEqual(tokenBuf, secretBuf)
    ) {
      req.isScheduledJob = true
      return next()
    }
  }

  // Not the scheduled job — require a normal user JWT.
  req.isScheduledJob = false
  return verifyToken(req, res, next)
}

export { verifyToken, verifyAdminAccess, authenticateScheduledJob }
