import { Expo } from 'expo-server-sdk';
import userModel from '../models/userModel.js';
import notificationModel from '../models/notificationModel.js';
import orderModel from '../models/orderModel.js';

// Initialize Expo SDK
const expo = new Expo();

// Register push token
export const registerPushTokenController = async (req, res) => {
  try {
    const { pushToken, userId, deviceInfo } = req.body;

    // Validate push token format
    if (!Expo.isExpoPushToken(pushToken)) {
      return res.status(400).send({
        success: false,
        message: 'Invalid push token format',
      });
    }

    let user;
    
    if (userId) {
      // Registered user - save to user document
      user = await userModel.findById(userId);
      if (!user) {
        return res.status(404).send({
          success: false,
          message: 'User not found',
        });
      }

      // Check if token already exists for this user
      const existingTokenIndex = user.pushTokens.findIndex(
        token => token.token === pushToken
      );

      if (existingTokenIndex !== -1) {
        // Update existing token
        user.pushTokens[existingTokenIndex].lastUsed = new Date();
        user.pushTokens[existingTokenIndex].isActive = true;
        if (deviceInfo) {
          user.pushTokens[existingTokenIndex].deviceInfo = deviceInfo;
        }
      } else {
        // Add new token
        user.pushTokens.push({
          token: pushToken,
          deviceInfo: deviceInfo || {},
          isActive: true,
          lastUsed: new Date(),
          createdAt: new Date()
        });
      }

      await user.save();
      
      console.log(`✅ Push token registered for user: ${user.email}`);
    } else {
      // Anonymous user - we could store in a separate collection or handle differently
      console.log(`📱 Anonymous push token registered: ${pushToken.substring(0, 20)}...`);
    }

    res.status(200).send({
      success: true,
      message: 'Push token registered successfully',
      data: { tokenRegistered: true }
    });
  } catch (error) {
    console.error('❌ Error registering push token:', error);
    res.status(500).send({
      success: false,
      message: 'Error registering push token',
      error: error.message,
    });
  }
};

// Send push notification
export const sendPushNotificationController = async (req, res) => {
  try {
    const { userId, title, body, data = {}, type = 'other', priority = 'normal' } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).send({
        success: false,
        message: 'userId, title, and body are required',
      });
    }

    // Get user and their push tokens
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).send({
        success: false,
        message: 'User not found',
      });
    }

    // Check notification preferences
    const preferences = user.notificationPreferences || {};
    if (!shouldSendNotification(type, preferences)) {
      return res.status(200).send({
        success: true,
        message: 'Notification blocked by user preferences',
        data: { sent: false, reason: 'user_preferences' }
      });
    }

    // Get active push tokens
    const activePushTokens = user.pushTokens
      .filter(tokenObj => tokenObj.isActive)
      .map(tokenObj => tokenObj.token)
      .filter(token => Expo.isExpoPushToken(token));

    if (activePushTokens.length === 0) {
      return res.status(400).send({
        success: false,
        message: 'No valid push tokens found for user',
      });
    }

    // Create notification record
    const notification = new notificationModel({
      userId,
      title,
      body,
      type,
      priority,
      data,
      pushNotification: {
        pushTokens: activePushTokens,
        deliveryStatus: 'pending'
      },
      metadata: {
        source: 'api',
        triggeredBy: 'manual'
      }
    });

    // Prepare messages for Expo
    const messages = activePushTokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: {
        ...data,
        type,
        notificationId: notification._id.toString(),
      },
      priority: priority === 'high' ? 'high' : 'normal',
      ...(priority === 'high' && { channelId: 'important' })
    }));

    // Send notifications
    const ticketChunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (let chunk of ticketChunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('❌ Error sending notification chunk:', error);
      }
    }

    // Update notification record
    const ticketIds = tickets.map(ticket => ticket.id).filter(Boolean);
    await notification.markAsSent(ticketIds);

    console.log(`✅ Push notification sent to ${activePushTokens.length} devices`);

    res.status(200).send({
      success: true,
      message: 'Push notification sent successfully',
      data: {
        notification: notification._id,
        sentToTokens: activePushTokens.length,
        tickets: ticketIds
      }
    });
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    res.status(500).send({
      success: false,
      message: 'Error sending push notification',
      error: error.message,
    });
  }
};

