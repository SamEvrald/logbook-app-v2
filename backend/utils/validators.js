/**
 * Input Validation & Sanitization Utilities
 * Prevents XSS, SQL injection, and data poisoning
 */

const validator = require('validator');

// Validate and sanitize string inputs
exports.sanitizeString = (input, fieldName, maxLength = 500) => {
  if (!input) return null;
  
  const trimmed = String(input).trim();
  
  if (trimmed.length === 0) return null;
  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
  }
  
  // Remove any HTML/script tags
  return validator.trim(validator.escape(trimmed));
};

// Validate email
exports.validateEmail = (email) => {
  if (!email) throw new Error('Email is required');
  if (!validator.isEmail(email)) {
    throw new Error('Invalid email format');
  }
  return validator.normalizeEmail(email);
};

// Validate username (alphanumeric and underscores only)
exports.validateUsername = (username) => {
  if (!username) throw new Error('Username is required');
  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
    throw new Error('Username must be 3-30 characters, alphanumeric with underscores/hyphens only');
  }
  return username;
};

// Validate password (minimum 8 characters, at least one number, one uppercase, one lowercase)
exports.validatePassword = (password) => {
  if (!password) throw new Error('Password is required');
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    throw new Error('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('Password must contain at least one number');
  }
  return password;
};

// Validate numeric IDs
exports.validateId = (id, fieldName = 'ID') => {
  const numId = parseInt(id);
  if (isNaN(numId) || numId <= 0) {
    throw new Error(`${fieldName} must be a valid positive number`);
  }
  return numId;
};

// Validate date format (YYYY-MM-DD)
exports.validateDate = (dateString) => {
  if (!dateString) throw new Error('Date is required');
  if (!validator.isISO8601(dateString)) {
    throw new Error('Date must be in ISO 8601 format (YYYY-MM-DD)');
  }
  return dateString;
};

// Validate grade (0-100)
exports.validateGrade = (grade) => {
  const numGrade = parseFloat(grade);
  if (isNaN(numGrade) || numGrade < 0 || numGrade > 100) {
    throw new Error('Grade must be a number between 0 and 100');
  }
  return numGrade;
};

// Validate file type (whitelist approach)
exports.validateFileType = (file) => {
  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'application/pdf'
  ];
  
  if (!file) throw new Error('File is required');
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new Error(`File type ${file.mimetype} is not allowed. Allowed: ${ALLOWED_TYPES.join(', ')}`);
  }
  
  // Validate file size (max 50MB)
  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('File size exceeds maximum of 50MB');
  }
  
  return file;
};

// Validate array of files
exports.validateFiles = (files, maxFiles = 5) => {
  if (!files) return [];
  if (!Array.isArray(files)) {
    throw new Error('Files must be an array');
  }
  if (files.length > maxFiles) {
    throw new Error(`Maximum ${maxFiles} files allowed`);
  }
  
  return files.map(file => exports.validateFileType(file));
};

// Sanitize text content (allows basic HTML)
exports.sanitizeContent = (content, maxLength = 5000) => {
  if (!content) return null;
  
  const trimmed = String(content).trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > maxLength) {
    throw new Error(`Content exceeds maximum length of ${maxLength} characters`);
  }
  
  // Escape dangerous characters but keep line breaks
  return validator.escape(trimmed);
};

// Validate Moodle instance ID
exports.validateMoodleInstanceId = (id) => {
  return exports.validateId(id, 'Moodle Instance ID');
};

// Validate course ID
exports.validateCourseId = (id) => {
  return exports.validateId(id, 'Course ID');
};

// Validate assignment ID
exports.validateAssignmentId = (id) => {
  return exports.validateId(id, 'Assignment ID');
};

// Generic object validation
exports.validateRequiredFields = (obj, requiredFields) => {
  const missing = requiredFields.filter(field => !obj[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
};
