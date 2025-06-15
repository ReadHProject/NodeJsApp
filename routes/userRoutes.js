import express from "express";
import {
  getUserProfileController,
  loginController,
  logoutController,
  passwordResetController,
  passwordResetOtpController,
  registerController,
  updatePasswordController,
  updateProfileController,
  updateProfilePicController,
  verifyOtpController,
} from "../controllers/userController.js";
import { isAuth } from "../middlewares/authMiddleware.js";
import { singleUpload } from "../middlewares/multer.js";

//ROUTER OBJECT
const router = express.Router();

//ROUTES
//REGISTER
router.post("/register", registerController);

//LOGIN
router.post("/login", loginController);

//PROFILE
router.get("/profile", isAuth, getUserProfileController);

//LOGOUT
router.get("/logout", isAuth, logoutController);

//UPDATE PROFILE
router.put("/profile-update", isAuth, updateProfileController);

//UPDATE PASSWORD
router.put("/update-password", isAuth, updatePasswordController);

//UPDATE PROFILE PIC
router.put("/update-picture", isAuth, singleUpload, updateProfilePicController);

//FORGOT PASSWORD
router.post("/reset-password", isAuth, passwordResetController);

//FORGOT PASSWORD WITH OTP
router.post("/request-otp", isAuth, passwordResetOtpController);

//VERIFY OTP
router.post("/verify-otp", isAuth, verifyOtpController);

//EXPORT
export default router;
