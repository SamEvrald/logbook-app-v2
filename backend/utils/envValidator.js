/**
 * Environment Variable Validator
 * Ensures all required environment variables are present and valid
 */

function validateEnv() {
  const required = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET',
    'PORT',
    'CLOUDINARY_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
  ];

  const optional = [
    'NODE_ENV',
    'CORS_ORIGIN'
  ];

  const missing = [];
  const invalid = [];

  // Check required variables
  required.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });

  // Validate specific formats
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    invalid.push('JWT_SECRET must be at least 32 characters long');
  }

  if (process.env.DB_HOST && !process.env.DB_HOST.match(/^[a-zA-Z0-9.-]+$/)) {
    invalid.push('DB_HOST contains invalid characters');
  }

  if (process.env.PORT && isNaN(parseInt(process.env.PORT))) {
    invalid.push('PORT must be a valid number');
  }

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    throw new Error('Environment validation failed: missing required variables');
  }

  if (invalid.length > 0) {
    console.error('❌ Invalid environment variable values:');
    invalid.forEach(msg => console.error(`   - ${msg}`));
    throw new Error('Environment validation failed: invalid values');
  }

  console.log('✅ Environment variables validated successfully');
  return true;
}

module.exports = validateEnv;
