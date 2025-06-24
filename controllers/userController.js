import userModel from "../models/userModel.js";
import cloudinary from "cloudinary";
import { getDataUri } from "../utils/feature.js";
import { generateRandomOTP } from "../utils/feature.js";
import { Resend } from "resend";

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
      return res.status(500).send({
        success: false,
        message: "Please provide all fields",
      });
    }

    //CHECK EXISTING USER
    const existingUser = await userModel.findOne({ email });

    //VALIDATION
    if (existingUser) {
      return res.status(500).send({
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

    return res.status(201).send({
      success: true,
      message: "Registration success, please login",
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
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

    return res
      .status(200)
      .cookie("token", token, {
        expires: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        secure: process.env.NODE_ENV === "development" ? true : false,
        httpOnly: process.env.NODE_ENV === "development" ? true : false,
      })
      .send({
        success: true,
        message: "Login Successfully",
        token,
        user,
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

//LOGOUT
export const logoutController = async (req, res) => {
  try {
    return res
      .status(200)
      .cookie("token", "", {
        expires: new Date(Date.now()),
        secure: process.env.NODE_ENV === "development" ? true : false,
        httpOnly: process.env.NODE_ENV === "development" ? true : false,
      })
      .send({
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
export const updateProfilePicController = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);

    //GET FILE FROM CLIENT(USER) PHOTO
    const file = getDataUri(req.file);

    //DELETE PREVIOUS PROFILE IMAGE
    await cloudinary.v2.uploader.destroy(user.profilePic.public_id);

    //UPDATE PROFILE IMAGE
    const cdb = await cloudinary.v2.uploader.upload(file.content);
    user.profilePic = {
      public_id: cdb.public_id,
      url: cdb.secure_url,
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
      return res.status(500).send({
        success: false,
        message: "Please provide email",
      });
    }

    //FIND USER WITH EMAIL
    const user = await userModel.findOne({ email });
    //VALIDATION
    if (!user) {
      return res.status(500).send({
        success: false,
        message: "User Not Found..Check Your Email ID",
      });
    }

    const otp = generateRandomOTP();

    //Resend Config
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "My EcommerceApp <onboarding@resend.dev>",
      to: [email],
      subject: "Your OTP Code",
      html: `<p>Your OTP is: <strong>${otp}</strong></p><p>This code will expire in 10 minutes.</p>`,
    });

    req.session.otp = otp;
    req.session.otpExpires = Date.now() + 10 * 60 * 1000; //10 Minutes

    return res.status(200).send({
      success: true,
      message: "OTP Sent Successfully",
      otp,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: `Error in Password Reset OTP API: ${console.log(error)}`,
      error,
    });
  }
};

//VERIFY OTP
export const verifyOtpController = async (req, res) => {
  try {
    //GET OTP
    const { otp, newPassword } = req.body;

    const user = await userModel.findById(req.user._id);

    //VALIDATION
    if (!newPassword || !otp) {
      return res.status(500).send({
        success: false,
        message: "Please provide all fields",
      });
    }

    if (!req.session.otp || !req.session.otpExpires) {
      return res.status(400).send({
        success: false,
        message: "OTP not found",
      });
    }

    if (Date.now() > req.session.otpExpires) {
      return res.status(400).send({
        success: false,
        message: "OTP expired",
        remainingTime: Math.floor((req.session.otpExpires - Date.now()) / 1000),
      });
    }

    // console.log(otp);
    // console.log(req.session.otp);
    if (otp === req.session.otp) {
      user.password = newPassword;
      await user.save();
      return res.status(200).send({
        success: true,
        message: "Password Reset Successfully",
      });
    } else {
      return res.status(400).send({
        success: false,
        message: "Invalid OTP",
        otp: req.session.otp,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: `Error in Verify OTP API: ${console.log(error)}`,
      error,
    });
  }
};
