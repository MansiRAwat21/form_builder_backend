const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

class FileController {
  // Upload file
  async uploadFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }
      
      const { fieldId } = req.body;
      
      if (!fieldId) {
        return res.status(400).json({
          success: false,
          message: 'fieldId is required'
        });
      }
      
      const fileData = {
        fieldId,
        originalName: req.file.originalname,
        fileName: req.file.filename,
        filePath: `/uploads/${req.file.filename}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      };
      
      res.json({
        success: true,
        message: 'File uploaded successfully',
        data: fileData
      });
    } catch (error) {
      console.error('Upload file error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload file',
        error: error.message
      });
    }
  }
  
  // Serve uploaded file
  async serveFile(req, res) {
    try {
      const { filename } = req.params;
      const filePath = path.join(process.cwd(), 'uploads', filename);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }
      
      // Determine content type based on file extension
      const ext = path.extname(filename).toLowerCase();
      const contentTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      };
      
      const contentType = contentTypes[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      
      // For images, allow inline display
      if (contentType.startsWith('image/')) {
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      } else {
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      }
      
      res.sendFile(filePath);
    } catch (error) {
      console.error('Serve file error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to serve file',
        error: error.message
      });
    }
  }
  
  // Delete uploaded file
  async deleteFile(req, res) {
    try {
      const { filename } = req.params;
      const filePath = path.join(process.cwd(), 'uploads', filename);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }
      
      // Delete the file
      await fs.unlink(filePath);
      
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      console.error('Delete file error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete file',
        error: error.message
      });
    }
  }
  
  // Get file information
  async getFileInfo(req, res) {
    try {
      const { filename } = req.params;
      const filePath = path.join(process.cwd(), 'uploads', filename);
      
      // Check if file exists and get stats
      let stats;
      try {
        stats = await fs.stat(filePath);
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }
      
      const ext = path.extname(filename).toLowerCase();
      const contentTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain'
      };
      
      const fileInfo = {
        filename,
        originalName: filename,
        size: stats.size,
        mimeType: contentTypes[ext] || 'application/octet-stream',
        uploadedAt: stats.birthtime,
        lastModified: stats.mtime,
        isImage: contentTypes[ext]?.startsWith('image/') || false
      };
      
      res.json({
        success: true,
        data: fileInfo
      });
    } catch (error) {
      console.error('Get file info error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get file information',
        error: error.message
      });
    }
  }
  
  // List all uploaded files (admin functionality)
  async listFiles(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      // Read directory contents
      let files;
      try {
        files = await fs.readdir(uploadsDir);
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Failed to read uploads directory'
        });
      }
      
      // Filter out .gitkeep and get file stats
      const fileList = [];
      for (const filename of files) {
        if (filename === '.gitkeep') continue;
        
        const filePath = path.join(uploadsDir, filename);
        try {
          const stats = await fs.stat(filePath);
          const ext = path.extname(filename).toLowerCase();
          
          fileList.push({
            filename,
            size: stats.size,
            uploadedAt: stats.birthtime,
            isImage: ['.jpg', '.jpeg', '.png', '.gif'].includes(ext)
          });
        } catch (error) {
          // Skip files that can't be accessed
          continue;
        }
      }
      
      // Sort by upload date (newest first)
      fileList.sort((a, b) => b.uploadedAt - a.uploadedAt);
      
      // Paginate results
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedFiles = fileList.slice(startIndex, endIndex);
      
      res.json({
        success: true,
        data: {
          files: paginatedFiles,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: fileList.length,
            pages: Math.ceil(fileList.length / limit)
          }
        }
      });
    } catch (error) {
      console.error('List files error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list files',
        error: error.message
      });
    }
  }
  
  // Clean up orphaned files (files not referenced in any submission)
  async cleanupFiles(req, res) {
    try {
      const { Submission } = require('../models');
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      // Get all files in uploads directory
      const files = await fs.readdir(uploadsDir);
      const actualFiles = files.filter(f => f !== '.gitkeep');
      
      // Get all file references from submissions
      const submissions = await Submission.find({}, { files: 1 });
      const referencedFiles = new Set();
      
      submissions.forEach(submission => {
        submission.files.forEach(file => {
          const filename = path.basename(file.filePath);
          referencedFiles.add(filename);
        });
      });
      
      // Find orphaned files
      const orphanedFiles = actualFiles.filter(filename => 
        !referencedFiles.has(filename)
      );
      
      // Delete orphaned files
      const deletedFiles = [];
      for (const filename of orphanedFiles) {
        try {
          await fs.unlink(path.join(uploadsDir, filename));
          deletedFiles.push(filename);
        } catch (error) {
          console.error(`Failed to delete orphaned file ${filename}:`, error);
        }
      }
      
      res.json({
        success: true,
        message: `Cleanup completed. ${deletedFiles.length} orphaned files deleted.`,
        data: {
          totalFiles: actualFiles.length,
          referencedFiles: referencedFiles.size,
          orphanedFiles: orphanedFiles.length,
          deletedFiles
        }
      });
    } catch (error) {
      console.error('Cleanup files error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup files',
        error: error.message
      });
    }
  }
}

module.exports = new FileController();