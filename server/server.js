import express from "express";
import helmet from "helmet";
import expressSession from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import {
  findUserByEmail,
  comparePassword,
  findUserById,
} from "./models/userModel.js";
import { requestLogger } from "./middleware/sessionDebug.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { secretKey } from "./config/secrets.js";
import routes from "./routes/index.js";
import fs from "fs";
import multer from "multer";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers. CSP is disabled because the deployed server serves the CRA
// build, which inlines its runtime chunk; cross-origin resource policy is
// relaxed so the dev client on :3000 can load /uploads images.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Enhanced CORS configuration
app.use((req, res, next) => {
  const allowedOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Cache-Control"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Expose-Headers", "Authorization");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// Middleware

app.use(requestLogger);
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const sessionConfig = {
  secret: secretKey,
  resave: false,
  saveUninitialized: false,
  proxy: true, // Trust the reverse proxy (if using one)
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  },
  name: "whizzaway.sid", // Custom session cookie name
};

// In production, trust the first proxy
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
  sessionConfig.cookie.secure = true;
}

app.use(expressSession(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// Set up uploads directory and static serving
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// Set up multer for file uploads (though we'll override this in S3 routes)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// Passport Local Strategy for Authentication
passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await findUserByEmail(email);
        if (!user) {
          return done(null, false, { message: "Invalid email or password" });
        }
        const passwordMatch = await comparePassword(password, user.password);
        if (!passwordMatch) {
          return done(null, false, { message: "Invalid email or password" });
        }
        return done(null, user);
      } catch (err) {
        console.error("Error during authentication:", err);
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, {
    userid: user.userid,
    name: user.name,
    surname: user.surname,
    roleid: user.roleid,
    table: user.table,
    email: user.email,
  });
});

passport.deserializeUser(async (sessionUser, done) => {
  try {
    const { userid, table } = sessionUser;
    const user = await findUserById(userid, table);
    if (!user) {
      return done(null, false);
    }
    done(null, user);
  } catch (err) {
    console.error("Error deserializing user:", err);
    done(err);
  }
});

// Lightweight health check (no DB) — point an uptime pinger here to keep the
// instance warm and avoid cold-start latency on the first login after idle.
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

// Static SPA assets + client-side routing MUST be handled before the API
// router. The API router mounts a global verifyToken guard (routes/index.js),
// which answers every non-public request with a 401 JSON body. If the SPA were
// served after it, browser navigations (including the root URL) would be
// rejected with {"code":"NO_TOKEN"} instead of receiving the React shell.
if (process.env.NODE_ENV == "deployed") {
  const buildDir = path.join(__dirname, "public", "build");

  // Serve built assets (index.html at "/", /static/*, favicon, manifest…).
  app.use(express.static(buildDir));

  // SPA history fallback: browser navigations (Accept: text/html) — the root
  // URL and client-side deep links like /Dashboard — get index.html so React
  // Router can take over. XHR/API requests (axios sends Accept:
  // application/json, not text/html) fall through to the API router below.
  app.get("*", (req, res, next) => {
    if (req.headers.accept && req.headers.accept.includes("text/html")) {
      return res.sendFile(path.join(buildDir, "index.html"));
    }
    next();
  });
}

// API routes (contains the global authentication guard).
app.use("/", routes);

app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