// Bulk send notifications (for marketing campaigns)
export const sendBulkNotificationController = async (req, res) => {
  try {
    const { title, body, data = {}, type = 'promotion', userIds, filters } = req.body;

    if (!title || !body) {
      return res.status(400).send({
        success: false,
        message: 'title and body are required',
      });
    }

    let users;
    
    if (userIds) {
      // Send to specific users
      users = await userModel.find({ 
        _id: { $in: userIds },
        pushTokens: { $exists: true, $ne: [] }
      });
    } else if (filters) {
      // Send based on filters (e.g., all users, users in specific city, etc.)
      const query = buildUserQuery(filters);
      users = await userModel.find({
        ...query,
        pushTokens: { $exists: true, $ne: [] }
      });
    } else {
      return res.status(400).send({
        success: false,
        message: 'Either userIds or filters must be provided',
      });
    }

    if (users.length === 0) {
      return res.status(400).send({
        success: false,
        message: 'No users found with the given criteria',
      });
    }

    const results = {
      total: users.length,
      sent: 0,
      failed: 0,
      skipped: 0
    };

    // Process users in batches to avoid memory issues
    const batchSize = 100;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      for (const user of batch) {
        try {
          // Check user preferences
          const preferences = user.notificationPreferences || {};
          if (!shouldSendNotification(type, preferences)) {
            results.skipped++;
            continue;
          }

          // Get active tokens
          const activePushTokens = user.pushTokens
            .filter(tokenObj => tokenObj.isActive)
            .map(tokenObj => tokenObj.token)
            .filter(token => Expo.isExpoPushToken(token));

          if (activePushTokens.length === 0) {
            results.failed++;
            continue;
          }

          // Create notification record
          const notification = new notificationModel({
            userId: user._id,
            title,
            body,
            type,
            data,
            pushNotification: {
              pushTokens: activePushTokens,
              deliveryStatus: 'pending'
            },
            metadata: {
              source: 'bulk_campaign',
              triggeredBy: 'api'
            }
          });

          await notification.save();

          // Send notification (simplified for bulk)
          const messages = activePushTokens.map(token => ({
            to: token,
            sound: 'default',
            title,
            body,
            data: { ...data, type, notificationId: notification._id.toString() }
          }));

          const ticketChunks = expo.chunkPushNotifications(messages);
          for (let chunk of ticketChunks) {
            await expo.sendPushNotificationsAsync(chunk);
          }

          await notification.markAsSent();
          results.sent++;
        } catch (error) {
          console.error(`❌ Error sending to user ${user._id}:`, error);
          results.failed++;
        }
      }
    }

    res.status(200).send({
      success: true,
      message: 'Bulk notifications processed',
      data: results
    });
  } catch (error) {
    console.error('❌ Error sending bulk notifications:', error);
    res.status(500).send({
      success: false,
      message: 'Error sending bulk notifications',
      error: error.message,
    });
  }
};

// Get user notifications
export const getUserNotificationsController = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, type, unreadOnly } = req.query;

    const skip = (page - 1) * limit;
    const query = { userId };

    if (type) query.type = type;
    if (unreadOnly === 'true') query['userInteraction.read'] = false;

    const notifications = await notificationModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('-pushNotification -metadata'); // Exclude internal fields

    const total = await notificationModel.countDocuments(query);
    const unreadCount = await notificationModel.getUnreadCount(userId);

    res.status(200).send({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        unreadCount
      }
    });
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).send({
      success: false,
      message: 'Error fetching notifications',
      error: error.message,
    });
  }
};

// Update notification preferences
export const updatePreferencesController = async (req, res) => {
  try {
    const { userId, preferences } = req.body;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).send({
        success: false,
        message: 'User not found',
      });
    }

    // Update preferences
    user.notificationPreferences = {
      ...user.notificationPreferences,
      ...preferences
    };

    await user.save();

    res.status(200).send({
      success: true,
      message: 'Notification preferences updated successfully',
      data: user.notificationPreferences
    });
  } catch (error) {
    console.error('❌ Error updating preferences:', error);
    res.status(500).send({
      success: false,
      message: 'Error updating preferences',
      error: error.message,
    });
  }
};

