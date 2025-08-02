import categoryModel from "../models/categoryModel.js";
import productModel from "../models/productModel.js";

//CREATE CATEGORY
export const createCategoryController = async (req, res) => {
  try {
    //GET CATEGORY
    const { category, subcategories = [], categoryType, supportsColorVariants, supportsSizeVariants, description, icon, isActive, displayOrder } = req.body;

    //VALIDATION
    if (!category) {
      return res.status(500).json({
        success: false,
        message: "Please provide category name",
      });
    }

    // Process subcategories to ensure proper structure
    const processedSubcategories = subcategories.map(subcat => {
      if (typeof subcat === 'string') {
        // Convert old string format to new object format
        return {
          name: subcat,
          subSubCategories: []
        };
      } else if (subcat && typeof subcat === 'object') {
        // Ensure proper structure for object format
        return {
          name: subcat.name,
          subSubCategories: subcat.subSubCategories || []
        };
      }
      return subcat;
    });

    //CREATE CATEGORY
    await categoryModel.create({ category, subcategories: processedSubcategories, categoryType, supportsColorVariants, supportsSizeVariants, description, icon, isActive, displayOrder });

    return res.status(200).json({
      success: true,
      message: `${category} Category Created Successfully`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: `Error in Create Category API: ${error.message}`,
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
      message: `Error in Get All Category API: ${error.message}`,
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
      message: `Error in Delete Category API: ${error.message}`,
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
    const { updateCategory, subcategories, categoryType, supportsColorVariants, supportsSizeVariants, description, icon, isActive, displayOrder } = req.body;
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
    if (subcategories !== undefined) {
      // Process subcategories to ensure proper structure
      const processedSubcategories = subcategories.map(subcat => {
        if (typeof subcat === 'string') {
          // Convert old string format to new object format
          return {
            name: subcat,
            subSubCategories: []
          };
        } else if (subcat && typeof subcat === 'object') {
          // Ensure proper structure for object format
          return {
            name: subcat.name,
            subSubCategories: subcat.subSubCategories || []
          };
        }
        return subcat;
      });
      category.subcategories = processedSubcategories;
    }
    if (categoryType) category.categoryType = categoryType;
    if (supportsColorVariants !== undefined) category.supportsColorVariants = supportsColorVariants;
    if (supportsSizeVariants !== undefined) category.supportsSizeVariants = supportsSizeVariants;
    if (description) category.description = description;
    if (icon) category.icon = icon;
    if (isActive !== undefined) category.isActive = isActive;
    if (displayOrder) category.displayOrder = displayOrder;

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
      message: `Error in Update Category API: ${error.message}`,
      error,
    });
  }
};
