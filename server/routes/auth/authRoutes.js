import express from "express";
import rateLimit from "express-rate-limit";
import {
  login,
  logout,
  getUserInfo,
  getUserRole,
  checkEmail,
  register,
} from "../../controllers/auth/authController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

// Brute-force protection on the pre-auth endpoints. Successful logins don't
// count against the limit, so legitimate users are unaffected.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many attempts",
    message: "Too many attempts from this address. Please try again in 15 minutes.",
    code: "RATE_LIMITED",
  },
});

router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.get("/user-info", verifyToken, getUserInfo);
router.get("/api/user-role", verifyToken, getUserRole);
router.get("/check-email", authLimiter, checkEmail);
router.post("/register", authLimiter, register);

export default router;
