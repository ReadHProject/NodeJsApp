/**
 * Image Utilities for Cloudinary Integration
 * Provides helper functions for image management with Cloudinary as the primary storage
 */
import { getDataUri } from "./feature.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Uploads a single file to Cloudinary
 * @param {Object} file - Multer file object
 * @param {Object} options - Options for upload
 * @returns {Promise<Object>} - Upload result
 */
export const uploadFileToCloudinary = async (file, options = {}) => {
  try {
    console.log('🔄 Uploading file to Cloudinary:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      hasBuffer: !!file.buffer,
      hasPath: !!file.path,
      path: file.path
    });
    
    const fileDataUri = getDataUri(file);
    console.log('✅ Successfully generated data URI for file:', file.originalname);
    
    // Default options
    const uploadOptions = {
      folder: options.folder || "ecommerce/products",
      resource_type: "image",
      quality: options.quality || "auto:good",
      fetch_format: "auto",
      transformation: options.transformation || [
        { width: 1200, height: 1200, crop: "limit" },
        { quality: "auto:good" }
      ],
      ...options
    };
    
    console.log('🚀 Starting Cloudinary upload with options:', uploadOptions);
    
    // Upload to Cloudinary
    const result = await uploadToCloudinary(fileDataUri.content, uploadOptions);
    
    if (result.success) {
      console.log('✅ Cloudinary upload successful:', {
        public_id: result.data.public_id,
        url: result.data.url,
        size: result.data.bytes
      });
    } else {
      console.error('❌ Cloudinary upload failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error("❌ Error uploading to Cloudinary:", {
      message: error.message,
      stack: error.stack,
      fileInfo: {
        fieldname: file?.fieldname,
        originalname: file?.originalname,
        hasBuffer: !!file?.buffer,
        hasPath: !!file?.path
      }
    });
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Uploads multiple files to Cloudinary
 * @param {Array} files - Array of Multer file objects
 * @param {Object} options - Options for upload
 * @returns {Promise<Array>} - Array of upload results
 */
export const uploadMultipleToCloudinaryWithProgress = async (files, options = {}) => {
  try {
    const results = [];
    let processedFiles = 0;
    const totalFiles = files.length;
    
    for (const file of files) {
      processedFiles++;
      console.log(`Uploading file ${processedFiles}/${totalFiles}...`);
      
      const uploadResult = await uploadFileToCloudinary(file, {
        ...options,
        public_id: options.public_id ? `${options.public_id}_${processedFiles}` : undefined
      });
      
      results.push(uploadResult);
    }
    
    return results;
  } catch (error) {
    console.error("Error uploading multiple files to Cloudinary:", error);
    return files.map(() => ({ 
      success: false, 
      error: error.message 
    }));
  }
};

/**
 * Formats Cloudinary image results for database storage with hybrid support
 * @param {Array} uploadResults - Cloudinary upload results
 * @param {Array} originalFiles - Original file objects from multer (optional)
 * @returns {Array} - Formatted image objects for DB
 */
export const formatCloudinaryResultsForDB = (uploadResults, originalFiles = []) => {
  return uploadResults
    .filter(result => result.success)
    .map((result, index) => {
      const originalFile = originalFiles[index];
      
      return {
        // Cloudinary data (primary)
        public_id: result.data.public_id,
        url: result.data.url,
        width: result.data.width,
        height: result.data.height,
        format: result.data.format,
        resource_type: result.data.resource_type,
        created_at: result.data.created_at,
        bytes: result.data.bytes,
        folder: result.data.folder,
        version: result.data.version,
        
        // Hybrid storage fields
        localPath: originalFile?.filename ? `/uploads/products/${originalFile.filename}` : null,
        cloudinaryUrl: result.data.url,
        filename: originalFile?.filename || null,
        originalName: originalFile?.originalname || null,
        uploadedAt: new Date(),
        isCloudinaryUploaded: true,
        storageType: 'hybrid', // Both local and cloudinary
        cloudinaryUploadedAt: new Date(),
        
        // Enhanced metadata
        metadata: {
          size: originalFile?.size || result.data.bytes || null,
          mimetype: originalFile?.mimetype || null,
          width: result.data.width || null,
          height: result.data.height || null,
          format: result.data.format || null,
          destination: originalFile?.destination || null
        },
        
        migrationStatus: 'not_required'
      };
    });
};

/**
 * Extract URLs from Cloudinary upload results
 * @param {Array} uploadResults - Cloudinary upload results
 * @returns {Array} - Array of image URLs
 */
export const extractUrlsFromCloudinaryResults = (uploadResults) => {
  return uploadResults
    .filter(result => result.success)
    .map(result => result.data.url);
};

/**
 * Get the best available URL for an image
 * @param {Object|String} imageData - Image data or URL
 * @returns {String} - Best available URL
 */
export const getBestImageUrl = (imageData) => {
  // Handle string type (direct URL)
  if (typeof imageData === 'string') {
    return imageData;
  }
  
  // Handle object type
  if (imageData && typeof imageData === 'object') {
    // First try Cloudinary URL (preferred)
    if (imageData.url && imageData.url.includes('cloudinary.com')) {
      return imageData.url;
    }
    
    // Then try general URL
    if (imageData.url) {
      return imageData.url;
    }
    
    // Finally try any other properties that might contain a URL
    for (const prop of ['secure_url', 'cloudinaryUrl', 'imageUrl', 'src']) {
      if (imageData[prop]) {
        return imageData[prop];
      }
    }
  }
  
  // Fallback to placeholder
  return null;
};

/**
 * Check if an image uses Cloudinary
 * @param {Object|String} imageData - Image data or URL
 * @returns {Boolean} - True if it's a Cloudinary image
 */
export const isCloudinaryImage = (imageData) => {
  if (typeof imageData === 'string') {
    return imageData.includes('cloudinary.com');
  }
  
  if (imageData && typeof imageData === 'object') {
    return (
      (imageData.url && imageData.url.includes('cloudinary.com')) ||
      (imageData.public_id && imageData.public_id.includes('/')) ||
      !!imageData.cloudinaryUrl
    );
  }
  
  return false;
};

/**
 * Generate Cloudinary folder path for product
 * @param {Object} product - Product object
 * @param {String} colorName - Optional color name
 * @returns {String} - Folder path
 */
export const generateProductImageFolder = (product, colorName = null) => {
  const categoryName = product.categoryName || 'uncategorized';
  const productId = product._id ? product._id.toString() : Date.now().toString();
  
  if (colorName) {
    return `ecommerce/products/${categoryName}/${productId}/${colorName}`;
  }
  return `ecommerce/products/${categoryName}/${productId}`;
};

/**
 * Clean up local file if it exists
 * @param {String} localPath - Path to local file
 * @returns {Boolean} - True if file was deleted
 */
export const cleanupLocalFile = (localPath) => {
  try {
    if (!localPath) return false;
    
    // Handle both absolute and relative paths
    const filePath = localPath.startsWith('/') 
      ? path.join(process.cwd(), localPath)
      : localPath;
      
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error cleaning up local file:', error);
    return false;
  }
};

/**
 * Delete images from Cloudinary
 * @param {Array} images - Array of image objects with public_id
 * @returns {Promise<Array>} - Array of delete results
 */
export const deleteImagesFromCloudinary = async (images) => {
  const results = [];
  
  for (const image of images) {
    if (!image) continue;
    
    const publicId = image.public_id || 
                    (typeof image === 'object' ? image.public_id : null);
    
    if (publicId) {
      try {
        const result = await deleteFromCloudinary(publicId);
        results.push({
          publicId,
          success: result.success,
          result: result.data
        });
      } catch (error) {
        results.push({
          publicId,
          success: false,
          error: error.message
        });
      }
    }
  }
  
  return results;
};

export default {
  uploadFileToCloudinary,
  uploadMultipleToCloudinaryWithProgress,
  formatCloudinaryResultsForDB,
  extractUrlsFromCloudinaryResults,
  getBestImageUrl,
  isCloudinaryImage,
  generateProductImageFolder,
  cleanupLocalFile,
  deleteImagesFromCloudinary
};
