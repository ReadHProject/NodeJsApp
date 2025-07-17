import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, "Category name is required"],
    },
    subcategories: [
      {
        type: String,
        required: [true, "SubCategory name is required"],
        default: [],
      },
    ],
  },
  { timestamps: true }
);

export const categoryModel = mongoose.model("Category", categorySchema);
export default categoryModel;
