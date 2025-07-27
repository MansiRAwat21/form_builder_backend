const crypto = require('crypto');
const path = require('path');

// Generate unique ID
const generateId = (length = 8) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate unique filename
const generateFilename = (originalName) => {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  
  // Sanitize base name
  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  return `${timestamp}-${random}-${sanitizedBaseName}${ext}`;
};

// Format file size
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Parse file size string (e.g., '5mb' -> 5242880)
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

// Generate slug from string
const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim('-'); // Remove leading/trailing hyphens
};

// Deep clone object
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

// Remove undefined and null values from object
const cleanObject = (obj) => {
  const cleaned = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        const cleanedValue = cleanObject(value);
        if (Object.keys(cleanedValue).length > 0) {
          cleaned[key] = cleanedValue;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }
  
  return cleaned;
};

// Pagination helper
const paginate = (data, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const paginatedData = data.slice(offset, offset + limit);
  
  return {
    data: paginatedData,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: data.length,
      pages: Math.ceil(data.length / limit),
      hasNext: offset + limit < data.length,
      hasPrev: page > 1
    }
  };
};

// Sort array by field
const sortBy = (array, field, order = 'asc') => {
  return array.sort((a, b) => {
    const aVal = getNestedValue(a, field);
    const bVal = getNestedValue(b, field);
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

// Get nested object value by dot notation
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

// Set nested object value by dot notation
const setNestedValue = (obj, path, value) => {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    return current[key];
  }, obj);
  
  target[lastKey] = value;
  return obj;
};

// Debounce function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function
const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Retry function with exponential backoff
const retry = async (fn, options = {}) => {
  const { attempts = 3, delay = 1000, backoff = 2 } = options;
  
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === attempts - 1) throw error;
      
      const waitTime = delay * Math.pow(backoff, i);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

// Generate hash
const generateHash = (data, algorithm = 'sha256') => {
  return crypto.createHash(algorithm).update(data).digest('hex');
};

// Generate random string
const generateRandomString = (length = 32, charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate URL format
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Format date
const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  const d = new Date(date);
  
  const formats = {
    'YYYY': d.getFullYear(),
    'MM': String(d.getMonth() + 1).padStart(2, '0'),
    'DD': String(d.getDate()).padStart(2, '0'),
    'HH': String(d.getHours()).padStart(2, '0'),
    'mm': String(d.getMinutes()).padStart(2, '0'),
    'ss': String(d.getSeconds()).padStart(2, '0')
  };
  
  return format.replace(/YYYY|MM|DD|HH|mm|ss/g, match => formats[match]);
};

// Calculate time difference
const timeDifference = (start, end = new Date()) => {
  const diff = new Date(end) - new Date(start);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  return {
    milliseconds: diff,
    seconds,
    minutes,
    hours,
    days,
    human: days > 0 ? `${days}d ${hours % 24}h` : 
            hours > 0 ? `${hours}h ${minutes % 60}m` : 
            minutes > 0 ? `${minutes}m ${seconds % 60}s` : 
            `${seconds}s`
  };
};

// Mask sensitive data
const maskSensitiveData = (data, fields = ['password', 'token', 'secret']) => {
  const masked = deepClone(data);
  
  const maskValue = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    for (const key in obj) {
      if (fields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        obj[key] = '*'.repeat(8);
      } else if (typeof obj[key] === 'object') {
        maskValue(obj[key]);
      }
    }
  };
  
  maskValue(masked);
  return masked;
};

// Create API response
const createResponse = (success, message, data = null, errors = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString()
  };
  
  if (data !== null) response.data = data;
  if (errors !== null) response.errors = errors;
  
  return response;
};

// Create success response
const successResponse = (message, data = null) => {
  return createResponse(true, message, data);
};

// Create error response
const errorResponse = (message, errors = null) => {
  return createResponse(false, message, null, errors);
};

module.exports = {
  generateId,
  generateFilename,
  formatBytes,
  parseSize,
  generateSlug,
  deepClone,
  cleanObject,
  paginate,
  sortBy,
  getNestedValue,
  setNestedValue,
  debounce,
  throttle,
  retry,
  generateHash,
  generateRandomString,
  isValidEmail,
  isValidUrl,
  formatDate,
  timeDifference,
  maskSensitiveData,
  createResponse,
  successResponse,
  errorResponse
};