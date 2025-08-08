import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import cloudinary from "cloudinary";
import { getDataUri } from "../utils/feature.js";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";
import {
  uploadFileToCloudinary,
  uploadMultipleToCloudinaryWithProgress,
  formatCloudinaryResultsForDB,
  extractUrlsFromCloudinaryResults,
  generateProductImageFolder,
  cleanupLocalFile,
  deleteImagesFromCloudinary,
} from "../utils/imageUtils.js";
import {
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//GET ALL PRODUCTS
export const getAllProductsController = async (req, res) => {
  try {
    const { keyword, category } = req.query;
    const products = await productModel
      .find({
        name: {
          $regex: keyword ? keyword : "",
          $options: "i",
        },
        // category: category ? category : undefined,
      })
      .populate("category");
    return res.status(200).json({
      success: true,
      message: "All Products Fetched Successfully",
      totalProducts: products.length,
      products,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: `Error in Get All Products API: ${console.log(error)}`,
    });
  }
};

//GET TOP PRODUCT
export const getTopProductsController = async (req, res) => {
  try {
    const products = await productModel.find({}).sort({ rating: -1 }).limit(3);
    return res.status(200).json({
      success: true,
      message: "Top 3 Products Fetched Successfully",
      totalProducts: products.length,
      products,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: `Error in Get Top Products API: ${console.log(error)}`,
    });
  }
};

//GET SINGLE PRODUCT
export const getSingleProductController = async (req, res) => {
  try {
    //Get Product id
    const product = await productModel.findById(req.params.id);

    //VALIDATION
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Single Product Fetched Successfully",
      product,
    });
  } catch (error) {
    console.log(error);
    //Cast Error || Object Id
    if (error.name === "CastError") {
      return res.status(500).json({
        success: false,
        message: `Invalid Id`,
      });
    }

    return res.status(500).json({
      success: false,
      message: `Error in Get Single Product API: ${console.log(error)}`,
      error,
    });
  }
};

//CREATE PRODUCT
// export const createProductController = async (req, res) => {
//   try {
//     const { name, description, price, category, stock } = req.body;

//     //VALIDATION
//     // if (!name || !description || !price || !category || !stock) {
//     //   return res.status(500).json({
//     //     success: false,
//     //     message: "Please provide all fields",
//     //   });
//     // }

//     // console.log(req.file);
//     if (!req.file) {
//       return res.status(500).json({
//         success: false,
//         message: "Please provide product images",
//       });
//     }

//     //GET FILE FROM CLIENT
//     const file = getDataUri(req.file);

//     //UPLOAD FILE TO CLOUDINARY
//     const cdb = await cloudinary.v2.uploader.upload(file.content);

//     //CREATE PRODUCT
//     const image = {
//       public_id: cdb.public_id,
//       url: cdb.secure_url,
//     };

