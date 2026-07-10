import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

// JWT signing secret. MUST be set via the JWT_SECRET environment variable in
// production — a stable secret is required so tokens survive restarts and so
// multiple instances can verify each other's tokens.
const isProduction =
  process.env.NODE_ENV === "production" || process.env.NODE_ENV === "deployed";

let secretKey = process.env.JWT_SECRET;

if (!secretKey) {
  if (isProduction) {
    throw new Error(
      "JWT_SECRET environment variable is not set. Refusing to start in production without a stable signing secret."
    );
  }
  // Dev-only fallback: ephemeral secret, regenerated each restart (logs everyone out).
  secretKey = crypto.randomBytes(64).toString("hex");
  console.warn(
    "WARNING: JWT_SECRET not set — using an ephemeral dev secret. All tokens will be invalidated on restart."
  );
}

export { secretKey };
