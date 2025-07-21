import mongoose from "mongoose";

// Schema for activity logs
const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "login",
        "logout",
        "registration",
        "profile_update",
        "password_change",
        "order_placed",
        "product_viewed",
        "cart_updated",
        "wishlist_updated",
        "review_submitted",
        "admin_action",
      ],
    },
    details: {
      type: String,
      default: "",
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      default: "success",
      enum: ["success", "failed", "pending"],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
activityLogSchema.index({ user: 1 });
activityLogSchema.index({ action: 1 });
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ status: 1 });

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

export default ActivityLog;