//     //CREATE PRODUCT
//     const product = await productModel.create({
//       name,
//       description,
//       price,
//       category,
//       stock,
//       images: [image],
//     });
//     return res.status(201).json({
//       success: true,
//       message: "Product Created Successfully",
//       product,
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({
//       success: false,
//       message: `Error in Create Product API: ${console.log(error)}`,
//       error,
//     });
//   }
// };

export const createProductController = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      stock,
      category,
      subcategory,
      subSubcategory,
      colors,
      isFeatured,
      isTrending,
      isPopular,
      tags,
      brand,
      shippingInformation,
      returnPolicy,
      warranty,
      sku,
      availabilityStatus,
      minimumOrderQuantity,
    } = req.body;

    if (!name || !description || !price || !stock || !category || !colors) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const categoryDoc = await categoryModel.findById(category);
    if (!categoryDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    const clothingCategories = [
      "clothing",
      "clothes",
      "shoes",
      "accessories",
      "fashion",
      "apparel",
    ];
    const isClothing = clothingCategories.includes(
      categoryDoc.category.toLowerCase()
    );

    const parsedColors = JSON.parse(colors || "[]");
    const uploadedFiles = req.files || [];

    console.log(
      `🔄 Processing ${uploadedFiles.length} uploaded files with Cloudinary...`
    );

    // Process color images with Cloudinary
    const colorImages = await Promise.all(
      parsedColors.map(async (color) => {
        const matchedFiles = uploadedFiles.filter(
          (f) => f.fieldname === color.colorId
        );

        if (matchedFiles.length < 1) {
          throw new Error(
            `Color ${color.colorName} must have at least 1 uploaded image`
          );
        }

        if (isClothing && (!color.sizes || color.sizes.length < 1)) {
          throw new Error(
            `For clothing, color ${color.colorName} must have at least one size with price and stock`
          );
        }

        // Upload matched files to Cloudinary
        const folder = `ecommerce/products/${categoryDoc.category}/${color.colorName}`;
        const cloudinaryResults = await uploadMultipleToCloudinaryWithProgress(
          matchedFiles,
          {
            folder,
            public_id: `${color.colorId}_${Date.now()}`,
            quality: "auto:good",
            fetch_format: "auto",
          }
        );

        // Extract URLs from successful uploads
        const images = extractUrlsFromCloudinaryResults(cloudinaryResults);

        if (images.length === 0) {
          throw new Error(
            `Failed to upload images for color ${color.colorName}`
          );
        }

        return {
          colorId: color.colorId,
          colorName: color.colorName,
          colorCode: color.colorCode,
          images, // Array of Cloudinary URLs
          sizes: isClothing ? color.sizes : [],
        };
      })
    );

    // Process general images with Cloudinary
    const generalFiles = uploadedFiles.filter(
      (f) => f.fieldname === "generalImage"
    );

    let generalImages = [];
    if (generalFiles.length > 0) {
      // Upload general images to Cloudinary
      const folder = `ecommerce/products/${categoryDoc.category}/general`;
      const cloudinaryResults = await uploadMultipleToCloudinaryWithProgress(
        generalFiles,
        {
          folder,
          public_id: `general_${Date.now()}`,
          quality: "auto:good",
          fetch_format: "auto",
        }
      );

      // Format Cloudinary results for database storage with original file info
      generalImages = formatCloudinaryResultsForDB(cloudinaryResults, generalFiles);
    }

    const product = await productModel.create({
      name,
      description,
      price,
      stock,
      category,
      subcategory: subcategory || "",
      subSubcategory: subSubcategory || "",
      images: generalImages,
      colors: colorImages,
      isFeatured: isFeatured === "true",
      isTrending: isTrending === "true",
      isPopular: isPopular === "true",
      tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
      brand,
      shippingInformation,
      returnPolicy,
      warrantyInformation: warranty,
      sku,
      availabilityStatus,
      minimumOrderQuantity,
      categoryName: categoryDoc.category,
    });

    return res.status(201).json({
      success: true,
      message: "Product Created Successfully",
      product,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: err.message || "Something went wrong",
    });
  }
};

