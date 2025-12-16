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
      enum: [
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "return_approved",
        "return_rejected",
        "replace_approved",
        "replace_rejected",
        "returned",
        "replaced"
      ],
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
    returnRequest: {
      status: {
        type: String,
        enum: ["none", "pending", "approved", "rejected", "completed"],
        default: "none",
      },
      reason: {
        type: String,
        default: "",
      },
      description: {
        type: String,
        default: "",
      },
      requestedAt: Date,
      processedAt: Date,
      processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
      },
    },
    replaceRequest: {
      status: {
        type: String,
        enum: ["none", "pending", "approved", "rejected", "completed"],
        default: "none",
      },
      reason: {
        type: String,
        default: "",
      },
      description: {
        type: String,
        default: "",
      },
      requestedAt: Date,
      processedAt: Date,
      processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
      },
    },
  },
  { timestamps: true }
);

// Virtual property for order age in days
orderSchema.virtual("orderAge").get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual property to check if return is allowed (7 days from delivery)
orderSchema.virtual("canReturn").get(function () {
  if (this.orderStatus !== "delivered" || !this.deliveredAt) {
    return false;
  }
  const daysSinceDelivery = Math.floor(
    (Date.now() - new Date(this.deliveredAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSinceDelivery <= 7;
});

// Virtual property to check if replace is allowed (15 days from delivery)
orderSchema.virtual("canReplace").get(function () {
  if (this.orderStatus !== "delivered" || !this.deliveredAt) {
    return false;
  }
  const daysSinceDelivery = Math.floor(
    (Date.now() - new Date(this.deliveredAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSinceDelivery <= 15;
});

// Virtual property for return window closing date
orderSchema.virtual("returnWindowClosesAt").get(function () {
  if (!this.deliveredAt) {
    return null;
  }
  const closingDate = new Date(this.deliveredAt);
  closingDate.setDate(closingDate.getDate() + 7);
  return closingDate;
});

// Virtual property for replace window closing date
orderSchema.virtual("replaceWindowClosesAt").get(function () {
  if (!this.deliveredAt) {
    return null;
  }
  const closingDate = new Date(this.deliveredAt);
  closingDate.setDate(closingDate.getDate() + 15);
  return closingDate;
});

// Index for faster queries
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });

export const orderModel = mongoose.model("Orders", orderSchema);
export default orderModel;
