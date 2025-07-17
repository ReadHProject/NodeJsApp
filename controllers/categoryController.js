import categoryModel from "../models/categoryModel.js";
import productModel from "../models/productModel.js";

//CREATE CATEGORY
export const createCategoryController = async (req, res) => {
  try {
    //GET CATEGORY
    const { category, subcategories = [] } = req.body;

    //VALIDATION
    if (!category) {
      return res.status(500).json({
        success: false,
        message: "Please provide category name",
      });
    }

    //CREATE CATEGORY
    await categoryModel.create({ category, subcategories });

    return res.status(200).json({
      success: true,
      message: `${category} Category Created Successfully`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: `Error in Create Category API: ${console.log(error)}`,
      error,
    });
  }
};

//GET ALL CATEGORY
export const getAllCategoryController = async (req, res) => {
  try {
    const categories = await categoryModel.find({});
    return res.status(200).json({
      success: true,
      message: "All Categories Fetched Successfully",
      TotalCategory: categories.length,
      categories,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: `Error in Get All Category API: ${console.log(error)}`,
      error,
    });
  }
};

//DELETE CATEGORY
export const deleteCategoryController = async (req, res) => {
  try {
    const category = await categoryModel.findById(req.params.id);

    //VALIDATION
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category Not Found",
      });
    }

    //FIND PRODUCT WITH THIS CATEGORY ID
    const products = await productModel.find({ category: category._id });

    //UPDATE PRODUCT CATEGORY
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      product.category = undefined;
      await product.save();
    }

    //DELETE CATEGORY
    await category.deleteOne();

    return res.status(200).json({
      success: true,
      message: `${category.category} Category Deleted Successfully`,
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
      message: `Error in Delete Category API: ${console.log(error)}`,
      error,
    });
  }
};

//UPDATE CATEGORY
export const updateCategoryController = async (req, res) => {
  try {
    const category = await categoryModel.findById(req.params.id);

    //VALIDATION
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category Not Found",
      });
    }

    //GET NEW CATEGORY
    const { updateCategory, subcategories } = req.body;
    console.log("Update Category Request Body:", req.body);

    //FIND PRODUCT WITH THIS CATEGORY ID
    const products = await productModel.find({ category: category._id });

    //UPDATE PRODUCT CATEGORY
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      product.category = category._id;
      await product.save();
    }

    //UPDATE CATEGORY
    if (updateCategory) category.category = updateCategory;

    // Update subcategories if provided
    if (subcategories !== undefined) {
      category.subcategories = subcategories;
    }

    //SAVE CATEGORY
    await category.save();

    return res.status(200).json({
      success: true,
      message: `${category.category} Category Updated Successfully`,
      category,
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
      message: `Error in Update Category API: ${console.log(error)}`,
      error,
    });
  }
};
