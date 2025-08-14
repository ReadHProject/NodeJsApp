import mongoose from "mongoose";

// Notification History Schema
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        // Transactional
        'order_confirmation',
        'order_shipped',
        'order_delivered',
        'payment_success',
        'payment_failed',
        
        // Marketing
        'flash_sale',
        'new_product',
        'promotion',
        'discount_code',
        
        // Engagement
        'cart_abandonment',
        'review_request',
        'wishlist_update',
        'price_drop',
        
        // General
        'system_update',
        'account_security',
        'other'
      ],
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    // Data payload sent with notification
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // Push notification specific fields
    pushNotification: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      pushTokens: [String], // Tokens the notification was sent to
      expoTickets: [String], // Expo push notification tickets for tracking
      deliveryStatus: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'failed'],
        default: 'pending'
      },
      failureReason: { type: String },
      retryCount: { type: Number, default: 0 },
      maxRetries: { type: Number, default: 3 }
    },
    // User interaction
    userInteraction: {
      read: { type: Boolean, default: false },
      readAt: { type: Date },
      clicked: { type: Boolean, default: false },
      clickedAt: { type: Date },
      dismissed: { type: Boolean, default: false },
      dismissedAt: { type: Date }
    },
    // Scheduling
    scheduledFor: { type: Date },
    expiresAt: { type: Date },
    
    // Analytics
    analytics: {
      opened: { type: Boolean, default: false },
      openedAt: { type: Date },
      deviceInfo: {
        platform: String,
        version: String
      }
    },
    
    // Status
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sent', 'failed', 'expired'],
      default: 'draft'
    },
    
    // Campaign info (for marketing notifications)
    campaignId: { type: String },
    campaignName: { type: String },
    
    // A/B testing
    variant: { type: String }, // 'A', 'B', etc.
    
    // Metadata
    metadata: {
      source: { type: String }, // 'order_system', 'marketing_campaign', etc.
      triggeredBy: { type: String }, // 'user_action', 'scheduled', 'api', etc.
      additionalInfo: { type: mongoose.Schema.Types.Mixed }
    }
  },
  { 
    timestamps: true,
    // Add indexes for better query performance
    indexes: [
      { userId: 1, createdAt: -1 },
      { type: 1, status: 1 },
      { 'pushNotification.deliveryStatus': 1 },
      { scheduledFor: 1 },
      { expiresAt: 1 }
    ]
  }
);

// Indexes for performance
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ type: 1, status: 1 });
notificationSchema.index({ 'pushNotification.deliveryStatus': 1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ expiresAt: 1 });

// Methods
notificationSchema.methods.markAsRead = function() {
  this.userInteraction.read = true;
  this.userInteraction.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsClicked = function() {
  this.userInteraction.clicked = true;
  this.userInteraction.clickedAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsSent = function(tickets = []) {
  this.pushNotification.sent = true;
  this.pushNotification.sentAt = new Date();
  this.pushNotification.expoTickets = tickets;
  this.pushNotification.deliveryStatus = 'sent';
  this.status = 'sent';
  return this.save();
};

notificationSchema.methods.markAsFailed = function(reason) {
  this.pushNotification.deliveryStatus = 'failed';
  this.pushNotification.failureReason = reason;
  this.status = 'failed';
  return this.save();
};

// Static methods
notificationSchema.statics.getUserNotifications = function(userId, limit = 50, skip = 0) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ 
    userId, 
    'userInteraction.read': false 
  });
};

notificationSchema.statics.getPendingNotifications = function() {
  return this.find({
    status: 'scheduled',
    scheduledFor: { $lte: new Date() }
  });
};

export const notificationModel = mongoose.model("Notifications", notificationSchema);
export default notificationModel;
