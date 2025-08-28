import userModel from "../models/userModel.js";
import cloudinary from "cloudinary";
import { getDataUri } from "../utils/feature.js";
import { generateRandomOTP } from "../utils/feature.js";
import { Resend } from "resend";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//REGISTER
export const registerController = async (req, res) => {
  try {
    const { name, email, password, address, city, phone, country, answer } =
      req.body;
    //VALIDATION
    if (
      !name ||
      !email ||
      !password ||
      !address ||
      !city ||
      !phone ||
      !country ||
      !answer
    ) {
      return res.status(500).json({
        success: false,
        message: "Please provide all fields",
      });
    }

    //CHECK EXISTING USER
    const existingUser = await userModel.findOne({ email });

    //VALIDATION
    if (existingUser) {
      return res.status(500).json({
        success: false,
        message: "email already taken",
      });
    }

    const user = await userModel.create({
      name,
      email,
      password,
      address,
      city,
      phone,
      country,
      answer,
    });

    return res.status(201).json({
      success: true,
      message: "Registration success, please login",
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: `Error in register API: ${console.log(error)}`,
      error,
    });
  }
};

//LOGIN
export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    //VALIDATION
    if (!email || !password) {
      return res.status(500).send({
        success: false,
        message: "Please add email or password",
      });
    }

    //CHECK USER
    const user = await userModel.findOne({ email });
    //User Validation
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    //Check if password is hashed or not
    // const isHashed =
    //   user.password.startsWith("$2a$") || user.password.startsWith("$2b$");
    // if (isHashed) {
    //   //Check Password
    //   const isMatch = await user.comparePassword(password);
    //   //Password Validation
    //   if (!isMatch) {
    //     return res.status(500).send({
    //       success: false,
    //       message: "Invalid Credentials",
    //     });
    //   }
    // } else {
    //   if (user.password !== password) {
    //     return res.status(500).send({
    //       success: false,
    //       message: "Invalid Credentials",
    //     });
    //   }
    // }

    //CHECK PASSWORD
    const isMatch = await user.comparePassword(password);

    //PASSWORD VALIDATION
    if (!isMatch) {
      return res.status(500).send({
        success: false,
        message: "Invalid Credentials",
      });
    }

    //TOKEN
    const token = user.generateToken();
    
    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    // Set cookie for backward compatibility
    res.cookie("token", token, {
      expires: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      secure: process.env.NODE_ENV === "development" ? true : false,
      httpOnly: process.env.NODE_ENV === "development" ? true : false,
    });

    // Send token in response body for Bearer token auth
    return res.status(200).send({
      success: true,
      message: "Login Successfully",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        // Other non-sensitive user data
        address: user.address,
        city: user.city,
        country: user.country,
        phone: user.phone,
        pic: user.pic,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: `Error in Login API: ${console.log(error)}`,
      error,
    });
  }
};

//GET USER PROFILE
export const getUserProfileController = async (req, res) => {
  try {
    // console.log(req.user._id);
    const user = await userModel.findById(req.user._id);
    user.password = undefined; //not to show password field in console log or frontend
    return res.status(200).send({
      success: true,
      message: "User Profile Fetched Successfully",
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: `Error in Get User Profile API: ${console.log(error)}`,
      error,
    });
  }
};

// GET ALL USERS - ADMIN
export const getAllUsersController = async (req, res) => {
  try {
    const users = await userModel.find({}, { password: 0 }); // Fetch all fields except password

    return res.status(200).send({
      success: true,
      message: "All Users Fetched Successfully",
      totalUsers: users.length,
      users,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in GET ALL USERS API",
      error,
    });
  }
};

//LOGOUT
export const logoutController = async (req, res) => {
  try {
    // Clear the cookie for backward compatibility
    res.cookie("token", "", {
      expires: new Date(Date.now()),
      secure: process.env.NODE_ENV === "development" ? true : false,
      httpOnly: process.env.NODE_ENV === "development" ? true : false,
    });

    // With Bearer token, most of the logout logic happens client-side
    // by removing the token from AsyncStorage
    return res.status(200).send({
      success: true,
      message: "Logout Successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: `Error in Get Logout API: ${console.log(error)}`,
      error,
    });
  }
};

