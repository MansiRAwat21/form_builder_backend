require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');

const { database } = require('./src/config');
const routes = require('./src/routes');
const { validation, errorHandler, fileUpload } = require('./src/middleware');

// Initialize express app
const app = express();

// Trust proxy (for deployment behind reverse proxy)
app.set('trust proxy', 1);

// Basic middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// CORS configuration
app.use(validation.configureCors());

// Security middleware
app.use(validation.securityHeaders);
app.use(validation.requestLogger);

// Rate limiting
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', validation.createRateLimit(15 * 60 * 1000, 100)); // General API limit
  app.use('/api/users/login', validation.createRateLimit(15 * 60 * 1000, 5)); // Login limit
  app.use('/api/upload', validation.createRateLimit(60 * 1000, 10)); // Upload limit
  app.use('/api/forms/*/submit', validation.createRateLimit(60 * 1000, 20)); // Submit limit
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(validation.sanitizeInput);

// File upload error handling
app.use(fileUpload.handleUploadError);

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Form Builder API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    documentation: '/api',
    health: '/api/health'
  });
});

// Health check endpoint with database status
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();
    const uptime = process.uptime();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptime),
        human: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
      },
      memory: {
        used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
        unit: 'MB'
      },
      database: dbHealth,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
    
    if (!dbHealth.healthy) {
      health.status = 'unhealthy';
      return res.status(503).json(health);
    }
    
    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Static file serving for uploads
app.use('/uploads', express.static('uploads', {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// 404 handler
app.use(errorHandler.notFound);

// Global error handler
app.use(errorHandler.errorHandler);

// Handle unhandled promise rejections and uncaught exceptions
errorHandler.handleUnhandledRejection();
errorHandler.handleUncaughtException();

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await database.connectDB();
    
    // Create database indexes
    await database.createIndexes();
    
    // Seed initial data (development only)
    if (process.env.NODE_ENV === 'development') {
      await database.seedData();
    }
    
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API available at: http://localhost:${PORT}/api`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
    
    // Handle graceful shutdown
    errorHandler.handleGracefulShutdown(server);
    
    return server;
  } catch (error) {
    console.error(' Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };