// Application constants

// Field types
const FIELD_TYPES = {
  TEXT: 'text',
  EMAIL: 'email',
  TEXTAREA: 'textarea',
  SELECT: 'select',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  FILE: 'file'
};

// Form statuses
const FORM_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published'
};

// User roles
const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin'
};

// File upload constants
const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  UPLOAD_DIR: './uploads'
};

// API response messages
const MESSAGES = {
  SUCCESS: {
    FORM_CREATED: 'Form created successfully',
    FORM_UPDATED: 'Form updated successfully',
    FORM_DELETED: 'Form deleted successfully',
    FORM_PUBLISHED: 'Form published successfully',
    FORM_UNPUBLISHED: 'Form unpublished successfully',
    FORM_DUPLICATED: 'Form duplicated successfully',
    FORM_SUBMITTED: 'Form submitted successfully',
    SUBMISSION_DELETED: 'Submission deleted successfully',
    FILE_UPLOADED: 'File uploaded successfully',
    FILE_DELETED: 'File deleted successfully',
    USER_REGISTERED: 'User registered successfully',
    USER_LOGGED_IN: 'Login successful',
    PROFILE_UPDATED: 'Profile updated successfully',
    PASSWORD_CHANGED: 'Password changed successfully',
    ACCOUNT_DELETED: 'Account deleted successfully'
  },
  ERROR: {
    FORM_NOT_FOUND: 'Form not found',
    FORM_NOT_PUBLISHED: 'Form not found or not published',
    SUBMISSION_NOT_FOUND: 'Submission not found',
    FILE_NOT_FOUND: 'File not found',
    USER_NOT_FOUND: 'User not found',
    INVALID_CREDENTIALS: 'Invalid email or password',
    ACCESS_DENIED: 'Access denied',
    VALIDATION_FAILED: 'Validation failed',
    UPLOAD_FAILED: 'File upload failed',
    SUBMISSION_LIMIT_REACHED: 'Submission limit reached for this form',
    FORM_CANNOT_PUBLISH: 'Cannot publish form without fields',
    EMAIL_ALREADY_EXISTS: 'User with this email already exists',
    ACCOUNT_DEACTIVATED: 'Account is deactivated',
    INVALID_TOKEN: 'Invalid token',
    TOKEN_EXPIRED: 'Token expired',
    UNAUTHORIZED: 'Authentication required',
    FORBIDDEN: 'Insufficient permissions',
    TOO_MANY_REQUESTS: 'Too many requests, please try again later',
    REQUEST_TOO_LARGE: 'Request entity too large',
    INTERNAL_ERROR: 'Internal server error'
  }
};

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
};

// Rate limiting configuration
const RATE_LIMITS = {
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // requests per window
  },
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 // login attempts per window
  },
  UPLOAD: {
    windowMs: 60 * 1000, // 1 minute
    max: 10 // uploads per minute
  },
  SUBMIT: {
    windowMs: 60 * 1000, // 1 minute
    max: 20 // form submissions per minute
  }
};

// JWT configuration
const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET || 'your-secret-key',
  EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  ALGORITHM: 'HS256'
};

// Email configuration (disabled - data stored in DB only)
const EMAIL_CONFIG = {
  ENABLED: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
  FROM_NAME: 'Form Builder',
  FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@formbuilder.com',
  TEMPLATES: {
    FORM_SUBMISSION: 'form-submission',
    WELCOME: 'welcome',
    PASSWORD_RESET: 'password-reset'
  }
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

// Database configuration
const DATABASE = {
  CONNECTION_TIMEOUT: 5000,
  SOCKET_TIMEOUT: 45000,
  MAX_POOL_SIZE: 10
};

// Application environment
const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test'
};

// CORS configuration
const CORS_CONFIG = {
  METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  ALLOWED_HEADERS: ['Content-Type', 'Authorization'],
  CREDENTIALS: true,
  MAX_AGE: 86400 // 24 hours
};

module.exports = {
  FIELD_TYPES,
  FORM_STATUS,
  USER_ROLES,
  FILE_UPLOAD,
  MESSAGES,
  HTTP_STATUS,
  RATE_LIMITS,
  JWT_CONFIG,
  EMAIL_CONFIG,
  PAGINATION,
  DATABASE,
  ENVIRONMENT,
  CORS_CONFIG
};