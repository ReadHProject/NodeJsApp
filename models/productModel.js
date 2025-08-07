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
    type: [String], // Array of URLs (can be local paths or Cloudinary URLs) - Keep for backward compatibility
    required: true,
    validate: {
      validator: (arr) => arr.length >= 1,
      message: (props) => `Color ${props.value} must have at least 1 images.`,
    },
  },
  // Enhanced hybrid storage images (new approach)
  hybridImages: [
    {
      // Cloudinary data (primary)
      public_id: { type: String, default: null },
      url: { type: String, default: null },
      width: { type: Number, default: null },
      height: { type: Number, default: null },
      format: { type: String, default: null },
      resource_type: { type: String, default: null },
      created_at: { type: Date, default: null },
      bytes: { type: Number, default: null },
      folder: { type: String, default: null },
      version: { type: Number, default: null },
      
      // Hybrid storage fields
      localPath: { type: String, default: null },
      cloudinaryUrl: { type: String, default: null },
      filename: { type: String, default: null },
      originalName: { type: String, default: null },
      uploadedAt: { type: Date, default: Date.now },
      isCloudinaryUploaded: { type: Boolean, default: false },
      storageType: { type: String, enum: ['local', 'cloudinary', 'hybrid', 'legacy'], default: 'local' },
      cloudinaryUploadedAt: { type: Date, default: null },
      
      // Enhanced metadata
      metadata: {
        size: { type: Number, default: null },
        mimetype: { type: String, default: null },
        colorId: { type: String, default: null },
        index: { type: Number, default: null },
        width: { type: Number, default: null },
        height: { type: Number, default: null },
        format: { type: String, default: null }
      },
      
      migrationStatus: {
        type: String,
        enum: ['pending', 'migrating', 'completed', 'failed', 'not_required'],
        default: 'not_required'
      }
    }
  ],
  // Legacy imageDetails - kept for backward compatibility
  imageDetails: [
    {
      url: { type: String, required: true }, // The actual URL (local or Cloudinary)
      public_id: { type: String, default: null }, // Cloudinary public ID
      localPath: { type: String, default: null }, // Local file path if stored locally
      isCloudinaryUploaded: { type: Boolean, default: false },
      storageType: { type: String, enum: ['local', 'cloudinary'], default: 'local' },
      uploadedAt: { type: Date, default: Date.now },
      metadata: {
        size: { type: Number, default: null },
        mimetype: { type: String, default: null },
        width: { type: Number, default: null },
        height: { type: Number, default: null },
        format: { type: String, default: null }
      }
    }
  ],
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
    sku: {
      type: String,
      default: "",
    },
    warrantyInformation: {
      type: String,
      default: "",
    },
    shippingInformation: {
      type: String,
      default: "",
    },
    availabilityStatus: {
      type: String,
      default: "",
    },
    returnPolicy: {
      type: String,
      default: "",
    },
    minimumOrderQuantity: {
      type: Number,
      default: 1,
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
    subSubcategory: {
      type: String,
      default: "",
    },
    images: [
      {
        // Legacy fields for backward compatibility
        public_id: { type: String, default: null },
        url: { type: String, default: null },
        
        // Enhanced hybrid storage fields (backward compatible)
        localPath: { type: String, default: null },
        cloudinaryUrl: { type: String, default: null },
        filename: { type: String, default: null },
        originalName: { type: String, default: null },
        uploadedAt: { type: Date, default: Date.now },
        isCloudinaryUploaded: { type: Boolean, default: false },
        storageType: { type: String, enum: ['local', 'cloudinary', 'hybrid', 'legacy'], default: 'local' },
        cloudinaryUploadedAt: { type: Date, default: null },
        
        // Metadata for better file management
        metadata: {
          size: { type: Number, default: null },
          mimetype: { type: String, default: null },
          productId: { type: String, default: null },
          colorId: { type: String, default: null },
          index: { type: Number, default: null },
          width: { type: Number, default: null },
          height: { type: Number, default: null },
          format: { type: String, default: null }
        },
        
        // Migration status for data migration purposes
        migrationStatus: {
          type: String,
          enum: ['pending', 'migrating', 'completed', 'failed', 'not_required'],
          default: 'not_required'
        }
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

    // TEMP FIELD FOR VALIDATION PURPOSE ONLY
    categoryName: { type: String, default: "" },

    colors: {
      type: [ColorSchema],
      validate: {
        validator: function (value) {
          // Only require colors if categoryName is "clothes"
          if (this.categoryName?.toLowerCase() === "clothes") {
            return Array.isArray(value) && value.length > 0;
          }
          return true; // No validation needed for non-clothes
        },
        message: "Products in 'Clothes' category must have at least one color.",
      },
    },
    
    // Multiple images for non-clothing categories
    multipleImages: [
      {
        // Cloudinary data (primary)
        public_id: { type: String, default: null },
        url: { type: String, default: null },
        width: { type: Number, default: null },
        height: { type: Number, default: null },
        format: { type: String, default: null },
        resource_type: { type: String, default: null },
        created_at: { type: Date, default: null },
        bytes: { type: Number, default: null },
        folder: { type: String, default: null },
        version: { type: Number, default: null },
        
        // Hybrid storage fields
        localPath: { type: String, default: null },
        cloudinaryUrl: { type: String, default: null },
        filename: { type: String, default: null },
        originalName: { type: String, default: null },
        uploadedAt: { type: Date, default: Date.now },
        isCloudinaryUploaded: { type: Boolean, default: false },
        storageType: { type: String, enum: ['local', 'cloudinary', 'hybrid', 'legacy'], default: 'local' },
        cloudinaryUploadedAt: { type: Date, default: null },
        
        // Enhanced metadata
        metadata: {
          size: { type: Number, default: null },
          mimetype: { type: String, default: null },
          productId: { type: String, default: null },
          index: { type: Number, default: null },
          width: { type: Number, default: null },
          height: { type: Number, default: null },
          format: { type: String, default: null }
        },
        
        migrationStatus: {
          type: String,
          enum: ['pending', 'migrating', 'completed', 'failed', 'not_required'],
          default: 'not_required'
        }
      }
    ],
  },
  { timestamps: true }
);

export const productModel = mongoose.model("Products", productSchema);
export default productModel;

// {
//   "_id": <Number>, // Mapped from DummyJSON 'id'
//   "title": "String",
//   "description": "String",
//   "category": "String",
//   "price": "Double",
//   "discountPercentage": "Double",
//   "rating": "Double",
//   "stock": "Int",
//   "tags":, // Array of strings
//   "brand": "String",
//   "sku": "String",
//   "weight": "Int",
//   "dimensions": {
//     "width": "Double",
//     "height": "Double",
//     "depth": "Double"
//   },
//   "warrantyInformation": "String",
//   "shippingInformation": "String",
//   "availabilityStatus": "String",
//   "reviews":,
//   "returnPolicy": "String",
//   "minimumOrderQuantity": "Int",
//   "meta": { // Embedded document for metadata
//     "createdAt": "Date", // Stored as ISODate
//     "updatedAt": "Date", // Stored as ISODate
//     "barcode": "String",
//     "qrCode": "String"
//   },
//   "thumbnail": "String", // URL
//   "images": // Array of URLs
// }
