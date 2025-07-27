const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    
    // Sanitize filename
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${uniqueSuffix}-${sanitizedBaseName}${ext}`;
    
    cb(null, filename);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = process.env.ALLOWED_FILE_TYPES ? 
    process.env.ALLOWED_FILE_TYPES.split(',') : 
    [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    files: 1 // Single file upload
  }
});

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: `File size too large. Maximum size is ${(parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024) / (1024 * 1024)}MB`
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Only one file allowed per upload'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected field name for file upload'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'File upload error',
          error: error.message
        });
    }
  }
  
  if (error.message.includes('File type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

// Helper function to delete file
const deleteFile = async (filename) => {
  try {
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Helper function to get file info
const getFileInfo = async (filename) => {
  try {
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return {
        filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        path: filePath
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting file info:', error);
    return null;
  }
};

// Helper function to validate file exists
const fileExists = (filename) => {
  try {
    const filePath = path.join(uploadDir, filename);
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
};

// Clean old files (files older than specified days)
const cleanOldFiles = async (daysOld = 30) => {
  try {
    const files = fs.readdirSync(uploadDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    let deletedCount = 0;
    
    for (const filename of files) {
      if (filename === '.gitkeep') continue;
      
      const filePath = path.join(uploadDir, filename);
      const stats = fs.statSync(filePath);
      
      if (stats.birthtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
    
    return deletedCount;
  } catch (error) {
    console.error('Error cleaning old files:', error);
    return 0;
  }
};

module.exports = upload;
module.exports.handleUploadError = handleUploadError;
module.exports.deleteFile = deleteFile;
module.exports.getFileInfo = getFileInfo;
module.exports.fileExists = fileExists;
module.exports.cleanOldFiles = cleanOldFiles;