import cloudinary from "cloudinary";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDataUri } from "../utils/feature.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class HybridImageService {
  constructor() {
    this.uploadQueue = [];
    this.isProcessing = false;
  }

  /**
   * Process a single file for hybrid storage
   * @param {Object} file - Multer file object
   * @param {Object} options - Additional options like productId, colorId, etc.
   * @returns {Object} - Image data with both local and cloudinary info
   */
  async processHybridUpload(file, options = {}) {
    try {
      // Create the enhanced image object with both local and cloudinary info
      const imageData = {
        // Keep existing structure for backward compatibility
        public_id: file.filename, // Use filename as public_id initially
        url: `/uploads/products/${file.filename}`, // Local path as primary URL
        
        // New hybrid storage fields
        localPath: `/uploads/products/${file.filename}`,
        cloudinaryUrl: null, // Will be updated after cloudinary upload
        filename: file.filename,
        originalName: file.originalname,
        uploadedAt: new Date(),
        isCloudinaryUploaded: false,
        storageType: 'local',
        metadata: {
          size: file.size,
          mimetype: file.mimetype,
          ...options
        }
      };

      // Add to background upload queue
      this.addToCloudinaryQueue(file, imageData);

      return imageData;
    } catch (error) {
      console.error('Error processing hybrid upload:', error);
      throw error;
    }
  }

  /**
   * Process multiple files for hybrid storage
   * @param {Array} files - Array of multer file objects
   * @param {Object} options - Additional options
   * @returns {Array} - Array of image data objects
   */
  async processMultipleHybridUploads(files, options = {}) {
    try {
      const results = [];
      
      for (const file of files) {
        const imageData = await this.processHybridUpload(file, {
          ...options,
          index: results.length
        });
        results.push(imageData);
      }

      return results;
    } catch (error) {
      console.error('Error processing multiple hybrid uploads:', error);
      throw error;
    }
  }

  /**
   * Add file to Cloudinary upload queue for background processing
   * @param {Object} file - Multer file object
   * @param {Object} imageData - Image data object to update
   */
  addToCloudinaryQueue(file, imageData) {
    this.uploadQueue.push({ file, imageData });
    
    // Process queue if not already processing
    if (!this.isProcessing) {
      setImmediate(() => this.processCloudinaryQueue());
    }
  }

  /**
   * Process Cloudinary upload queue in background
   */
  async processCloudinaryQueue() {
    if (this.isProcessing || this.uploadQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.uploadQueue.length > 0) {
      const { file, imageData } = this.uploadQueue.shift();
      
      try {
        await this.uploadToCloudinary(file, imageData);
      } catch (error) {
        console.error('Background Cloudinary upload failed:', error);
        // Continue processing other files even if one fails
      }
    }

    this.isProcessing = false;
  }

  /**
   * Upload file to Cloudinary and update database
   * @param {Object} file - Multer file object
   * @param {Object} imageData - Image data object to update
   */
  async uploadToCloudinary(file, imageData) {
    try {
      // Get file data URI for cloudinary upload
      const fileDataUri = getDataUri(file);
      
      // Upload to Cloudinary
      const cloudinaryResult = await cloudinary.v2.uploader.upload(fileDataUri.content, {
        folder: 'ecommerce-products',
        resource_type: 'auto',
        public_id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });

      // Update the image data with Cloudinary info
      const updatedData = {
        cloudinaryUrl: cloudinaryResult.secure_url,
        public_id: cloudinaryResult.public_id,
        isCloudinaryUploaded: true,
        storageType: 'hybrid',
        cloudinaryUploadedAt: new Date()
      };

      // Update in database - we'll need to find and update the specific image
      await this.updateImageInDatabase(imageData, updatedData);

      console.log(`✅ Cloudinary upload successful for: ${imageData.filename}`);
      
      return updatedData;
    } catch (error) {
      console.error(`❌ Cloudinary upload failed for: ${imageData.filename}`, error);
      throw error;
    }
  }

  /**
   * Update image data in database (this will be implemented based on your models)
   * @param {Object} originalImageData - Original image data
   * @param {Object} cloudinaryData - Updated cloudinary data
   */
  async updateImageInDatabase(originalImageData, cloudinaryData) {
    try {
      // Import your models here to avoid circular dependencies
      const { default: productModel } = await import('../models/productModel.js');
      
      // Update products with this image
      await productModel.updateMany(
        {
          $or: [
            { 'images.filename': originalImageData.filename },
            { 'colors.images': originalImageData.localPath }
          ]
        },
        {
          $set: {
            'images.$[elem].cloudinaryUrl': cloudinaryData.cloudinaryUrl,
            'images.$[elem].public_id': cloudinaryData.public_id,
            'images.$[elem].isCloudinaryUploaded': cloudinaryData.isCloudinaryUploaded,
            'images.$[elem].storageType': cloudinaryData.storageType,
            'images.$[elem].cloudinaryUploadedAt': cloudinaryData.cloudinaryUploadedAt
          }
        },
        {
          arrayFilters: [{ 'elem.filename': originalImageData.filename }]
        }
      );

      console.log(`✅ Database updated for image: ${originalImageData.filename}`);
    } catch (error) {
      console.error('Error updating image in database:', error);
    }
  }

  /**
   * Get the best available URL for an image
   * @param {Object} imageData - Image data object
   * @returns {String} - Best available URL
   */
  getImageUrl(imageData) {
    // If it's a string (old format), return as is
    if (typeof imageData === 'string') {
      return imageData;
    }

    // Check if local file exists
    const localPath = path.join(process.cwd(), imageData.localPath || '');
    if (fs.existsSync(localPath)) {
      return imageData.localPath;
    }

    // Fallback to Cloudinary if available
    if (imageData.cloudinaryUrl) {
      return imageData.cloudinaryUrl;
    }

    // Fallback to original URL
    return imageData.url || '/placeholder-image.png';
  }

  /**
   * Batch process image URLs for API response
   * @param {Array} images - Array of image objects
   * @returns {Array} - Array with resolved URLs
   */
  processImageUrls(images) {
    if (!Array.isArray(images)) {
      return [];
    }

    return images.map(img => {
      if (typeof img === 'string') {
        return img;
      }

      return {
        ...img,
        displayUrl: this.getImageUrl(img),
        fallbackUrls: [
          img.localPath,
          img.cloudinaryUrl,
          img.url
        ].filter(Boolean)
      };
    });
  }

  /**
   * Check if local file exists
   * @param {String} localPath - Local file path
   * @returns {Boolean} - True if file exists
   */
  isLocalFileAvailable(localPath) {
    try {
      if (!localPath) return false;
      const fullPath = path.join(process.cwd(), localPath);
      return fs.existsSync(fullPath);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get upload statistics
   * @returns {Object} - Upload statistics
   */
  getStats() {
    return {
      queueLength: this.uploadQueue.length,
      isProcessing: this.isProcessing,
      timestamp: new Date()
    };
  }
}

// Export singleton instance
const hybridImageService = new HybridImageService();
export default hybridImageService;
