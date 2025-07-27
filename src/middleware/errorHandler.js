// Global error handling middleware

// 404 handler - should be placed before error handler
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Global error handler - should be last middleware
const errorHandler = (err, req, res, next) => {
  // Set default error status
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    message = 'Validation failed';
    const errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message,
      value: error.value
    }));
    
    return res.status(statusCode).json({
      success: false,
      message,
      errors
    });
  }
  
  if (err.name === 'CastError') {
    // Mongoose cast error (invalid ObjectId)
    statusCode = 400;
    message = 'Invalid ID format';
  }
  
  if (err.code === 11000) {
    // MongoDB duplicate key error
    statusCode = 400;
    message = 'Duplicate field value';
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
  }
  
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }
  
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON format';
  }
  
  if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request entity too large';
  }
  
  // CORS error
  if (err.message && err.message.includes('CORS')) {
    statusCode = 403;
    message = 'Not allowed by CORS policy';
  }
  
  // Create error response
  const errorResponse = {
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err
    })
  };
  
  // Log error (except for common 4xx errors)
  if (statusCode >= 500 || process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }
  
  res.status(statusCode).json(errorResponse);
};

// Async error handler wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Helper function to create and throw errors
const createError = (message, statusCode = 500) => {
  throw new AppError(message, statusCode);
};

// Unhandled promise rejection handler
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Close server gracefully
    process.exit(1);
  });
};

// Uncaught exception handler
const handleUncaughtException = () => {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Close server gracefully
    process.exit(1);
  });
};

// Graceful shutdown handler
const handleGracefulShutdown = (server) => {
  const gracefulShutdown = (signal) => {
    console.log(`${signal} received. Starting graceful shutdown...`);
    
    server.close((err) => {
      if (err) {
        console.error('Error during server close:', err);
        process.exit(1);
      }
      
      console.log('Server closed. Exiting process...');
      process.exit(0);
    });
    
    // Force close after 30 seconds
    setTimeout(() => {
      console.error('Forcing shutdown after timeout');
      process.exit(1);
    }, 30000);
  };
  
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

module.exports = {
  notFound,
  errorHandler,
  asyncHandler,
  AppError,
  createError,
  handleUnhandledRejection,
  handleUncaughtException,
  handleGracefulShutdown
};