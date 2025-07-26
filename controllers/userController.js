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

    const profileDir = path.join(process.cwd(), "uploads", "profile");

    // ✅ Ensure uploads/profile folder exists
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }

    const newFileName = req.file.filename;
    const newImagePath = `/uploads/profile/${newFileName}`;
    const oldFileName = user.profilePic?.public_id;

    // ✅ Delete old image from /uploads/profile if it exists
    if (oldFileName) {
      const oldFilePath = path.join(profileDir, oldFileName);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // ✅ Update or Insert new image
    user.profilePic = {
      public_id: newFileName,
      url: newImagePath,
    };

    //Save Function
    await user.save();
    return res.status(200).send({
      success: true,
      message: "User Profile Pic Updated Successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: `Error in Get Update Profile Pic API: ${console.log(error)}`,
      error,
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