//UPDATE PRODUCT
export const updateProductController = async (req, res) => {
  try {
    //FIND PRODUCT
    const product = await productModel.findById(req.params.id);

    //VALIDATION
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product Not Found",
      });
    }

    //UPDATE PRODUCT
    const {
      name,
      description,
      price,
      category,
      stock,
      subcategory,
      subSubcategory,
      isFeatured,
      isTrending,
      isPopular,
      tags,
      brand,
      shippingInformation,
      returnPolicy,
      warranty,
      sku,
      availabilityStatus,
      minimumOrderQuantity,
    } = req.body;

    const categoryDoc = await categoryModel.findById(category);
    if (!categoryDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    const categoryName = categoryDoc.category?.toLowerCase() || "";
    const clothingCategories = [
      "clothing",
      "clothes",
      "shoes",
      "accessories",
      "fashion",
      "apparel",
    ];
    const isClothing = clothingCategories.includes(categoryName);

    // Add subcategory if it doesn't exist
    if (subcategory) {
      const existingSubcategory = categoryDoc.subcategories.find(
        (subcat) => subcat.name === subcategory
      );
      if (!existingSubcategory) {
        categoryDoc.subcategories.push({
          name: subcategory,
          subSubCategories: [],
        });
        await categoryDoc.save();
      }

      // Add sub-subcategory if it doesn't exist
      if (subcategory && subSubcategory) {
        const subcatIndex = categoryDoc.subcategories.findIndex(
          (subcat) => subcat.name === subcategory
        );
        if (subcatIndex !== -1) {
          const existingSubSubcategory = categoryDoc.subcategories[
            subcatIndex
          ].subSubCategories.find((subSubcat) => {
            const name =
              typeof subSubcat === "string" ? subSubcat : subSubcat.name;
            return name === subSubcategory;
          });
          if (!existingSubSubcategory) {
            categoryDoc.subcategories[subcatIndex].subSubCategories.push({
              name: subSubcategory,
            });
            await categoryDoc.save();
          }
        }
      }
    }

    //VALIDATION AND UPDATE
    if (name) product.name = name;
    if (description) product.description = description;
    if (price) product.price = price;
    if (category) product.category = category;
    if (stock) product.stock = stock;
    if (subcategory !== undefined) product.subcategory = subcategory;
    if (subSubcategory !== undefined) product.subSubcategory = subSubcategory;
    if (isFeatured !== undefined) product.isFeatured = isFeatured;
    if (isTrending !== undefined) product.isTrending = isTrending;
    if (isPopular !== undefined) product.isPopular = isPopular;
    if (tags)
      product.tags = Array.isArray(tags)
        ? tags
        : tags.split(",").map((tag) => tag.trim());
    if (brand) product.brand = brand;
    if (shippingInformation) product.shippingInformation = shippingInformation;
    if (returnPolicy) product.returnPolicy = returnPolicy;
    if (warranty) product.warrantyInformation = warranty;
    if (sku) product.sku = sku;
    if (availabilityStatus) product.availabilityStatus = availabilityStatus;
    if (minimumOrderQuantity)
      product.minimumOrderQuantity = minimumOrderQuantity;

    // SET categoryName for validation logic
    product.categoryName = categoryName;

    if (!isClothing) {
      product.colors.forEach((color) => {
        color.sizes = [];
      });
    }

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product Updated Successfully",
      product,
    });
  } catch (error) {
    console.log(error);
    //Cast Error || Object Id
    if (error.name === "CastError") {
      return res.status(500).json({
        success: false,
        message: `Invalid Id`,
      });
    }
    return res.status(500).json({
      success: false,
      message: `Error in Update Product API: ${console.log(error)}`,
      error,
    });
  }
};

