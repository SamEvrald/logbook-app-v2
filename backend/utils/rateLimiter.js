/**
 * Rate Limiter Middleware
 * Prevents brute force attacks on authentication endpoints
 */

const rateLimit = require('express-rate-limit');

// Authentication rate limiter (strict)
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req, res) => {
    // Skip for non-login endpoints (allow OPTIONS requests)
    return req.method === 'OPTIONS';
  },
  handler: (req, res) => {
    console.warn(`⚠️ Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      message: 'Too many login attempts, please try again later',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// General API rate limiter (moderate)
exports.generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per minute
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Submission rate limiter (prevent spam submissions)
exports.submissionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit to 10 submissions per minute per IP
  message: 'Too many submissions, please wait before trying again',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    return req.method === 'OPTIONS';
  }
});

module.exports = exports;
