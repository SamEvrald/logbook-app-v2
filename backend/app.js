const dotenv = require("dotenv");
dotenv.config();

// Validate environment variables at startup
const validateEnv = require("./utils/envValidator");
try {
  validateEnv();
} catch (error) {
  console.error("❌ Environment validation failed:", error.message);
  process.exit(1);
}

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const bodyParser = require("body-parser");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const entryRoutes = require("./routes/entryRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");
const moodleRoutes = require("./routes/moodleRoutes");

// Security utilities
const { authLimiter, generalLimiter, submissionLimiter } = require("./utils/rateLimiter");
const { auditMiddleware } = require("./middleware/auditMiddleware");

const app = express();

// ============ SECURITY MIDDLEWARE ============

// Rate limiting on authentication endpoints
app.use("/api/auth", authLimiter);
app.use("/api/auth/teacher-login", authLimiter);

// CORS with environment-based origin (not hardcoded)
const corsOrigin = process.env.CORS_ORIGIN || "https://logbook.human-study.org";
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body size limits to prevent DoS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// General rate limiting on API endpoints
app.use("/api/", generalLimiter);

// Audit logging middleware
app.use("/api/", auditMiddleware);

// ============ ROUTES ============
app.use("/api/auth", authRoutes);
app.use("/api/entries", submissionLimiter, entryRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/moodle", moodleRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.send("🚀 Logbook API is live and running!");
});

console.log("🔍 Using DB user:", process.env.DB_USER);
console.log("✅ CORS origin:", corsOrigin);

// ============ GLOBAL ERROR HANDLER ============
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);
  
  // Don't expose sensitive error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    message: isDevelopment ? err.message : "Internal Server Error",
    error: isDevelopment ? err : {}
  });
});

// ============ SERVER STARTUP ============
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📌 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
