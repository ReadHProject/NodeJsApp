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
