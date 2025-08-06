/**
 * Image Helper Utilities
 * Handles backward compatibility between local file paths and Cloudinary URLs
 */

/**
 * Get the display URL for an image
 * Handles backward compatibility for different image storage formats
 * @param {Object|String} imageData - Image data object or string URL
 * @param {String} baseUrl - Base URL for local files (optional)
 * @returns {String} - Display URL for the image
 */
export const getImageDisplayUrl = (imageData, baseUrl = '') => {
  // Handle string URLs (legacy format)
  if (typeof imageData === 'string') {
    // If it's already a full URL (starts with http), return as is
    if (imageData.startsWith('http')) {
      return imageData;
    }
    // If it's a local path, prepend base URL
    return baseUrl ? `${baseUrl}/${imageData}` : imageData;
  }

  // Handle object format (new enhanced format)
  if (typeof imageData === 'object' && imageData !== null) {
    // Priority order: Cloudinary URL > Legacy URL > Local Path
    if (imageData.cloudinaryUrl) {
      return imageData.cloudinaryUrl;
    }
    if (imageData.url && imageData.url.startsWith('http')) {
      return imageData.url;
    }
    if (imageData.url) {
      return baseUrl ? `${baseUrl}/${imageData.url}` : imageData.url;
    }
    if (imageData.localPath) {
      return baseUrl ? `${baseUrl}/${imageData.localPath}` : imageData.localPath;
    }
  }

  // Fallback
  return null;
};

/**
 * Check if an image is stored in Cloudinary
 * @param {Object|String} imageData - Image data object or string URL
 * @returns {Boolean} - True if image is in Cloudinary
 */
export const isCloudinaryImage = (imageData) => {
  if (typeof imageData === 'string') {
    return imageData.includes('cloudinary.com') || imageData.includes('res.cloudinary.com');
  }
  
  if (typeof imageData === 'object' && imageData !== null) {
    return imageData.isCloudinaryUploaded === true || 
           imageData.storageType === 'cloudinary' ||
           (imageData.cloudinaryUrl && imageData.cloudinaryUrl.includes('cloudinary.com'));
  }
  
  return false;
};

/**
 * Format image data for API response
 * Ensures consistent format for frontend consumption
 * @param {Array} images - Array of image data
 * @param {String} baseUrl - Base URL for local files
 * @returns {Array} - Formatted image array
 */
export const formatImagesForResponse = (images = [], baseUrl = '') => {
  return images.map((image, index) => {
    const displayUrl = getImageDisplayUrl(image, baseUrl);
    
    return {
      url: displayUrl,
      isCloudinary: isCloudinaryImage(image),
      index,
      // Include metadata if available
      ...(typeof image === 'object' && image !== null ? {
        public_id: image.public_id || null,
        storageType: image.storageType || 'unknown',
        uploadedAt: image.uploadedAt || null,
        metadata: image.metadata || {}
      } : {})
    };
  });
};

/**
 * Create image object for storing in database
 * @param {String} url - Image URL (local path or Cloudinary URL)
 * @param {Object} options - Additional options
 * @returns {Object} - Image object for database storage
 */
export const createImageObject = (url, options = {}) => {
  const isCloudinary = url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
  
  return {
    url: isCloudinary ? null : url, // Legacy field
    cloudinaryUrl: isCloudinary ? url : null,
    localPath: isCloudinary ? null : url,
    public_id: options.public_id || null,
    filename: options.filename || null,
    originalName: options.originalName || null,
    uploadedAt: new Date(),
    isCloudinaryUploaded: isCloudinary,
    storageType: isCloudinary ? 'cloudinary' : 'local',
    cloudinaryUploadedAt: isCloudinary ? new Date() : null,
    metadata: {
      size: options.size || null,
      mimetype: options.mimetype || null,
      productId: options.productId || null,
      colorId: options.colorId || null,
      index: options.index || null,
      width: options.width || null,
      height: options.height || null,
      format: options.format || null
    },
    migrationStatus: 'not_required'
  };
};

/**
 * Migrate legacy image data to new format
 * @param {Array} legacyImages - Array of legacy image strings/objects
 * @param {Object} options - Migration options
 * @returns {Array} - Array of new format image objects
 */
export const migrateLegacyImages = (legacyImages = [], options = {}) => {
  return legacyImages.map((image, index) => {
    if (typeof image === 'string') {
      return createImageObject(image, { 
        ...options, 
        index,
        migrationStatus: 'completed' 
      });
    }
    
    // If already in new format, just ensure migration status
    if (typeof image === 'object' && image !== null) {
      return {
        ...image,
        migrationStatus: image.migrationStatus || 'completed'
      };
    }
    
    return image;
  });
};

/**
 * Get all URLs from images array for backward compatibility
 * @param {Array} images - Array of image objects
 * @param {String} baseUrl - Base URL for local files
 * @returns {Array} - Array of URL strings
 */
export const extractImageUrls = (images = [], baseUrl = '') => {
  return images.map(image => getImageDisplayUrl(image, baseUrl)).filter(Boolean);
};
