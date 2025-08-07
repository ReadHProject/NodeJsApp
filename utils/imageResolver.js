import fs from 'fs';
import path from 'path';

/**
 * Hybrid Image URL Resolver
 * Provides the best available URL for images with fallback support
 */
export class ImageResolver {
  
  /**
   * Get the best available URL for a single image
   * @param {Object|String} imageData - Image data object or URL string
   * @param {String} baseUrl - Base URL for local files (optional)
   * @returns {String} - Best available image URL
   */
  static getImageUrl(imageData, baseUrl = '') {
    // Handle string type (direct URL)
    if (typeof imageData === 'string') {
      return imageData;
    }
    
    // Handle object type
    if (imageData && typeof imageData === 'object') {
      // Priority 1: Cloudinary URL (fastest, most reliable)
      if (imageData.url && imageData.url.includes('cloudinary.com')) {
        return imageData.url;
      }
      
      // Priority 2: Cloudinary URL from alternate fields
      if (imageData.cloudinaryUrl && imageData.cloudinaryUrl.includes('cloudinary.com')) {
        return imageData.cloudinaryUrl;
      }
      
      // Priority 3: Check if local file exists
      if (imageData.localPath) {
        // Handle relative paths properly
        const relativePath = imageData.localPath.startsWith('/') ? imageData.localPath.substring(1) : imageData.localPath;
        const fullLocalPath = path.join(process.cwd(), relativePath);
        if (fs.existsSync(fullLocalPath)) {
          return baseUrl + imageData.localPath;
        }
      }
      
      // Priority 4: General URL field
      if (imageData.url) {
        return imageData.url;
      }
      
      // Priority 5: Try other possible URL fields
      for (const prop of ['secure_url', 'imageUrl', 'src']) {
        if (imageData[prop]) {
          return imageData[prop];
        }
      }
    }
    
    // Return placeholder if nothing found
    return '/placeholder-image.png';
  }
  
  /**
   * Process an array of images and return resolved URLs
   * @param {Array} images - Array of image objects or URLs
   * @param {String} baseUrl - Base URL for local files (optional)
   * @returns {Array} - Array of resolved image URLs
   */
  static getImageUrls(images, baseUrl = '') {
    if (!Array.isArray(images)) {
      return [];
    }
    
    return images.map(img => this.getImageUrl(img, baseUrl));
  }
  
  /**
   * Get product image URLs with fallbacks
   * @param {Object} product - Product object
   * @param {String} baseUrl - Base URL for local files (optional)
   * @returns {Object} - Object with resolved URLs
   */
  static getProductImageUrls(product, baseUrl = '') {
    const result = {
      generalImages: [],
      colorImages: {},
      totalImages: 0
    };
    
    // Process general images
    if (product.images && Array.isArray(product.images)) {
      result.generalImages = this.getImageUrls(product.images, baseUrl);
      result.totalImages += result.generalImages.length;
    }
    
    // Process color images
    if (product.colors && Array.isArray(product.colors)) {
      product.colors.forEach(color => {
        if (color.images && Array.isArray(color.images)) {
          result.colorImages[color.colorId] = {
            colorName: color.colorName,
            colorCode: color.colorCode,
            urls: this.getImageUrls(color.images, baseUrl)
          };
          result.totalImages += color.images.length;
        }
      });
    }
    
    return result;
  }
  
  /**
   * Check image availability status
   * @param {Object|String} imageData - Image data object or URL string
   * @returns {Object} - Availability status
   */
  static checkImageAvailability(imageData) {
    const status = {
      hasCloudinary: false,
      hasLocal: false,
      localExists: false,
      bestUrl: null,
      fallbackUrls: []
    };
    
    if (typeof imageData === 'string') {
      status.bestUrl = imageData;
      status.hasCloudinary = imageData.includes('cloudinary.com');
      return status;
    }
    
    if (imageData && typeof imageData === 'object') {
      // Check Cloudinary availability
      if (imageData.url && imageData.url.includes('cloudinary.com')) {
        status.hasCloudinary = true;
        status.bestUrl = imageData.url;
        status.fallbackUrls.push(imageData.url);
      }
      
      if (imageData.cloudinaryUrl && imageData.cloudinaryUrl.includes('cloudinary.com')) {
        status.hasCloudinary = true;
        if (!status.bestUrl) status.bestUrl = imageData.cloudinaryUrl;
        status.fallbackUrls.push(imageData.cloudinaryUrl);
      }
      
      // Check local file availability
      if (imageData.localPath) {
        status.hasLocal = true;
        const fullLocalPath = path.join(process.cwd(), imageData.localPath);
        status.localExists = fs.existsSync(fullLocalPath);
        
        if (status.localExists) {
          status.fallbackUrls.push(imageData.localPath);
          if (!status.bestUrl) status.bestUrl = imageData.localPath;
        }
      }
      
      // Add other URLs as fallbacks
      if (imageData.url && !imageData.url.includes('cloudinary.com')) {
        status.fallbackUrls.push(imageData.url);
        if (!status.bestUrl) status.bestUrl = imageData.url;
      }
    }
    
    return status;
  }
  
  /**
   * Clean up orphaned local files (files that have successful Cloudinary uploads)
   * @param {Array} images - Array of image objects
   * @returns {Array} - Array of cleanup results
   */
  static async cleanupOrphanedFiles(images) {
    if (!Array.isArray(images)) {
      return [];
    }
    
    const results = [];
    
    for (const image of images) {
      if (image && typeof image === 'object') {
        const hasCloudinary = (image.url && image.url.includes('cloudinary.com')) || 
                             (image.cloudinaryUrl && image.cloudinaryUrl.includes('cloudinary.com'));
        
        const hasLocal = image.localPath && fs.existsSync(path.join(process.cwd(), image.localPath));
        
        // If we have both Cloudinary and local file, optionally remove local file
        if (hasCloudinary && hasLocal && image.storageType === 'hybrid') {
          try {
            fs.unlinkSync(path.join(process.cwd(), image.localPath));
            results.push({
              path: image.localPath,
              status: 'deleted',
              reason: 'cloudinary_available'
            });
          } catch (error) {
            results.push({
              path: image.localPath,
              status: 'error',
              error: error.message
            });
          }
        }
      }
    }
    
    return results;
  }
}

export default ImageResolver;
