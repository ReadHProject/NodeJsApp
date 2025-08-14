import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import JWT from "jsonwebtoken";

// Schema
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "name is required"],
    },
    email: {
      type: String,
      required: [true, "email is required"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "password is required"],
      minLength: [6, "password must be at least 6 characters"],
    },
    address: {
      type: String,
      required: [true, "address is required"],
    },
    city: {
      type: String,
      required: [true, "city is required"],
    },
    country: {
      type: String,
      required: [true, "country name is required"],
    },
    contact: {
      type: String,
    },
    phone: {
      type: String,
      required: [true, "phone is required"],
    },
    profilePic: {
      // Legacy fields for backward compatibility
      public_id: { type: String, default: null },
      url: { type: String, default: null },
      
      // Enhanced hybrid storage fields (backward compatible)
      localPath: { type: String, default: null },
      cloudinaryUrl: { type: String, default: null },
      filename: { type: String, default: null },
      originalName: { type: String, default: null },
      uploadedAt: { type: Date, default: Date.now },
      isCloudinaryUploaded: { type: Boolean, default: false },
      storageType: { type: String, enum: ['local', 'cloudinary', 'hybrid', 'legacy'], default: 'local' },
      cloudinaryUploadedAt: { type: Date, default: null },
      
      // Metadata for better file management
      metadata: {
        size: { type: Number, default: null },
        mimetype: { type: String, default: null },
        width: { type: Number, default: null },
        height: { type: Number, default: null },
        format: { type: String, default: null }
      },
      
      // Migration status for data migration purposes
      migrationStatus: {
        type: String,
        enum: ['pending', 'migrating', 'completed', 'failed', 'not_required'],
        default: 'not_required'
      }
    },
    savedAddresses: {
      type: Array,
      default: [],
    },
    answer: {
      type: String,
      required: [true, "answer is required"],
      default: "not-provided",
    },
    role: {
      type: String,
      default: "user",
    },
    blocked: {
      type: String,
      default: "false",
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    resetPasswordOtp: {
      type: String,
    },
    resetPasswordOtpExpires: {
      type: Date,
    },
    // Notification fields
    pushTokens: [{
      token: { type: String, required: true },
      deviceInfo: {
        platform: { type: String, required: true }, // 'ios' | 'android' | 'web'
        deviceName: { type: String },
        deviceType: { type: String } // 'phone' | 'tablet' | 'desktop'
      },
      isActive: { type: Boolean, default: true },
      lastUsed: { type: Date, default: Date.now },
      createdAt: { type: Date, default: Date.now }
    }],
    notificationPreferences: {
      // Transactional notifications (usually always enabled)
      orderUpdates: { type: Boolean, default: true },
      paymentConfirmations: { type: Boolean, default: true },
      shippingUpdates: { type: Boolean, default: true },
      
      // Marketing notifications (user can opt out)
      promotions: { type: Boolean, default: true },
      newProducts: { type: Boolean, default: true },
      flashSales: { type: Boolean, default: true },
      
      // Engagement notifications
      cartReminders: { type: Boolean, default: true },
      reviewRequests: { type: Boolean, default: true },
      wishlistUpdates: { type: Boolean, default: true },
      
      // Notification timing
      quietHours: {
        enabled: { type: Boolean, default: false },
        startTime: { type: String, default: '22:00' }, // 10 PM
        endTime: { type: String, default: '08:00' }    // 8 AM
      }
    },
  },
  { timestamps: true }
);

//Functions
//Hash function
//1. userSchema.pre("save", async function (next) {
// This is a pre-save middleware for Mongoose.
// It runs before saving any user to the database.
// The function keyword gives access to this (the user document).

// 2. if (!this.isModified("password")) return next();
// Checks if the password field was changed or added.
// 🔒 If not modified, it skips hashing and moves on.
// Useful when updating other fields like name or email—no need to rehash the password.

// 3. this.password = await bcrypt.hash(this.password, 10);
// If the password was modified, this line:
// Takes this.password
// Hashes it using bcrypt with a salt round of 10
// Saves the hashed password back into this.password
// 🧂 Salt rounds (10) add extra randomness to make the hash stronger.

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    console.log(error);
    next(error);
  }
});

//Compare function
// ✅ userSchema.methods.comparePassword = ...
// This adds a function to your User schema.
// Now, every User object (like user) will be able to call user.comparePassword(...).

// ✅ async function (plainPassword)
// This is an async function that takes the password a user enters (e.g., "123456" from a login form).

// ✅ await bcrypt.compare(plainPassword, this.password)
// bcrypt.compare() checks if the plain password matches the encrypted password stored in the database.
// this.password refers to the current user's stored hashed password (like $2a$10$...).
// It returns true if passwords match, otherwise false.

userSchema.methods.comparePassword = async function (plainPassword) {
  try {
    return bcrypt.compare(plainPassword, this.password);
  } catch (error) {
    console.log(error);
    return false;
  }
};

//JWT Token
// ✅ userSchema.methods.generateToken = function () { ... }
// Adds a function named generateToken to the userSchema.
// This function can now be used on any user object, like:
// const token = user.generateToken();

// ✅ return JWT.sign({ _id: this._id }, process.env.JWT_SECRET, { ... })
// JWT.sign(...) creates a token.
// { _id: this._id }: Adds the user's _id inside the token.
// this._id refers to the current user instance.
// process.env.JWT_SECRET: A secret key (from your .env file) used to secure the token.
// { expiresIn: "7d" }: The token will expire in 7 days.

// ✅ You could change "7d" to "5m" (5 minutes) if you want short-lived tokens for testing or security reasons.

// ✅ Summary in Simple Words:
// This function is used to create a login token (JWT) for a user, which includes their _id and expires after 7 days. You can use this token to keep the user logged in securely.

userSchema.methods.generateToken = function () {
  try {
    return JWT.sign({ _id: this._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
  } catch (error) {
    console.log(error);
  }
};

export const userModel = mongoose.model("Users", userSchema);
export default userModel;