//UPDATE PRODUCT IMAGE
export const updateProductImageController = async (req, res) => {
  try {
    console.log('🔄 updateProductImageController called');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Request files count:', req.files ? req.files.length : 0);
    console.log('Product ID:', req.params.id);
    
    const { colors, subcategory, subSubcategory, multipleImagesMetadata } = req.body;
    console.log('Raw colors from req.body:', colors);
    console.log('Colors type:', typeof colors);

    const product = await productModel.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product Not Found" });
    }
    console.log('Product found:', product._id);

    // Update subcategory if provided (handle array or string)
    if (subcategory !== undefined) {
      // If subcategory is an array, take the first element, otherwise use as-is
      product.subcategory = Array.isArray(subcategory) ? subcategory[0] : subcategory;
    }

    let parsedColors = [];
    if (colors) {
      try {
        parsedColors = typeof colors === "string" ? JSON.parse(colors) : (Array.isArray(colors) ? colors : []);
        console.log(
          "Parsed Colors from request:",
          JSON.stringify(parsedColors, null, 2)
        );
      } catch (err) {
        console.error('Error parsing colors:', err);
        return res
          .status(400)
          .json({ success: false, message: `Invalid colors JSON: ${err.message}` });
      }
    } else {
      console.log('No colors provided in request');
    }

    // ✅ Prevent duplicate colors in incoming data
    const colorIds = parsedColors.map((c) => c.colorId);
    const hasDuplicates = colorIds.some(
      (id, idx) => colorIds.indexOf(id) !== idx
    );
    if (hasDuplicates) {
      return res.status(400).json({
        success: false,
        message:
          "Duplicate color detected. Please ensure each color is unique.",
      });
    }

    const uploadedFiles = req.files || [];

    // ✅ Update General Image with Cloudinary
    const generalFile = uploadedFiles.find(
      (f) => f.fieldname === "generalImage"
    );
    if (generalFile) {
      // Get category information for folder structure
      const categoryDoc = await categoryModel.findById(product.category);
      const categoryName = categoryDoc ? categoryDoc.category : (product.categoryName || 'general');
      
      // Upload to Cloudinary
      const folder = `ecommerce/products/${categoryName}/general`;
      const cloudinaryResult = await uploadFileToCloudinary(generalFile, {
        folder,
        public_id: `general_${Date.now()}`,
        quality: "auto:good",
        fetch_format: "auto",
      });

      if (cloudinaryResult.success) {
        // Delete old general images from Cloudinary if they exist
        if (product.images && product.images.length > 0) {
          await deleteImagesFromCloudinary(product.images);
        }

        // Pass original file info for hybrid storage
        product.images = formatCloudinaryResultsForDB([cloudinaryResult], [generalFile]);
      } else {
        throw new Error(
          `Failed to upload general image: ${cloudinaryResult.error}`
        );
      }
    }

    const existingColorsMap = {};
    product.colors.forEach((c) => {
      existingColorsMap[c.colorId] = c;
    });

    // Only process colors that are explicitly being updated
    const colorsToUpdate = parsedColors.length > 0 ? parsedColors : [];
    
    if (colorsToUpdate.length === 0) {
      console.log('No colors provided for update, skipping color processing');
    } else {
      console.log('Processing colors for update:', colorsToUpdate.map(c => c.colorId));
    }

    const updatedColorsMap = {};
    
    // Process only the colors that are being updated
    await Promise.all(
      colorsToUpdate.map(async (incomingColor) => {
        const existing = existingColorsMap[incomingColor.colorId];
        console.log(`Processing color ${incomingColor.colorId}, existing:`, !!existing);

        const matchedFiles = uploadedFiles.filter(
          (f) => f.fieldname === incomingColor.colorId
        );
        console.log(`Found ${matchedFiles.length} files for color ${incomingColor.colorId}`);

        let updatedImages = existing ? [...existing.images] : [];
        let updatedHybridImages = existing ? [...(existing.hybridImages || [])] : [];

        if (matchedFiles.length > 0) {
          // Get category information for folder structure
          const categoryDoc = await categoryModel.findById(product.category);
          const categoryName = categoryDoc ? categoryDoc.category : (product.categoryName || 'general');
          
          // Check if this is a clothing category
          const clothingCategories = [
            "clothing",
            "clothes",
            "shoes",
            "accessories",
            "fashion",
            "apparel",
          ];
          const isClothing = clothingCategories.includes(categoryName.toLowerCase());
          
          // Upload new color images to Cloudinary
          const folder = `ecommerce/products/${categoryName}/${incomingColor.colorName}`;
          const cloudinaryResults =
            await uploadMultipleToCloudinaryWithProgress(matchedFiles, {
              folder,
              public_id: `${incomingColor.colorId}_${Date.now()}`,
              quality: "auto:good",
              fetch_format: "auto",
            });

          if (isClothing) {
            // For clothing categories: use hybrid storage format
            const formattedColorImages = formatCloudinaryResultsForDB(
              cloudinaryResults, 
              matchedFiles
            );
            
            // Enrich with color-specific metadata
            const enrichedColorImages = formattedColorImages.map((img, index) => ({
              ...img,
              metadata: {
                ...img.metadata,
                productId: product._id.toString(),
                colorId: incomingColor.colorId,
                colorName: incomingColor.colorName,
                index: index
              }
            }));
            
            // Store in hybridImages array
            updatedHybridImages = [...updatedHybridImages, ...enrichedColorImages];
            
            // Extract URLs for backward compatibility with existing frontend
            const newImageUrls = extractUrlsFromCloudinaryResults(cloudinaryResults);
            if (newImageUrls.length > 0) {
              updatedImages = [...updatedImages, ...newImageUrls];
            }
          } else {
            // For non-clothing categories: just extract URLs (legacy behavior)
            const newImageUrls = extractUrlsFromCloudinaryResults(cloudinaryResults);
            if (newImageUrls.length > 0) {
              updatedImages = [...updatedImages, ...newImageUrls];
            }
          }
        }

        // Ensure sizes properly carry over discount values
        const updatedSizes =
          incomingColor.sizes?.length > 0
            ? incomingColor.sizes.map((size) => {
                console.log(`Size ${size.size} data:`, {
                  price: size.price,
                  discountper: size.discountper,
                  discountprice: size.discountprice,
                });

                return {
                  size: size.size,
                  price: Number(size.price) || 0,
                  stock: Number(size.stock) || 0,
                  discountper: size.discountper || "0",
                  discountprice: Number(size.discountprice) || 0,
                };
              })
            : existing?.sizes || [];

        const updatedColor = {
          colorId: incomingColor.colorId,
          colorName: incomingColor.colorName || existing?.colorName || "",
          colorCode:
            incomingColor.colorCode || existing?.colorCode || "#000000",
          images: updatedImages,
          hybridImages: updatedHybridImages,
          sizes: updatedSizes,
        };
        
        updatedColorsMap[incomingColor.colorId] = updatedColor;
        console.log(`Updated color ${incomingColor.colorId}:`, {
          imagesCount: updatedImages.length,
          hybridImagesCount: updatedHybridImages.length,
          sizesCount: updatedSizes.length
        });
      })
    );

    // Merge updated colors with existing colors
    const finalColorsList = product.colors.map(existingColor => {
      if (updatedColorsMap[existingColor.colorId]) {
        // Use the updated version
        return updatedColorsMap[existingColor.colorId];
      } else {
        // Keep the existing color unchanged
        return existingColor;
      }
    });
    
    // Add any completely new colors that weren't in the original product
    Object.values(updatedColorsMap).forEach(updatedColor => {
      const exists = finalColorsList.some(color => color.colorId === updatedColor.colorId);
      if (!exists) {
        finalColorsList.push(updatedColor);
      }
    });

    product.colors = finalColorsList;
    console.log('Final colors list:', finalColorsList.map(c => ({ colorId: c.colorId, imagesCount: c.images?.length || 0 })));

    // ✅ Handle multiple images for non-clothing categories
    const multipleImageFiles = uploadedFiles.filter(
      (f) => f.fieldname === "multipleImages"
    );
    
    if (multipleImageFiles.length > 0) {
      console.log(`🔄 Processing ${multipleImageFiles.length} multiple images...`);
      
      // Get category information for folder structure
      const categoryDoc = await categoryModel.findById(product.category);
      const categoryName = categoryDoc ? categoryDoc.category : (product.categoryName || 'general');
      
      // Upload multiple images to Cloudinary
      const folder = `ecommerce/products/${categoryName}/multiple`;
      const cloudinaryResults = await uploadMultipleToCloudinaryWithProgress(
        multipleImageFiles,
        {
          folder,
          public_id: `multiple_${Date.now()}`,
          quality: "auto:good",
          fetch_format: "auto",
        }
      );
      
      // Format Cloudinary results for database storage with original file info
      const formattedMultipleImages = formatCloudinaryResultsForDB(
        cloudinaryResults, 
        multipleImageFiles
      );
      
      // Parse metadata from frontend if provided
      let parsedMetadata = [];
      try {
        parsedMetadata = multipleImagesMetadata ? JSON.parse(multipleImagesMetadata) : [];
      } catch (err) {
        console.log("Warning: Could not parse multipleImagesMetadata:", err.message);
      }
      
      // Merge with parsed metadata from frontend
      const enrichedMultipleImages = formattedMultipleImages.map((img, index) => {
        const frontendMetadata = parsedMetadata[index] || {};
        return {
          ...img,
          filename: frontendMetadata.fileName || img.filename,
          originalName: frontendMetadata.fileName || img.originalName,
          metadata: {
            ...img.metadata,
            size: frontendMetadata.fileSize || img.metadata?.size,
            width: frontendMetadata.width || img.metadata?.width,
            height: frontendMetadata.height || img.metadata?.height,
            productId: product._id.toString(),
            index: index
          }
        };
      });
      
      // Replace or append to existing multiple images
      if (product.multipleImages && product.multipleImages.length > 0) {
        // Delete old multiple images from Cloudinary if they exist
        await deleteImagesFromCloudinary(product.multipleImages);
      }
      
      product.multipleImages = enrichedMultipleImages;
      console.log(`✅ Successfully processed ${enrichedMultipleImages.length} multiple images`);
    }

    // Update subSubcategory if provided (handle array or string)
    if (subSubcategory !== undefined) {
      // If subSubcategory is an array, take the first element, otherwise use as-is
      product.subSubcategory = Array.isArray(subSubcategory) ? subSubcategory[0] : subSubcategory;
    }

    // ✅ Auto-Calculate Total Stock (only for clothing categories)
    const categoryDoc = await categoryModel.findById(product.category);
    const categoryName = categoryDoc ? categoryDoc.category.toLowerCase() : (product.categoryName || '').toLowerCase();
    const clothingCategories = [
      "clothing",
      "clothes",
      "shoes",
      "accessories",
      "fashion",
      "apparel",
    ];
    const isClothing = clothingCategories.includes(categoryName);
    
    // Only auto-calculate stock for clothing categories that use sizes
    if (isClothing) {
      let totalStock = 0;
      product.colors.forEach((color) => {
        if (color.sizes && color.sizes.length > 0) {
          color.sizes.forEach((size) => {
            totalStock += Number(size.stock || 0);
          });
        }
      });
      product.stock = totalStock;
    }
    // For non-clothing categories, preserve the existing stock value

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product Updated Successfully",
      product,
    });
  } catch (error) {
    console.error("❌ Error in updateProductImageController:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      productId: req.params.id,
      bodyKeys: Object.keys(req.body),
      filesCount: req.files ? req.files.length : 0
    });
    
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Product ID" });
    }
    return res
      .status(500)
      .json({ 
        success: false, 
        message: "Server Error", 
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
  }
};

