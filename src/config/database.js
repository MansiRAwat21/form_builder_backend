const mongoose = require('mongoose');

// Database connection configuration
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/formbuilder';
    
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      w: 'majority'
    };
    
    // Connect to MongoDB
    const conn = await mongoose.connect(mongoURI, options);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('📴 MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        console.error('Error closing MongoDB connection:', error);
        process.exit(1);
      }
    });
    
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Get database connection status
const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  return {
    status: states[mongoose.connection.readyState],
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name
  };
};

// Health check function
const healthCheck = async () => {
  try {
    const status = getConnectionStatus();
    
    if (status.status !== 'connected') {
      return {
        healthy: false,
        status: status.status,
        message: 'Database not connected'
      };
    }
    
    // Test database operation
    await mongoose.connection.db.admin().ping();
    
    return {
      healthy: true,
      status: status.status,
      host: status.host,
      database: status.name,
      message: 'Database connection healthy'
    };
  } catch (error) {
    return {
      healthy: false,
      status: 'error',
      message: error.message
    };
  }
};

// Create database indexes
const createIndexes = async () => {
  try {
    console.log('📊 Creating database indexes...');
    
    // You can add custom index creation here
    // Example:
    // await mongoose.connection.collection('forms').createIndex({ userId: 1, status: 1 });
    // await mongoose.connection.collection('submissions').createIndex({ formId: 1, submittedAt: -1 });
    
    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  }
};

// Drop database (for testing/development)
const dropDatabase = async () => {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot drop database in production environment');
    }
    
    await mongoose.connection.dropDatabase();
    console.log('🗑️ Database dropped successfully');
  } catch (error) {
    console.error('❌ Error dropping database:', error);
    throw error;
  }
};

// Seed initial data (for development)
const seedData = async () => {
  try {
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️ Skipping seed data in production environment');
      return;
    }
    
    const { User, Form } = require('../models');
    
    // Check if data already exists
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('📝 Data already exists, skipping seed');
      return;
    }
    
    console.log('🌱 Seeding initial data...');
    
    // Create admin user
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@formbuilder.com',
      password: 'admin123',
      role: 'admin'
    });
    await adminUser.save();
    
    // Create sample form
    const sampleForm = new Form({
      userId: adminUser._id,
      title: 'Sample Contact Form',
      description: 'A sample contact form to get you started',
      status: 'published',
      fields: [
        {
          id: 'name',
          type: 'text',
          label: 'Full Name',
          required: true,
          placeholder: 'Enter your full name'
        },
        {
          id: 'email',
          type: 'email',
          label: 'Email Address',
          required: true,
          placeholder: 'your@email.com'
        },
        {
          id: 'message',
          type: 'textarea',
          label: 'Message',
          required: true,
          placeholder: 'Your message here...'
        }
      ]
    });
    await sampleForm.save();
    
    console.log('✅ Initial data seeded successfully');
    console.log('👤 Admin user created: admin@formbuilder.com / admin123');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  }
};

module.exports = {
  connectDB,
  getConnectionStatus,
  healthCheck,
  createIndexes,
  dropDatabase,
  seedData
};