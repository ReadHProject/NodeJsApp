import mongoose from "mongoose";

//REVIEW MODEL
const reviewSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Review name is required"],
    },
    rating: {
      type: Number,
      default: 0,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: [true, "Review user is required"],
    },
    comment: {
      type: String,
    },
  },
  { timestamps: true }
);

//COLOR AND IMAGE MODEL
const ColorSchema = new mongoose.Schema({
  colorId: {
    type: String,
    required: true,
    description: 'Unique identifier for the color (e.g., "white", "black")',
  },
  colorName: {
    type: String,
    required: true,
    description: 'Human-readable name (e.g., "White", "Black")',
  },
  colorCode: {
    type: String,
    required: true,
    description: 'Hex code or other representation (e.g., "#FFFFFF")',
  },
  sizes: [
    {
      size: { type: String, required: true, default: "" },
      price: { type: Number, required: false, default: 0 }, // Optional: won't break old records
      stock: { type: Number, required: false, default: 0 }, // Optional: won't break old records
      //add discount price in percentage or in value
      discountper: {
        type: String,
        default: 0,
        description:
          "Discount percentage or value that will be used to calculate discountprice using price",
      },
      discountprice: {
        type: Number,
        default: 0,
      },
    },
  ],
  images: {
    type: [String],
    required: true,
    validate: {
      validator: (arr) => arr.length >= 1,
      message: (props) => `Color ${props.value} must have at least 1 images.`,
    },
  },
});

//PRODUCT MODEL
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
    },

    stock: {
      type: Number,
      required: [true, "Product stock is required"],
    },
    // quantity: {
    //   type: Number,
    //   required: [true, "Product quantity is required"],
    // },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    subcategory: {
      type: String,
      default: "",
    },
    images: [
      {
        public_id: String,
        url: String,
      },
    ],
    reviews: {
      type: [reviewSchema],
    },
    rating: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    colors: {
      type: [ColorSchema],
      validate: {
        validator: function (arr) {
          // You could enforce at least one color
          return arr.length > 0;
        },
        message: "A product must have at least one color option.",
      },
    },
  },
  { timestamps: true }
);

export const productModel = mongoose.model("Products", productSchema);
export default productModel;