//DELETE PRODUCT IMAGE
// export const deleteProductImageController = async (req, res) => {
//   try {
//     //FIND PRODUCT
//     const product = await productModel.findById(req.params.id);

//     //VALIDATION
//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: "Product Not Found",
//       });
//     }
//     // console.log(`req.params.id: ${req.params.id}`);
//     // console.log(`req.query.id: ${req.query.id}`);

//     //FIND IMAGE ID
//     const id = req.query.id;
//     if (!id) {
//       return res.status(404).json({
//         success: false,
//         message: "Product image not found",
//       });
//     }

//     let isExist = -1;
//     product.images.forEach((item, index) => {
//       if (item._id.toString() === id.toString()) isExist = index;
//     });
//     if (isExist < 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Product image not found",
//       });
//     }

//     //DELETE
//     await cloudinary.v2.uploader.destroy(product.images[isExist].public_id); //Delete image from cloudinary
//     product.images.splice(isExist, 1); //Delete image from database
//     await product.save();
//     return res.status(200).json({
//       success: true,
//       message: "Product Image Deleted Successfully",
//     });
//   } catch (error) {
//     console.log(error);
//     //Cast Error || Object Id
//     if (error.name === "CastError") {
//       return res.status(500).json({
//         success: false,
//         message: `Invalid Id`,
//       });
//     }
//     return res.status(500).json({
//       success: false,
//       message: `Error in Delete Product Image API: ${console.log(error)}`,
//       error,
//     });
//   }
// };

