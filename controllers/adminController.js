import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import ActivityLog from "../models/activityLogModel.js";
import { createObjectCsvWriter } from "csv-writer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get user activity logs
export const getUserActivityLogsController = async (req, res) => {
  try {
    const { userId, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (userId) {
      query.user = userId;
    }

    const totalLogs = await ActivityLog.countDocuments(query);
    const logs = await ActivityLog.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      message: "User activity logs fetched successfully",
      logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalLogs / limit),
        totalItems: totalLogs,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error in fetching user activity logs",
      error,
    });
  }
};

// Export users data
export const exportUsersDataController = async (req, res) => {
  try {
    const { format } = req.query;
    const users = await userModel
      .find({}, "-password -resetPasswordToken -resetPasswordExpire")
      .lean();

    if (format === "csv") {
      // Get the directory name for the current module
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      // Ensure exports directory exists
      const exportsDir = path.join(__dirname, "../exports");
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir);
      }

      const timestamp = new Date().getTime();
      const filepath = path.join(exportsDir, `users_export_${timestamp}.csv`);

      const csvWriter = createObjectCsvWriter({
        path: filepath,
        header: [
          { id: "_id", title: "ID" },
          { id: "name", title: "Name" },
          { id: "email", title: "Email" },
          { id: "phone", title: "Phone" },
          { id: "role", title: "Role" },
          { id: "blocked", title: "Blocked" },
          { id: "createdAt", title: "Created At" },
          { id: "updatedAt", title: "Updated At" },
        ],
      });

      await csvWriter.writeRecords(users);

      return res.status(200).json({
        success: true,
        message: "Users data exported to CSV successfully",
        filepath: `/exports/users_export_${timestamp}.csv`,
      });
    } else {
      // For JSON format, just return the data directly
      return res.status(200).json({
        success: true,
        message: "Users data exported successfully",
        data: users,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error in exporting users data",
      error,
    });
  }
};

// Perform bulk action on users
export const bulkUserActionController = async (req, res) => {
  try {
    const { userIds, action } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User IDs are required and must be an array",
      });
    }

    let result;
    let message;

    switch (action) {
      case "block":
        result = await userModel.updateMany(
          { _id: { $in: userIds } },
          { $set: { blocked: true } }
        );
        message = "Users blocked successfully";
        break;
      case "unblock":
        result = await userModel.updateMany(
          { _id: { $in: userIds } },
          { $set: { blocked: false } }
        );
        message = "Users unblocked successfully";
        break;
      case "delete":
        result = await userModel.deleteMany({ _id: { $in: userIds } });
        message = "Users deleted successfully";
        break;
      case "makeAdmin":
        result = await userModel.updateMany(
          { _id: { $in: userIds } },
          { $set: { role: 1 } }
        );
        message = "Users promoted to admin successfully";
        break;
      case "removeAdmin":
        result = await userModel.updateMany(
          { _id: { $in: userIds } },
          { $set: { role: 0 } }
        );
        message = "Admin privileges removed successfully";
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid action specified",
        });
    }

    // Log the admin action
    if (req.user) {
      await ActivityLog.create({
        user: req.user._id,
        action: "admin_action",
        details: `Performed bulk action: ${action} on ${userIds.length} users`,
        metadata: {
          action,
          userIds,
          affectedCount: result.modifiedCount || result.deletedCount,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message,
      result,
      affectedUsers: userIds,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error in performing bulk user action",
      error,
    });
  }
};

// Get user analytics
export const getUserAnalyticsController = async (req, res) => {
  try {
    const { timeframe = "month" } = req.query;
    let startDate;
    const endDate = new Date();

    // Calculate start date based on timeframe
    switch (timeframe) {
      case "week":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "year":
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case "all":
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
    }

    // Count total users
    const totalUsers = await userModel.countDocuments();

    // Count new users in timeframe
    const newUsers = await userModel.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Count active users (with orders)
    const usersWithOrders = await orderModel.distinct("user");
    const activeUsers = usersWithOrders.length;

    // Count admin users
    const adminUsers = await userModel.countDocuments({ role: 1 });

    // Count blocked users
    const blockedUsers = await userModel.countDocuments({ blocked: true });

    // Get signups by date
    const signupsByDate = await userModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          date: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "User analytics retrieved successfully",
      data: {
        totalUsers,
        newUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        adminUsers,
        regularUsers: totalUsers - adminUsers,
        blockedUsers,
        signupsByDate,
        timeframe,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error in retrieving user analytics",
      error,
    });
  }
};

// Send email to users
export const sendEmailToUsersController = async (req, res) => {
  try {
    const { userIds, subject, content, emailType } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User IDs are required and must be an array",
      });
    }

    if (!subject || !content) {
      return res.status(400).json({
        success: false,
        message: "Email subject and content are required",
      });
    }

    // In a real implementation, this would connect to an email service
    // For now, we'll just log and simulate success
    console.log(`Sending ${emailType} email to ${userIds.length} users`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${content}`);

    // Log the admin action
    if (req.user) {
      await ActivityLog.create({
        user: req.user._id,
        action: "admin_action",
        details: `Sent ${emailType} email to ${userIds.length} users`,
        metadata: {
          emailType,
          subject,
          recipients: userIds,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Email sent successfully to ${userIds.length} users`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error in sending email to users",
      error,
    });
  }
};

// Toggle user verification status
export const toggleUserVerificationController = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isVerified } = req.body;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isVerified = isVerified;
    await user.save();

    // Log the admin action
    if (req.user) {
      await ActivityLog.create({
        user: req.user._id,
        action: "admin_action",
        details: `${isVerified ? "Verified" : "Unverified"} user ${user.name}`,
        metadata: {
          targetUserId: userId,
          isVerified,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: `User ${isVerified ? "verified" : "unverified"} successfully`,
      userId,
      isVerified,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error in toggling user verification",
      error,
    });
  }
};