// Mark notification as read
export const markNotificationReadController = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await notificationModel.findById(notificationId);
    if (!notification) {
      return res.status(404).send({
        success: false,
        message: 'Notification not found',
      });
    }

    await notification.markAsRead();

    res.status(200).send({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).send({
      success: false,
      message: 'Error marking notification as read',
      error: error.message,
    });
  }
};

// Helper function to check if notification should be sent based on preferences
function shouldSendNotification(type, preferences) {
  const typePreferenceMap = {
    'order_confirmation': 'orderUpdates',
    'order_shipped': 'shippingUpdates',
    'order_delivered': 'shippingUpdates',
    'payment_success': 'paymentConfirmations',
    'payment_failed': 'paymentConfirmations',
    'flash_sale': 'flashSales',
    'new_product': 'newProducts',
    'promotion': 'promotions',
    'cart_abandonment': 'cartReminders',
    'review_request': 'reviewRequests',
    'wishlist_update': 'wishlistUpdates',
  };

  const preferenceKey = typePreferenceMap[type];
  if (!preferenceKey) return true; // Send if no specific preference

  return preferences[preferenceKey] !== false;
}

// Helper function to build user query based on filters
function buildUserQuery(filters) {
  const query = {};
  
  if (filters.city) query.city = filters.city;
  if (filters.country) query.country = filters.country;
  if (filters.role) query.role = filters.role;
  
  return query;
}

// Send order-related notifications
export const sendOrderNotificationController = async (req, res) => {
  try {
    const { orderId, type } = req.body;

    const order = await orderModel.findById(orderId).populate('buyer');
    if (!order) {
      return res.status(404).send({
        success: false,
        message: 'Order not found',
      });
    }

    const notificationTemplates = {
      order_confirmation: {
        title: '🎉 Order Confirmed!',
        body: `Your order #${order._id.toString().substr(-6)} has been confirmed and is being prepared.`,
        data: { orderId: order._id, type: 'order_update' }
      },
      order_shipped: {
        title: '📦 Order Shipped!',
        body: `Good news! Your order #${order._id.toString().substr(-6)} is on its way to you.`,
        data: { orderId: order._id, type: 'order_update' }
      },
      order_delivered: {
        title: '✅ Order Delivered!',
        body: `Your order #${order._id.toString().substr(-6)} has been delivered. Enjoy your purchase!`,
        data: { orderId: order._id, type: 'order_update' }
      }
    };

    const template = notificationTemplates[type];
    if (!template) {
      return res.status(400).send({
        success: false,
        message: 'Invalid notification type',
      });
    }

    // Send notification using existing function
    await sendNotificationToUser(order.buyer._id, {
      ...template,
      type,
      priority: 'high'
    });

    res.status(200).send({
      success: true,
      message: 'Order notification sent successfully',
    });
  } catch (error) {
    console.error('❌ Error sending order notification:', error);
    res.status(500).send({
      success: false,
      message: 'Error sending order notification',
      error: error.message,
    });
  }
};

// Helper function to send notification to a specific user
async function sendNotificationToUser(userId, notificationData) {
  const user = await userModel.findById(userId);
  if (!user) return false;

  const activePushTokens = user.pushTokens
    .filter(tokenObj => tokenObj.isActive)
    .map(tokenObj => tokenObj.token)
    .filter(token => Expo.isExpoPushToken(token));

  if (activePushTokens.length === 0) return false;

  const notification = new notificationModel({
    userId,
    ...notificationData,
    pushNotification: {
      pushTokens: activePushTokens,
      deliveryStatus: 'pending'
    }
  });

  await notification.save();

  const messages = activePushTokens.map(token => ({
    to: token,
    sound: 'default',
    ...notificationData,
    data: {
      ...notificationData.data,
      notificationId: notification._id.toString(),
    }
  }));

  const ticketChunks = expo.chunkPushNotifications(messages);
  for (let chunk of ticketChunks) {
    await expo.sendPushNotificationsAsync(chunk);
  }

  await notification.markAsSent();
  return true;
}