export const deleteProductImageController = async (req, res) => {
  try {
    const product = await productModel.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product Not Found" });
    }

    const { imageUrl, color, publicId } = req.query;

    if (!imageUrl) {
      return res
        .status(400)
        .json({ success: false, message: "Image URL is required" });
    }

    if (color) {
      // Color-specific image deletion
      const colorIndex = product.colors.findIndex((c) => c.colorName === color);
      if (colorIndex < 0) {
        return res
          .status(404)
          .json({ success: false, message: "Color not found" });
      }

      const imageIndex = product.colors[colorIndex].images.findIndex(
        (img) => img === imageUrl
      );
      if (imageIndex < 0) {
        return res
          .status(404)
          .json({ success: false, message: "Color image not found" });
      }

      // Delete from Cloudinary if public_id is available
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId);
          console.log(`✅ Deleted image from Cloudinary: ${publicId}`);
        } catch (error) {
          console.log(`❌ Failed to delete from Cloudinary: ${error.message}`);
        }
      } else {
        // Fallback: try to delete local file if exists
        cleanupLocalFile(imageUrl);
      }

      product.colors[colorIndex].images.splice(imageIndex, 1);
    } else {
      // General image deletion
      const imgIndex = product.images.findIndex((img) => img.url === imageUrl);
      if (imgIndex < 0) {
        return res
          .status(404)
          .json({ success: false, message: "Product image not found" });
      }

      // Delete from Cloudinary
      const imageToDelete = product.images[imgIndex];
      if (imageToDelete.public_id) {
        try {
          await deleteFromCloudinary(imageToDelete.public_id);
          console.log(
            `✅ Deleted image from Cloudinary: ${imageToDelete.public_id}`
          );
        } catch (error) {
          console.log(`❌ Failed to delete from Cloudinary: ${error.message}`);
        }
      } else {
        // Fallback: try to delete local file if exists
        cleanupLocalFile(imageToDelete.url);
      }

      product.images.splice(imgIndex, 1);
    }

    await product.save();

    return res
      .status(200)
      .json({ success: true, message: "Image deleted successfully", product });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