//UPDATE USER PROFILE
export const updateProfileController = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    const { name, email, address, city, country, phone } = req.body;

    //VALIDATION + UPDATE
    if (name) user.name = name;
    if (email) user.email = email;
    if (address) user.address = address;
    if (city) user.city = city;
    if (country) user.country = country;
    if (phone) user.phone = phone;

    //SAVE USER
    await user.save();
    return res.status(200).send({
      success: true,
      message: "User Profile Updated Successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: `Error in Get Update Profile API: ${console.log(error)}`,
      error,
    });
  }
};

//UPDATE USER PASSWORD
export const updatePasswordController = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    const { oldPassword, newPassword } = req.body;

    //VALIDATION + UPDATE
    if (!oldPassword || !newPassword) {
      return res.status(500).send({
        success: false,
        message: "Please provide old and new password",
      });
    }

    //OLD PASSWORD CHECK
    const isMatch = await user.comparePassword(oldPassword);
    //VALIDATION
    if (!isMatch) {
      return res.status(500).send({
        success: false,
        message: "Invalid Old Password",
      });
    }
    user.password = newPassword;
    await user.save();
    return res.status(200).send({
      success: true,
      message: "User Password Updated Successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: `Error in Get Update Password API: ${console.log(error)}`,
      error,
    });
  }
};

//UPDATE USER PROFILE PHOTO
// export const updateProfilePicController = async (req, res) => {
//   try {
//     const user = await userModel.findById(req.user._id);

//     //GET FILE FROM CLIENT(USER) PHOTO
//     const file = getDataUri(req.file);

//     if (user.profilePic?.public_id) {
//       //DELETE PREVIOUS PROFILE IMAGE
//       await cloudinary.v2.uploader.destroy(user.profilePic.public_id);
//     }

//     //UPDATE PROFILE IMAGE
//     const cdb = await cloudinary.v2.uploader.upload(file.content);
//     user.profilePic = {
//       public_id: cdb.public_id,
//       url: cdb.secure_url,
//     };

