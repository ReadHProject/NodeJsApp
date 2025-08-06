import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

/**
 * Upload image to Cloudinary
 * @param {String} filePath - Local file path or base64 string
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Upload result
 */
export const uploadToCloudinary = async (filePath, options = {}) => {
  try {
    const uploadOptions = {
      folder: options.folder || "ecommerce/products",
      resource_type: "image",
      quality: options.quality || "auto:good",
      fetch_format: "auto",
      transformation: options.transformation || [],
      ...options,
    };

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);

    return {
      success: true,
      data: {
        public_id: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        created_at: result.created_at,
        resource_type: result.resource_type,
        folder: result.folder,
        version: result.version,
      },
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Delete image from Cloudinary
 * @param {String} publicId - Cloudinary public ID
 * @returns {Promise<Object>} - Deletion result
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Upload multiple images to Cloudinary
 * @param {Array} filePaths - Array of file paths
 * @param {Object} options - Upload options
 * @returns {Promise<Array>} - Array of upload results
 */
export const uploadMultipleToCloudinary = async (filePaths, options = {}) => {
  const uploadPromises = filePaths.map((filePath, index) =>
    uploadToCloudinary(filePath, {
      ...options,
      public_id: options.public_id
        ? `${options.public_id}_${index}`
        : undefined,
    })
  );

  try {
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error("Multiple upload error:", error);
    return filePaths.map(() => ({ success: false, error: error.message }));
  }
};

/**
 * Generate optimized image URL
 * @param {String} publicId - Cloudinary public ID
 * @param {Object} transformations - Image transformations
 * @returns {String} - Optimized image URL
 */
export const getOptimizedImageUrl = (publicId, transformations = {}) => {
  const defaultTransformations = {
    quality: "auto",
    fetch_format: "auto",
    ...transformations,
  };

  return cloudinary.url(publicId, defaultTransformations);
};

/**
 * Generate thumbnail URL
 * @param {String} publicId - Cloudinary public ID
 * @param {Object} options - Thumbnail options
 * @returns {String} - Thumbnail URL
 */
export const getThumbnailUrl = (publicId, options = {}) => {
  const thumbnailOptions = {
    width: options.width || 300,
    height: options.height || 300,
    crop: options.crop || "fill",
    quality: "auto",
    fetch_format: "auto",
    ...options,
  };

  return cloudinary.url(publicId, thumbnailOptions);
};

/**
 * Check if Cloudinary is properly configured
 * @returns {Boolean} - True if configured
 */
export const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_SECRET
  );
};

export default cloudinary;
