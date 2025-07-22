import express from "express";
import {
  getAllUsersController,
  getUserProfileController,
  loginController,
  logoutController,
  passwordResetController,
  passwordResetOtpController,
  registerController,
  updatePasswordController,
  updateProfileController,
  updateProfilePicController,
  updateSavedAddressesController,
  verifyOtpController,
  blockUserController,
  deleteUserController,
  updateUserRoleController,
  getProfileController,
} from "../controllers/userController.js";
import { isAdmin, isAuth } from "../middlewares/authMiddleware.js";
import { profileUpload, singleUpload } from "../middlewares/multer.js";
import { rateLimit } from "express-rate-limit";

//RATE LIMITER
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: "draft-8", // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  // store: ... , // Redis, Memcached, etc. See below.
});

//ROUTER OBJECT
const router = express.Router();

//ROUTES
//REGISTER
router.post("/register", limiter, registerController);

//LOGIN
router.post("/login", limiter, loginController);

//PROFILE
router.get("/profile", isAuth, getUserProfileController);

// GET ALL USERS - ADMIN
router.get("/all-users", isAuth, isAdmin, getAllUsersController);

//LOGOUT
router.get("/logout", isAuth, logoutController);

//UPDATE PROFILE
router.put("/profile-update", isAuth, updateProfileController);

//UPDATE PASSWORD
router.put("/update-password", isAuth, updatePasswordController);

//UPDATE PROFILE PIC
router.put(
  "/update-picture",
  isAuth,
  profileUpload,
  updateProfilePicController
);

//UPDATE SAVED ADDRESSES
router.put("/update-saved-addresses", isAuth, updateSavedAddressesController);

//FORGOT PASSWORD
router.post("/reset-password", isAuth, passwordResetController);

//FORGOT PASSWORD WITH OTP
router.post("/request-otp", passwordResetOtpController);

//VERIFY OTP
router.post("/verify-otp", verifyOtpController);

// USER MANAGEMENT ROUTES - ADMIN
// BLOCK/UNBLOCK USER
router.put("/admin/users/:userId/block", isAuth, isAdmin, blockUserController);

// DELETE USER
router.delete("/admin/users/:userId", isAuth, isAdmin, deleteUserController);

// UPDATE USER ROLE
router.put(
  "/admin/users/:userId/role",
  isAuth,
  isAdmin,
  updateUserRoleController
);

//EXPORT
export default router;
