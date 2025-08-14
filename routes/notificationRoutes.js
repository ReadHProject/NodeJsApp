import express from 'express';
import {
  registerPushTokenController,
  sendPushNotificationController,
  sendBulkNotificationController,
  getUserNotificationsController,
  updatePreferencesController,
  markNotificationReadController,
  sendOrderNotificationController,
} from '../controllers/notificationController.js';
import { requireSignIn, isAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// PUBLIC ROUTES (no authentication required)

// Register push token (can be used by anonymous users)
router.post('/register-token', registerPushTokenController);

// PROTECTED ROUTES (authentication required)

// Send single notification (admin only)
router.post('/send', requireSignIn, isAdmin, sendPushNotificationController);

// Send bulk notifications (admin only)
router.post('/send-bulk', requireSignIn, isAdmin, sendBulkNotificationController);

// Send order-related notifications (admin only)
router.post('/send-order', requireSignIn, isAdmin, sendOrderNotificationController);

// Get user notifications
router.get('/user/:userId', requireSignIn, getUserNotificationsController);

// Update notification preferences
router.put('/preferences', requireSignIn, updatePreferencesController);

// Mark notification as read
router.put('/read/:notificationId', requireSignIn, markNotificationReadController);

// ADMIN ROUTES (admin authentication required)

// Get notification analytics (future feature)
router.get('/analytics', requireSignIn, isAdmin, (req, res) => {
  res.status(200).send({
    success: true,
    message: 'Analytics endpoint - coming soon',
  });
});

// Get all notifications (admin view)
router.get('/admin/all', requireSignIn, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, status } = req.query;
    const skip = (page - 1) * limit;
    const query = {};

    if (type) query.type = type;
    if (status) query.status = status;

    const notificationModel = (await import('../models/notificationModel.js')).default;
    
    const notifications = await notificationModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('userId', 'name email');

    const total = await notificationModel.countDocuments(query);

    res.status(200).send({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching admin notifications:', error);
    res.status(500).send({
      success: false,
      message: 'Error fetching notifications',
      error: error.message,
    });
  }
});

export default router;
