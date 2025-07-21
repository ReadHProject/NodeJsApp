import express from "express";
import { isAdmin, isAuth } from "../middlewares/authMiddleware.js";
import {
  getUserActivityLogsController,
  exportUsersDataController,
  bulkUserActionController,
  getUserAnalyticsController,
  sendEmailToUsersController,
  toggleUserVerificationController,
} from "../controllers/adminController.js";

// Router object
const router = express.Router();

// Routes

// GET USER ACTIVITY LOGS
router.get("/activity-logs", isAuth, isAdmin, getUserActivityLogsController);

// EXPORT USERS DATA
router.get("/export-users", isAuth, isAdmin, exportUsersDataController);

// BULK USER ACTIONS
router.post("/bulk-user-action", isAuth, isAdmin, bulkUserActionController);

// GET USER ANALYTICS
router.get("/user-analytics", isAuth, isAdmin, getUserAnalyticsController);

// SEND EMAIL TO USERS
router.post("/send-email", isAuth, isAdmin, sendEmailToUsersController);

// TOGGLE USER VERIFICATION
router.put(
  "/toggle-verification/:userId",
  isAuth,
  isAdmin,
  toggleUserVerificationController
);

// Export
export default router;