//DELETE PRODUCT ALL IMAGES
export const deleteAllProductImagesController = async (req, res) => {
  try {
    const product = await productModel.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // ✅ Delete general images from Cloudinary
    if (Array.isArray(product.images) && product.images.length > 0) {
      try {
        await deleteImagesFromCloudinary(product.images);
        console.log(
          `✅ Deleted ${product.images.length} general images from Cloudinary`
        );
      } catch (error) {
        console.log(
          `❌ Failed to delete general images from Cloudinary: ${error.message}`
        );
        // Fallback: try to delete local files if Cloudinary deletion fails
        product.images.forEach((img) => {
          if (img?.url) {
            cleanupLocalFile(img.url);
          }
        });
      }
      product.images = [];
    }

    // ✅ Delete color images from Cloudinary
    if (Array.isArray(product.colors)) {
      for (const color of product.colors) {
        if (Array.isArray(color.images) && color.images.length > 0) {
          // For color images, we only have URLs, so we need to extract public_ids
          const imageObjects = color.images.map((url) => ({ url }));
          try {
            // Try to extract public_id from URL for Cloudinary deletion
            const publicIds = color.images
              .map((url) => {
                // Extract public_id from Cloudinary URL
                // Format: https://res.cloudinary.com/cloud_name/image/upload/v123456/folder/public_id.ext
                const match = url.match(
                  /\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]*)?$/
                );
                return match ? match[1] : null;
              })
              .filter(Boolean);

            if (publicIds.length > 0) {
              await Promise.all(
                publicIds.map((publicId) => deleteFromCloudinary(publicId))
              );
              console.log(
                `✅ Deleted ${publicIds.length} color images from Cloudinary`
              );
            }
          } catch (error) {
            console.log(
              `❌ Failed to delete color images from Cloudinary: ${error.message}`
            );
            // Fallback: try to delete local files
            color.images.forEach((url) => cleanupLocalFile(url));
          }
          color.images = [];
        }
      }
    }

    await product.save();

    res.status(200).json({
      success: true,
      message: "All images deleted successfully",
      product,
    });
  } catch (error) {
    console.log("❌ Error in deleteAllProductImagesController:", error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

//DELETE PRODUCT
// export const deleteProductController = async (req, res) => {
//   try {
//     //FIND PRODUCT
//     const product = await productModel.findById(req.params.id);

//     //VALIDATION
//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: "Product Not Found",
//       });
//     }

//     //FIND AND DELETE IMAGE FROM CLOUDINARY
//     for (let index = 0; index < product.images.length; index++) {
//       await cloudinary.v2.uploader.destroy(product.images[index].public_id);
//     }

//     //DELETE PRODUCT
//     await product.deleteOne();
//     return res.status(200).json({
//       success: true,
//       message: "Product Deleted Successfully",
//       product,
//     });
//   } catch (error) {
//     console.log(error);
//     //Cast Error || Object Id
//     if (error.name === "CastError") {
//       return res.status(500).json({
//         success: false,
//         message: `Invalid Id`,
//       });
//     }
//     return res.status(500).json({
//       success: false,
//       message: `Error in Delete Product Image API: ${console.log(error)}`,
//       error,
//     });
//   }
// };

export const deleteProductController = async (req, res) => {
  try {
    const product = await productModel.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product Not Found",
      });
    }

    // Delete general images from Cloudinary
    if (Array.isArray(product.images) && product.images.length > 0) {
      try {
        await deleteImagesFromCloudinary(product.images);
        console.log(
          `✅ Deleted ${product.images.length} general images from Cloudinary`
        );
      } catch (error) {
        console.log(
          `❌ Failed to delete general images from Cloudinary: ${error.message}`
        );
        // Fallback: try to delete local files
        product.images.forEach((img) => {
          if (img?.url) {
            cleanupLocalFile(img.url);
          }
        });
      }
    }

    // Delete color images from Cloudinary
    if (Array.isArray(product.colors)) {
      for (const color of product.colors) {
        if (Array.isArray(color.images) && color.images.length > 0) {
          try {
            // Extract public_id from URL for Cloudinary deletion
            const publicIds = color.images
              .map((url) => {
                // Extract public_id from Cloudinary URL
                // Format: https://res.cloudinary.com/cloud_name/image/upload/v123456/folder/public_id.ext
                const match = url.match(
                  /\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]*)?$/
                );
                return match ? match[1] : null;
              })
              .filter(Boolean);

            if (publicIds.length > 0) {
              await Promise.all(
                publicIds.map((publicId) => deleteFromCloudinary(publicId))
              );
              console.log(
                `✅ Deleted ${publicIds.length} color images from Cloudinary`
              );
            }
          } catch (error) {
            console.log(
              `❌ Failed to delete color images from Cloudinary: ${error.message}`
            );
            // Fallback: try to delete local files
            color.images.forEach((url) => cleanupLocalFile(url));
          }
        }
      }
    }

    // Delete product from DB
    await product.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.log(error);
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid Product ID",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

