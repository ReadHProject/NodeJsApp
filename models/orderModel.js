import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    shippingInfo: {
      address: {
        type: String,
        required: [true, "Address is required"],
      },
      city: {
        type: String,
        required: [true, "City is required"],
      },
      country: {
        type: String,
        required: [true, "Country is required"],
      },
      phone: {
        type: String,
        required: false,
      },
    },
    orderItems: [
      {
        name: {
          type: String,
          required: [true, "Product name is required"],
        },
        price: {
          type: Number,
          required: [true, "Product price is required"],
        },
        quantity: {
          type: Number,
          required: [true, "Product quantity is required"],
        },
        images: {
          type: String,
          required: false,
          default: "https://via.placeholder.com/150",
        },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Products",
          required: [true, "Product is required"],
        },
      },
    ],
    paymentMethod: {
      type: String,
      enum: ["COD", "ONLINE"],
      default: "COD",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: [true, "User is required"],
    },
    paidAt: Date,
    paymentInfo: {
      id: String,
      status: String,
    },
    itemPrice: {
      type: Number,
      required: [true, "Item price is required"],
    },
    tax: {
      type: Number,
      required: [true, "Tax price is required"],
    },
    shippingCharges: {
      type: Number,
      required: [true, "Shipping Charges is required"],
    },
    totalAmount: {
      type: Number,
      required: [true, "Total Amount is required"],
    },
    orderStatus: {
      type: String,
      enum: ["processing", "shipped", "delivered", "cancelled"],
      default: "processing",
    },
    deliveredAt: Date,
    notes: {
      type: String,
      default: "",
    },
    refundStatus: {
      type: String,
      enum: ["none", "requested", "processing", "completed", "rejected"],
      default: "none",
    },
    estimatedDeliveryDate: Date,
    trackingInfo: {
      carrier: String,
      trackingNumber: String,
      trackingUrl: String,
    },
  },
  { timestamps: true }
);

// Virtual property for order age in days
orderSchema.virtual("orderAge").get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Index for faster queries
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });

export const orderModel = mongoose.model("Orders", orderSchema);
export default orderModel;
