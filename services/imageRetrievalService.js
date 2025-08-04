import fs from "fs";
import path from "path";

class ImageRetrievalService {
  /**
   * Get the best available URL for a single image
   * @param {Object|String} imageData - Image data object or string URL
   * @returns {String} - Best available URL
   */
  getImageUrl(imageData) {
    // Handle string URLs (backward compatibility)
    if (typeof imageData === 'string') {
      return imageData;
    }

    // Handle null/undefined
    if (!imageData) {
      return '/placeholder-image.png';
    }

    try {
      // Priority 1: Check if local file exists
      if (imageData.localPath && this.isLocalFileAvailable(imageData.localPath)) {
        return imageData.localPath;
      }

      // Priority 2: Use Cloudinary URL if available
      if (imageData.cloudinaryUrl) {
        return imageData.cloudinaryUrl;
      }

      // Priority 3: Fallback to original URL
      if (imageData.url) {
        return imageData.url;
      }

      // Priority 4: Default placeholder
      return '/placeholder-image.png';
    } catch (error) {
      console.error('Error getting image URL:', error);
      return '/placeholder-image.png';
    }
  }

  /**
   * Check if local file exists
   * @param {String} localPath - Local file path
   * @returns {Boolean} - True if file exists
   */
  isLocalFileAvailable(localPath) {
    try {
      if (!localPath) return false;
      
      // Handle both absolute and relative paths
      let fullPath;
      if (path.isAbsolute(localPath)) {
        fullPath = localPath;
      } else {
        // Remove leading slash for relative paths
        const cleanPath = localPath.startsWith('/') ? localPath.substring(1) : localPath;
        fullPath = path.join(process.cwd(), cleanPath);
      }
      
      return fs.existsSync(fullPath);
    } catch (error) {
      console.error('Error checking file availability:', error);
      return false;
    }
  }

  /**
   * Process array of images and return with resolved URLs
   * @param {Array} images - Array of image data objects
   * @returns {Array} - Array with enhanced image data
   */
  processImageArray(images) {
    if (!Array.isArray(images)) {
      return [];
    }

    return images.map((img, index) => {
      const resolvedUrl = this.getImageUrl(img);
      
      // If it's a string, just return it
      if (typeof img === 'string') {
        return {
          url: img,
          displayUrl: resolvedUrl,
          index: index,
          storageType: 'legacy'
        };
      }

      // Return enhanced object
      return {
        ...img,
        displayUrl: resolvedUrl,
        index: index,
        isLocalAvailable: img.localPath ? this.isLocalFileAvailable(img.localPath) : false,
        isCloudinaryAvailable: Boolean(img.cloudinaryUrl),
        fallbackUrls: [
          img.localPath,
          img.cloudinaryUrl,
          img.url
        ].filter(Boolean)
      };
    });
  }

  /**
   * Process color images for products
   * @param {Array} colors - Array of color objects with images
   * @returns {Array} - Array with processed color images
   */
  processColorImages(colors) {
    if (!Array.isArray(colors)) {
      return [];
    }

    return colors.map(color => ({
      ...color,
      images: this.processColorImageArray(color.images || []),
      imageUrls: (color.images || []).map(img => this.getImageUrl(img))
    }));
  }

  /**
   * Process color image array (handles both string and object formats)
   * @param {Array} images - Array of image paths or objects
   * @returns {Array} - Processed image array
   */
  processColorImageArray(images) {
    if (!Array.isArray(images)) {
      return [];
    }

    return images.map((img, index) => {
      // If it's a string (current format), create an object
      if (typeof img === 'string') {
        const isLocalAvailable = this.isLocalFileAvailable(img);
        return {
          localPath: img,
          url: img,
          displayUrl: img,
          filename: path.basename(img),
          index: index,
          isLocalAvailable: isLocalAvailable,
          storageType: 'local',
          // Future: will be enhanced with cloudinary data
          cloudinaryUrl: null,
          isCloudinaryUploaded: false
        };
      }

      // If it's already an object, process it
      return {
        ...img,
        displayUrl: this.getImageUrl(img),
        index: index,
        isLocalAvailable: img.localPath ? this.isLocalFileAvailable(img.localPath) : false,
        isCloudinaryAvailable: Boolean(img.cloudinaryUrl)
      };
    });
  }

