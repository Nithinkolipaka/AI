/**
 * USER MODEL
 * 
 * Mongoose schema and model for users.
 * Handles user data, authentication, and profile information.
 */

import mongoose, { Document, Schema } from "mongoose";
import bcryptjs from "bcryptjs";
import { logger } from "../utils/logger.js";

/**
 * USER INTERFACE
 * 
 * Defines the structure of user documents.
 */
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "user" | "admin";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  comparePassword(password: string): Promise<boolean>;
}

/**
 * USER SCHEMA
 * 
 * Defines the MongoDB schema for users.
 * Includes validation, indexes, and password hashing.
 */
const userSchema = new Schema<IUser>(
  {
    /**
     * EMAIL FIELD
     * 
     * Unique email for user authentication.
     * Used for login and identification.
     */
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
      index: true, // For faster email lookups
    },

    /**
     * PASSWORD FIELD
     * 
     * Hashed password for authentication.
     * Never stored in plain text!
     */
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Excluded from queries by default for security
    },

    /**
     * FIRST NAME
     */
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },

    /**
     * LAST NAME
     */
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },

    /**
     * ROLE FIELD
     * 
     * User role for access control.
     * Can be "user" (default) or "admin".
     */
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    /**
     * ACTIVE STATUS
     * 
     * Whether the user account is active.
     * Allows soft deactivation without deletion.
     */
    isActive: {
      type: Boolean,
      default: true,
    },

    /**
     * LAST LOGIN TIMESTAMP
     * 
     * Tracks when user last logged in.
     * Useful for security and analytics.
     */
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    /**
     * SCHEMA OPTIONS
     * 
     * timestamps: true - Automatically add createdAt and updatedAt
     * toJSON - Custom serialization for JSON output
     */
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        // Remove password from JSON output
        delete ret.password;
        return ret;
      },
    },
  }
);

/**
 * PRE-SAVE HOOK
 * 
 * Middleware that runs before saving a user document.
 * Used to hash password if it's new or modified.
 */
userSchema.pre<IUser>("save", async function (next) {
  try {
    // Only hash password if it's new or modified
    if (!this.isModified("password")) {
      return next();
    }

    /**
     * PASSWORD HASHING STEPS
     * 
     * 1. Generate salt (random data for hashing)
     * 2. Hash password with salt
     * 3. Replace plain password with hash
     * 4. Continue to save
     */
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(this.password, salt);

    this.password = hashedPassword;

    logger.debug(
      `Password hashed for user: ${this.email}`,
      "UserSchema.preSave"
    );

    next();
  } catch (error: any) {
    logger.error(
      "Error hashing password",
      "UserSchema.preSave",
      error
    );
    next(error);
  }
});

/**
 * INSTANCE METHOD: COMPARE PASSWORD
 * 
 * Compares provided password with stored hash.
 * Used during login authentication.
 * 
 * @param password Plain text password from login
 * @returns true if passwords match, false otherwise
 */
userSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  try {
    /**
     * COMPARISON STEPS
     * 
     * 1. Hash provided password with stored salt
     * 2. Compare with stored hash
     * 3. Return result
     * 
     * Uses bcryptjs.compare() which handles salt extraction.
     */
    return await bcryptjs.compare(password, this.password);
  } catch (error: any) {
    logger.error(
      "Error comparing passwords",
      "UserSchema.comparePassword",
      error
    );
    throw error;
  }
};

/**
 * CREATE USER MODEL
 * 
 * Compiles the schema into a model.
 * Models are used to create and retrieve documents.
 */
export const User = mongoose.model<IUser>("User", userSchema);

export default User;
