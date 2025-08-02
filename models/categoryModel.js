import mongoose from "mongoose";

const subSubCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    // required: [true, "Sub-subcategory name is required"],
  },
});

const subCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    // required: [true, "Subcategory name is required"],
  },
  subSubCategories: [subSubCategorySchema],
});

const categorySchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, "Category name is required"],
    },
    subcategories: [subCategorySchema],
    // Enhanced features for better product management
    categoryType: {
      type: String,
      enum: ['clothing', 'electronics', 'home', 'sports', 'books', 'other'],
      default: 'other',
    },
    supportsColorVariants: {
      type: Boolean,
      default: false,
    },
    supportsSizeVariants: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      default: '',
    },
    icon: {
      type: String, // URL or icon name
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const categoryModel = mongoose.model("Category", categorySchema);
export default categoryModel;
