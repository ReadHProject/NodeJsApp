import productModel from "../models/productModel.js";
import cloudinary from "cloudinary";
import { getDataUri } from "../utils/feature.js";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";

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
    const { name, description, price, stock, category, colors } = req.body;

    if (!name || !description || !price || !stock || !category || !colors) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const parsedColors = JSON.parse(colors || "[]");
    const uploadedFiles = req.files || [];

    const colorImages = parsedColors.map((color) => {
      const matchedFiles = uploadedFiles.filter(
        (f) => f.fieldname === color.colorId
      );

      if (matchedFiles.length < 1) {
        throw new Error(
          `Color ${color.colorName} must have at least 1 uploaded image`
        );
      }

      if (!color.sizes || color.sizes.length < 1) {
        throw new Error(
          `Color ${color.colorName} must have at least one size with price and stock`
        );
      }

      const images = matchedFiles.map((f) => `/uploads/products/${f.filename}`);

      return {
        colorId: color.colorId,
        colorName: color.colorName,
        colorCode: color.colorCode,
        images,
        sizes: color.sizes, // 👈 correct sizes array from frontend
      };
    });

    const generalFile = uploadedFiles.find(
      (f) => f.fieldname === "generalImage"
    );
    const generalImage = generalFile
      ? [
          {
            public_id: generalFile.filename,
            url: `/uploads/products/${generalFile.filename}`,
          },
        ]
      : [];

    const product = await productModel.create({
      name,
      description,
      price,
      stock,
      category,
      images: generalImage,
      colors: colorImages,
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
    const { name, description, price, category, stock } = req.body;
    //VALIDATION AND UPDATE
    if (name) product.name = name;
    if (description) product.description = description;
    if (price) product.price = price;
    if (category) product.category = category;
    if (stock) product.stock = stock;

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
    const { colors } = req.body;

    const product = await productModel.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product Not Found" });
    }

    let parsedColors = [];
    try {
      parsedColors = typeof colors === "string" ? JSON.parse(colors) : colors;
      console.log(
        "Parsed Colors from request:",
        JSON.stringify(parsedColors, null, 2)
      );
    } catch (err) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid colors JSON" });
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

    // ✅ Update General Image
    const generalFile = uploadedFiles.find(
      (f) => f.fieldname === "generalImage"
    );
    if (generalFile) {
      product.images = [
        {
          public_id: generalFile.filename,
          url: `/uploads/products/${generalFile.filename}`,
        },
      ];
    }

    const existingColorsMap = {};
    product.colors.forEach((c) => {
      existingColorsMap[c.colorId] = c;
    });

    const newColorsList = parsedColors.map((incomingColor) => {
      const existing = existingColorsMap[incomingColor.colorId];

      const matchedFiles = uploadedFiles.filter(
        (f) => f.fieldname === incomingColor.colorId
      );

      let updatedImages = existing ? [...existing.images] : [];

      matchedFiles.forEach((file) => {
        const fileIndex = parseInt(file.originalname.split("_")[1]);
        const newImagePath = `/uploads/products/${file.filename}`;

        if (!isNaN(fileIndex) && fileIndex < updatedImages.length) {
          updatedImages[fileIndex] = newImagePath;
        } else {
          updatedImages.push(newImagePath);
        }
      });

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

      return {
        colorId: incomingColor.colorId,
        colorName: incomingColor.colorName || existing?.colorName || "",
        colorCode: incomingColor.colorCode || existing?.colorCode || "#000000",
        images: updatedImages,
        sizes: updatedSizes,
      };
    });

    product.colors = newColorsList;

    // ✅ Auto-Calculate Total Stock
    let totalStock = 0;
    product.colors.forEach((color) => {
      if (color.sizes && color.sizes.length > 0) {
        color.sizes.forEach((size) => {
          totalStock += Number(size.stock || 0);
        });
      }
    });
    product.stock = totalStock;

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product Updated Successfully",
      product,
    });
  } catch (error) {
    console.log(error);
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Product ID" });
    }
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error });
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

    const { imageUrl, color } = req.query;

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

      const filePath = path.join(process.cwd(), imageUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      product.colors[colorIndex].images.splice(imageIndex, 1);
    } else {
      // General image deletion
      const imgIndex = product.images.findIndex((img) => img.url === imageUrl);
      if (imgIndex < 0) {
        return res
          .status(404)
          .json({ success: false, message: "Product image not found" });
      }

      const filePath = path.join(process.cwd(), product.images[imgIndex].url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

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

    // ✅ Delete general images safely
    if (Array.isArray(product.images)) {
      product.images.forEach((img) => {
        if (img?.url) {
          const filename = img.url.split("/").pop();
          if (filename) {
            const filePath = path.join(
              process.cwd(),
              "uploads",
              "products",
              filename
            );
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          }
        }
      });
      product.images = [];
    }

    // ✅ Delete color images safely
    if (Array.isArray(product.colors)) {
      product.colors.forEach((color) => {
        if (Array.isArray(color.images)) {
          color.images.forEach((img) => {
            if (img) {
              const filename = img.split("/").pop();
              if (filename) {
                const filePath = path.join(
                  process.cwd(),
                  "uploads",
                  "products",
                  filename
                );
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
              }
            }
          });
          color.images = [];
        }
      });
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

    // Delete general images from server
    product.images.forEach((img) => {
      if (img?.url) {
        const filename = img.url.split("/").pop();
        const filePath = path.join(
          process.cwd(),
          "uploads",
          "products",
          filename
        );
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    });

    // Delete color images from server
    product.colors.forEach((color) => {
      color.images.forEach((img) => {
        if (img) {
          const filename = img.split("/").pop();
          const filePath = path.join(
            process.cwd(),
            "uploads",
            "products",
            filename
          );
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
      });
    });

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
    const { comment, rating } = req.body;

    //FIND PRODUCT
    const product = await productModel.findById(req.params.id);

    //VALIDATION
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product Not Found",
      });
    }

    //CHECK PREVIOUS REVIEW
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toSting() === req.user._id.toString()
    );

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
      comment,
      user: req.user._id,
    };

    //PASSING REVIEW OBJECT TO REVIEW ARRAY
    product.reviews.push(review);
    //NO. OF REVIEWS
    product.numReviews = product.reviews.length;
    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    //SAVE
    await product.save();
    return res.status(200).json({
      success: true,
      message: "Product Reviewed Successfully",
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
      message: `Error in Create Product API: ${console.log(error)}`,
      error,
    });
  }
};
