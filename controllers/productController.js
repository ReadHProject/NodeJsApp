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
    return res.status(200).send({
      success: true,
      message: "All Products Fetched Successfully",
      totalProducts: products.length,
      products,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: `Error in Get All Products API: ${console.log(error)}`,
    });
  }
};

//GET TOP PRODUCT
export const getTopProductsController = async (req, res) => {
  try {
    const products = await productModel.find({}).sort({ rating: -1 }).limit(3);
    return res.status(200).send({
      success: true,
      message: "Top 3 Products Fetched Successfully",
      totalProducts: products.length,
      products,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
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
      return res.status(404).send({
        success: false,
        message: "Product Not Found",
      });
    }

    return res.status(200).send({
      success: true,
      message: "Single Product Fetched Successfully",
      product,
    });
  } catch (error) {
    console.log(error);
    //Cast Error || Object Id
    if (error.name === "CastError") {
      return res.status(500).send({
        success: false,
        message: `Invalid Id`,
      });
    }

    return res.status(500).send({
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
//     //   return res.status(500).send({
//     //     success: false,
//     //     message: "Please provide all fields",
//     //   });
//     // }

//     // console.log(req.file);
//     if (!req.file) {
//       return res.status(500).send({
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
//     return res.status(201).send({
//       success: true,
//       message: "Product Created Successfully",
//       product,
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).send({
//       success: false,
//       message: `Error in Create Product API: ${console.log(error)}`,
//       error,
//     });
//   }
// };

export const createProductController = async (req, res) => {
  try {
    const { name, description, price, category, stock, colors } = req.body;

    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .send({ success: false, message: "No images uploaded" });
    }

    // const images = [];

    // for (let file of req.files) {
    //   const fileUri = getDataUri(file);
    //   const uploaded = await cloudinary.v2.uploader.upload(fileUri.content);
    //   images.push({ public_id: uploaded.public_id, url: uploaded.secure_url });
    // }

    const images = [];
    const uploadPath = path.join(__dirname, "../uploads"); // Create this folder manually or programmatically

    // Ensure folder exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    for (let file of req.files) {
      const ext = path.extname(file.originalname);
      const uniqueName = `${uuidv4()}${ext}`;
      const filePath = path.join(uploadPath, uniqueName);
      fs.writeFileSync(filePath, file.buffer);

      images.push({
        localPath: `/uploads/${uniqueName}`,
        name: uniqueName,
      });
    }

    const product = await productModel.create({
      name,
      description,
      price,
      category,
      stock,
      images, // For general images
      colors: JSON.parse(colors), // You'll send the colors array as a JSON string
    });

    return res.status(201).send({
      success: true,
      message: "Product Created Successfully",
      product,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error in Create Product API",
      error,
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
      return res.status(404).send({
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

    return res.status(200).send({
      success: true,
      message: "Product Updated Successfully",
      product,
    });
  } catch (error) {
    console.log(error);
    //Cast Error || Object Id
    if (error.name === "CastError") {
      return res.status(500).send({
        success: false,
        message: `Invalid Id`,
      });
    }
    return res.status(500).send({
      success: false,
      message: `Error in Update Product API: ${console.log(error)}`,
      error,
    });
  }
};

//UPDATE PRODUCT IMAGE
export const updateProductImageController = async (req, res) => {
  try {
    //FIND PRODUCT
    const product = await productModel.findById(req.params.id);

    //VALIDATION
    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product Not Found",
      });
    }

    //CHECK FILE
    if (!req.file) {
      return res.status(500).send({
        success: false,
        message: "Please provide product images",
      });
    }

    const file = getDataUri(req.file);

    //UPLOAD FILE TO CLOUDINARY
    const cdb = await cloudinary.v2.uploader.upload(file.content);

    //UPDATE PRDUCT
    const image = {
      public_id: cdb.public_id,
      url: cdb.secure_url,
    };

    //SAVE PRODUCT
    product.images.push(image);
    await product.save();

    return res.status(200).send({
      success: true,
      message: "Product Updated Successfully",
      product,
    });
  } catch (error) {
    console.log(error);
    //Cast Error || Object Id
    if (error.name === "CastError") {
      return res.status(500).send({
        success: false,
        message: `Invalid Id`,
      });
    }
    return res.status(500).send({
      success: false,
      message: `Error in Update Product API: ${console.log(error)}`,
      error,
    });
  }
};

//DELETE PRODUCT IMAGE
export const deleteProductImageController = async (req, res) => {
  try {
    //FIND PRODUCT
    const product = await productModel.findById(req.params.id);

    //VALIDATION
    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product Not Found",
      });
    }
    // console.log(`req.params.id: ${req.params.id}`);
    // console.log(`req.query.id: ${req.query.id}`);

    //FIND IMAGE ID
    const id = req.query.id;
    if (!id) {
      return res.status(404).send({
        success: false,
        message: "Product image not found",
      });
    }

    let isExist = -1;
    product.images.forEach((item, index) => {
      if (item._id.toString() === id.toString()) isExist = index;
    });
    if (isExist < 0) {
      return res.status(404).send({
        success: false,
        message: "Product image not found",
      });
    }

    //DELETE
    await cloudinary.v2.uploader.destroy(product.images[isExist].public_id); //Delete image from cloudinary
    product.images.splice(isExist, 1); //Delete image from database
    await product.save();
    return res.status(200).send({
      success: true,
      message: "Product Image Deleted Successfully",
    });
  } catch (error) {
    console.log(error);
    //Cast Error || Object Id
    if (error.name === "CastError") {
      return res.status(500).send({
        success: false,
        message: `Invalid Id`,
      });
    }
    return res.status(500).send({
      success: false,
      message: `Error in Delete Product Image API: ${console.log(error)}`,
      error,
    });
  }
};

//DELETE PRODUCT
export const deleteProductController = async (req, res) => {
  try {
    //FIND PRODUCT
    const product = await productModel.findById(req.params.id);

    //VALIDATION
    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product Not Found",
      });
    }

    //FIND AND DELETE IMAGE FROM CLOUDINARY
    for (let index = 0; index < product.images.length; index++) {
      await cloudinary.v2.uploader.destroy(product.images[index].public_id);
    }

    //DELETE PRODUCT
    await product.deleteOne();
    return res.status(200).send({
      success: true,
      message: "Product Deleted Successfully",
    });
  } catch (error) {
    console.log(error);
    //Cast Error || Object Id
    if (error.name === "CastError") {
      return res.status(500).send({
        success: false,
        message: `Invalid Id`,
      });
    }
    return res.status(500).send({
      success: false,
      message: `Error in Delete Product Image API: ${console.log(error)}`,
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
      return res.status(404).send({
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
      return res.status(400).send({
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
    return res.status(200).send({
      success: true,
      message: "Product Reviewed Successfully",
    });
  } catch (error) {
    console.log(error);
    //Cast Error || Object Id
    if (error.name === "CastError") {
      return res.status(500).send({
        success: false,
        message: `Invalid Id`,
      });
    }
    return res.status(500).send({
      success: false,
      message: `Error in Create Product API: ${console.log(error)}`,
      error,
    });
  }
};