  /**
   * Format product response with enhanced image data
   * @param {Object} product - Product object
   * @returns {Object} - Enhanced product object
   */
  formatProductResponse(product) {
    try {
      const productObj = product.toObject ? product.toObject() : product;

      return {
        ...productObj,
        // Process general product images
        images: this.processImageArray(productObj.images || []),
        
        // Process color images
        colors: this.processColorImages(productObj.colors || []),
        
        // Add quick access URLs for frontend
        imageUrls: (productObj.images || []).map(img => this.getImageUrl(img)),
        
        // Add color image URLs for quick access
        colorImageUrls: (productObj.colors || []).map(color => ({
          colorId: color.colorId,
          colorName: color.colorName,
          urls: (color.images || []).map(img => this.getImageUrl(img))
        })),

        // Add metadata
        imageMetadata: {
          totalImages: (productObj.images || []).length,
          totalColorImages: (productObj.colors || []).reduce((total, color) => 
            total + (color.images || []).length, 0
          ),
          processedAt: new Date()
        }
      };
    } catch (error) {
      console.error('Error formatting product response:', error);
      return product;
    }
  }

  /**
   * Get image statistics for a product
   * @param {Object} product - Product object
   * @returns {Object} - Image statistics
   */
  getImageStats(product) {
    try {
      const productObj = product.toObject ? product.toObject() : product;
      const images = productObj.images || [];
      const colors = productObj.colors || [];

      let totalImages = images.length;
      let localAvailable = 0;
      let cloudinaryAvailable = 0;

      // Count general images
      images.forEach(img => {
        if (typeof img === 'string') {
          if (this.isLocalFileAvailable(img)) localAvailable++;
        } else {
          if (img.localPath && this.isLocalFileAvailable(img.localPath)) localAvailable++;
          if (img.cloudinaryUrl) cloudinaryAvailable++;
        }
      });

      // Count color images
      colors.forEach(color => {
        if (color.images && Array.isArray(color.images)) {
          totalImages += color.images.length;
          color.images.forEach(img => {
            if (typeof img === 'string') {
              if (this.isLocalFileAvailable(img)) localAvailable++;
            } else {
              if (img.localPath && this.isLocalFileAvailable(img.localPath)) localAvailable++;
              if (img.cloudinaryUrl) cloudinaryAvailable++;
            }
          });
        }
      });

      return {
        totalImages,
        localAvailable,
        cloudinaryAvailable,
        hybridImages: Math.min(localAvailable, cloudinaryAvailable),
        availability: totalImages > 0 ? (localAvailable + cloudinaryAvailable) / totalImages : 0
      };
    } catch (error) {
      console.error('Error getting image stats:', error);
      return {
        totalImages: 0,
        localAvailable: 0,
        cloudinaryAvailable: 0,
        hybridImages: 0,
        availability: 0
      };
    }
  }

  /**
   * Validate image data structure
   * @param {Object} imageData - Image data to validate
   * @returns {Object} - Validation result
   */
  validateImageData(imageData) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!imageData) {
      validation.isValid = false;
      validation.errors.push('Image data is null or undefined');
      return validation;
    }

    if (typeof imageData === 'string') {
      if (!this.isLocalFileAvailable(imageData)) {
        validation.warnings.push('Local file not available');
      }
      return validation;
    }

    // Validate object structure
    if (!imageData.url && !imageData.localPath && !imageData.cloudinaryUrl) {
      validation.isValid = false;
      validation.errors.push('No valid URL found (url, localPath, or cloudinaryUrl)');
    }

    if (imageData.localPath && !this.isLocalFileAvailable(imageData.localPath)) {
      validation.warnings.push('Local file not available');
    }

    if (imageData.isCloudinaryUploaded && !imageData.cloudinaryUrl) {
      validation.warnings.push('Marked as Cloudinary uploaded but no URL found');
    }

    return validation;
  }
}

// Export singleton instance
const imageRetrievalService = new ImageRetrievalService();
export default imageRetrievalService;