//CREATE PRODUCT REVIEW AND COMMENT
export const productReviewController = async (req, res) => {
  try {
    console.log("Review API called with params:", req.params);
    console.log("Review request body:", req.body);
    console.log("User from request:", req.user?._id);

    const { comment, rating } = req.body;

    if (!rating) {
      return res.status(400).json({
        success: false,
        message: "Rating is required",
      });
    }

    //FIND PRODUCT
    const product = await productModel.findById(req.params.id);
    console.log("Found product:", product ? product._id : "No product found");

    //VALIDATION
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product Not Found",
      });
    }

    //CHECK PREVIOUS REVIEW
    const alreadyReviewed =
      product.reviews &&
      product.reviews.length > 0 &&
      product.reviews.find(
        (r) =>
          r.user && req.user && r.user.toString() === req.user._id.toString()
      );

    console.log("Already reviewed:", alreadyReviewed ? "Yes" : "No");

    //VALIDATION
    if (alreadyReviewed) {
      return res.status(400).json({
        success: false,
        message: "Product Already Reviewed",
      });
    }

    //REVIEW OBJECT
    const review = {
      name: req.user.name,
      rating: Number(rating),
      comment: comment || "",
      user: req.user._id,
    };

    console.log("Creating review:", review);

    //PASSING REVIEW OBJECT TO REVIEW ARRAY
    if (!product.reviews) {
      product.reviews = [];
    }
    product.reviews.push(review);

    //NO. OF REVIEWS
    product.numReviews = product.reviews.length;

    //CALCULATE AVERAGE RATING
    product.rating =
      product.reviews.reduce((acc, item) => (item.rating || 0) + acc, 0) /
      product.reviews.length;

    //SAVE
    await product.save();
    console.log("Product saved with review");

    return res.status(200).json({
      success: true,
      message: "Product Reviewed Successfully",
      product,
    });
  } catch (error) {
    console.log("Review controller error:", error);
    //Cast Error || Object Id
    if (error.name === "CastError") {
      return res.status(500).json({
        success: false,
        message: `Invalid Id`,
        error,
      });
    }
    return res.status(500).json({
      success: false,
      message: `Error in Review API: ${error.message}`,
      error,
    });
  }
};