//     //Save Function
//     await user.save();
//     return res.status(200).send({
//       success: true,
//       message: "User Profile Pic Updated Successfully",
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).send({
//       success: false,
//       message: `Error in Get Update Profile Pic API: ${console.log(error)}`,
//       error,
//     });
//   }
// };

export const updateProfilePicController = async (req, res) => {
  try {
    console.log('🔄 updateProfilePicController called');
    
    const user = await userModel.findById(req.user._id);

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    if (!req.file) {
      return res.status(400).send({
        success: false,
        message: "No image uploaded",
      });
    }

    console.log('📁 Processing profile picture upload:', {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Import imageUtils functions
    const { uploadFileToCloudinary, formatCloudinaryResultsForDB, deleteImagesFromCloudinary } = await import('../utils/imageUtils.js');
    
    // Upload to Cloudinary with hybrid storage
    const folder = `ecommerce/users/profile`;
    const cloudinaryResult = await uploadFileToCloudinary(req.file, {
      folder,
      public_id: `profile_${user._id}_${Date.now()}`,
      quality: "auto:good",
      fetch_format: "auto",
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto:good" }
      ]
    });

    if (!cloudinaryResult.success) {
      throw new Error(`Failed to upload profile picture: ${cloudinaryResult.error}`);
    }

    console.log('✅ Cloudinary upload successful');

    // Delete old profile picture from Cloudinary if it exists
    if (user.profilePic?.public_id && user.profilePic?.isCloudinaryUploaded) {
      console.log('🗑️ Deleting old profile picture from Cloudinary');
      try {
        await deleteImagesFromCloudinary([user.profilePic]);
      } catch (deleteError) {
        console.warn('⚠️ Failed to delete old profile picture:', deleteError.message);
      }
    }

    // Also handle local file cleanup for backward compatibility
    const profileDir = path.join(process.cwd(), "uploads", "profile");
    if (user.profilePic?.filename) {
      const oldFilePath = path.join(profileDir, user.profilePic.filename);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
          console.log('🗑️ Deleted old local profile picture');
        } catch (deleteError) {
          console.warn('⚠️ Failed to delete old local file:', deleteError.message);
        }
      }
    }

    // Format the result for database storage with hybrid approach
    const formattedImages = formatCloudinaryResultsForDB([cloudinaryResult], [req.file]);
    
    if (formattedImages.length === 0) {
      throw new Error('Failed to format image data for database storage');
    }

    // Update user profile picture with hybrid storage structure
    const imageData = formattedImages[0];
    user.profilePic = {
      // Legacy fields for backward compatibility
      public_id: imageData.public_id,
      url: imageData.url,
      
      // Enhanced hybrid storage fields
      localPath: imageData.localPath,
      cloudinaryUrl: imageData.cloudinaryUrl,
      filename: imageData.filename,
      originalName: imageData.originalName,
      uploadedAt: imageData.uploadedAt,
      isCloudinaryUploaded: imageData.isCloudinaryUploaded,
      storageType: imageData.storageType,
      cloudinaryUploadedAt: imageData.cloudinaryUploadedAt,
      
      // Metadata
      metadata: imageData.metadata,
      migrationStatus: imageData.migrationStatus
    };

    // Save user
    await user.save();
    
    console.log('✅ Profile picture updated successfully');
    
    return res.status(200).send({
      success: true,
      message: "User Profile Pic Updated Successfully",
      profilePic: {
        url: user.profilePic.url,
        cloudinaryUrl: user.profilePic.cloudinaryUrl,
        storageType: user.profilePic.storageType
      }
    });
  } catch (error) {
    console.error('❌ Error in updateProfilePicController:', error);
    return res.status(500).send({
      success: false,
      message: `Error in Update Profile Pic API: ${error.message}`,
      error: error.message,
    });
  }
};

//FORGOT PASSWORD
export const passwordResetController = async (req, res) => {
  try {
    //GET EMAIL || NEWPASSWORD || ANSWER
    const { email, newPassword, answer } = req.body;

    //VALIDATION
    if (!email || !newPassword || !answer) {
      return res.status(500).send({
        success: false,
        message: "Please provide all fields",
      });
    }

    //FIND USER
    const user = await userModel.findOne({ email, answer });
    //VALIDATION
    if (!user) {
      return res.status(500).send({
        success: false,
        message: "User Not Found",
      });
    }

    //VALIDATION + UPDATE
    if (user.answer != answer) {
      return res.status(500).send({
        success: false,
        message: "Invalid Answer",
      });
    }
    user.password = newPassword;
    await user.save();
    return res.status(200).send({
      success: true,
      message: "Password Reset Successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: `Error in Password Reset API: ${console.log(error)}`,
      error,
    });
  }
};

//FORGOT PASSWORD WITH OTP
export const passwordResetOtpController = async (req, res) => {
  try {
    //GET EMAIL
    const { email } = req.body;

    //VALIDATION
    if (!email) {
      return res.status(500).json({
        success: false,
        message: "Please provide email",
      });
    }

    //FIND USER WITH EMAIL
    const user = await userModel.findOne({ email });
    //VALIDATION
    if (!user) {
      return res.status(500).json({
        success: false,
        message: "User Not Found..Check Your Email ID",
      });
    }

    const otp = generateRandomOTP();

    // Store OTP in user document with expiration time
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = Date.now() + 10 * 60 * 1000; // 10 Minutes
    await user.save();

    //Resend Config
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "My EcommerceApp <onboarding@resend.dev>",
      to: [email],
      subject: "Your OTP Code",
      html: `<p>Your OTP is: <strong>${otp}</strong></p><p>This code will expire in 10 minutes.</p>`,
    });

    return res.status(200).json({
      success: true,
      message: "OTP Sent Successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: `Error in Password Reset OTP API: ${error.message}`,
      error,
    });
  }
};

//VERIFY OTP
export const verifyOtpController = async (req, res) => {
  try {
    //GET OTP
    const { otp, newPassword, email } = req.body;

    //VALIDATION
    if (!newPassword || !otp || !email) {
      return res.status(500).json({
        success: false,
        message: "Please provide all fields",
      });
    }

    //FIND USER WITH EMAIL
    const user = await userModel.findOne({
      email,
      resetPasswordOtp: otp,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // Update password and clear OTP fields
    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password Reset Successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: `Error in Verify OTP API: ${error.message}`,
      error,
    });
  }
};

