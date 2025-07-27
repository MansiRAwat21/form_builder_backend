const { validationResult } = require('express-validator');

// Validation error handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.param || error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

// Sanitize input data
const sanitizeInput = (req, res, next) => {
  // Basic XSS prevention
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  };
  
  const sanitizeObject = (obj) => {
    if (obj === null || typeof obj !== 'object') {
      return typeof obj === 'string' ? sanitizeString(obj) : obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  };
  
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

// Rate limiting helper
const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: 'Too many requests, please try again later',
      resetTime: new Date(Date.now() + windowMs)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later',
        resetTime: new Date(Date.now() + windowMs)
      });
    }
  });
};

// Request size limiter
const requestSizeLimit = (limit = '10mb') => {
  return (req, res, next) => {
    if (req.headers['content-length']) {
      const size = parseInt(req.headers['content-length']);
      const maxSize = parseSize(limit);
      
      if (size > maxSize) {
        return res.status(413).json({
          success: false,
          message: `Request too large. Maximum size is ${limit}`,
          receivedSize: formatBytes(size),
          maxSize: limit
        });
      }
    }
    next();
  };
};

// Helper function to parse size strings like '10mb'
const parseSize = (size) => {
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };
  
  const match = size.toString().toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)?$/);
  if (!match) return 0;
  
  const [, num, unit = 'b'] = match;
  return parseFloat(num) * units[unit];
};

// Helper function to format bytes
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// CORS configuration
const configureCors = () => {
  const cors = require('cors');
  
  const corsOptions = {
    origin: (origin, callback) => {
      const allowedOrigins = process.env.CORS_ORIGIN ? 
        process.env.CORS_ORIGIN.split(',') : 
        ['http://localhost:3000', 'http://localhost:3001'];
      
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // 24 hours
  };
  
  return cors(corsOptions);
};

// Security headers
const securityHeaders = (req, res, next) => {
  // Remove potentially sensitive headers
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

// Request logging
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString()
    };
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(JSON.stringify(logData, null, 2));
    }
  });
  
  next();
};

module.exports = {
  handleValidationErrors,
  sanitizeInput,
  createRateLimit,
  requestSizeLimit,
  configureCors,
  securityHeaders,
  requestLogger,
  parseSize,
  formatBytes
};