//UPDATE SAVED ADDRESSES
export const updateSavedAddressesController = async (req, res) => {
  try {
    const { savedAddresses } = req.body;

    if (!savedAddresses || !Array.isArray(savedAddresses)) {
      return res.status(400).send({
        success: false,
        message: "Invalid addresses format",
      });
    }

    const user = await userModel.findById(req.user._id);

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    // Update saved addresses
    user.savedAddresses = savedAddresses;
    await user.save();

    return res.status(200).send({
      success: true,
      message: "Saved addresses updated successfully",
      savedAddresses: user.savedAddresses,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: `Error in Update Saved Addresses API: ${error.message}`,
      error,
    });
  }
};

//BLOCK/UNBLOCK USER - ADMIN
export const blockUserController = async (req, res) => {
  try {
    const { userId } = req.params;
    const { blocked } = req.body;

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    // Update block status
    user.blocked = blocked;
    await user.save();

    res.status(200).send({
      success: true,
      message: `User ${blocked ? "blocked" : "unblocked"} successfully`,
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error in blockUser API",
      error,
    });
  }
};

//DELETE USER - ADMIN
export const deleteUserController = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    await userModel.findByIdAndDelete(userId);

    res.status(200).send({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error in deleteUser API",
      error,
    });
  }
};

//UPDATE USER ROLE - ADMIN
export const updateUserRoleController = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    // Update role
    user.role = role;
    await user.save();

    res.status(200).send({
      success: true,
      message: "User role updated successfully",
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error in updateUserRole API",
      error,
    });
  }
};

//GET ADMIN STATS - ADMIN
export const getAdminStatsController = async (req, res) => {
  try {
    // Get all users
    const allUsers = await userModel.find({}, { password: 0 });
    const totalUsers = allUsers.length;
    
    // Calculate active users (users who have logged in within last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeUsers = allUsers.filter(user => {
      if (!user.lastLogin) {
        // If no lastLogin, consider user active if created within last 30 days
        const createdAt = new Date(user.createdAt || user._id.getTimestamp());
        return createdAt > thirtyDaysAgo;
      }
      const lastLogin = new Date(user.lastLogin);
      return lastLogin > thirtyDaysAgo;
    }).length;
    
    // Calculate blocked users
    const blockedUsers = allUsers.filter(user => 
      user.blocked === true || user.blocked === "true" || user.blocked === "yes" || user.blocked === 1
    ).length;
    
    // Calculate admin users
    const adminUsers = allUsers.filter(user => 
      user.role === "admin" || user.role === "ADMIN"
    ).length;
    
    // Calculate regular users (non-admin, non-blocked)
    const regularUsers = allUsers.filter(user => {
      const isAdmin = user.role === "admin" || user.role === "ADMIN";
      const isBlocked = user.blocked === true || user.blocked === "true" || user.blocked === "yes" || user.blocked === 1;
      return !isAdmin && !isBlocked;
    }).length;
    
    // Calculate users with push tokens (users who can receive notifications)
    const usersWithPushTokens = allUsers.filter(user => 
      user.pushTokens && user.pushTokens.length > 0
    ).length;
    
    // Calculate new users this month
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newUsersThisMonth = allUsers.filter(user => {
      const createdAt = new Date(user.createdAt || user._id.getTimestamp());
      return createdAt > oneMonthAgo;
    }).length;
    
    const stats = {
      totalUsers,
      activeUsers,
      blockedUsers,
      adminUsers,
      regularUsers,
      usersWithPushTokens,
      newUsersThisMonth,
      // Additional calculated metrics
      activeUserPercentage: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
      pushTokenCoverage: totalUsers > 0 ? Math.round((usersWithPushTokens / totalUsers) * 100) : 0,
      lastUpdated: new Date().toISOString()
    };
    
    return res.status(200).send({
      success: true,
      message: "Admin stats fetched successfully",
      data: stats
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error in Get Admin Stats API",
      error: error.message,
    });
  }
};

//GET USER PROFILE
export const getProfileController = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    user.password = undefined;
    return res.status(200).send({
      success: true,
      message: "User Profile Fetched Successfully",
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error in Get User Profile API",
      error,
    });
  }
};
