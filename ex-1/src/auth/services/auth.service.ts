/**
 * AUTHENTICATION SERVICE
 * 
 * Handles user registration, login, and authentication logic.
 */

import { User, type IUser } from "./models/user.model.js";
import { jwtService } from "./jwt.service.js";
import {
  ValidationError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
} from "../utils/errors.js";
import { logger } from "../utils/logger.js";

/**
 * AUTHENTICATION SERVICE CLASS
 */
export class AuthService {
  /**
   * REGISTER NEW USER
   * 
   * Creates a new user account with email and password.
   * 
   * @param email User email
   * @param password User password
   * @param firstName First name
   * @param lastName Last name
   * @returns User data and JWT token
   */
  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<{ user: any; token: string }> {
    try {
      /**
       * VALIDATION STEPS
       * 
       * 1. Check if user already exists
       * 2. Validate password strength
       * 3. Validate email format
       */
      logger.debug(`Registering user: ${email}`, "AuthService.register");

      // Check if user exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });

      if (existingUser) {
        throw new ConflictError(`User with email ${email} already exists`);
      }

      // Validate password
      if (password.length < 6) {
        throw new ValidationError(
          "Password must be at least 6 characters long"
        );
      }

      /**
       * CREATE NEW USER
       * 
       * Password will be automatically hashed by the pre-save hook.
       */
      const user = new User({
        email: email.toLowerCase(),
        password,
        firstName,
        lastName,
      });

      // Save user to database
      await user.save();

      logger.info(
        `User registered successfully: ${email}`,
        "AuthService.register"
      );

      /**
       * GENERATE JWT TOKEN
       * 
       * Create authentication token for immediate login.
       */
      const token = jwtService.generateToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      });

      return {
        user: user.toJSON(),
        token,
      };
    } catch (error: any) {
      logger.error(
        "Registration failed",
        "AuthService.register",
        error
      );
      throw error;
    }
  }

  /**
   * LOGIN USER
   * 
   * Authenticates user with email and password.
   * 
   * @param email User email
   * @param password User password
   * @returns User data and JWT token
   */
  async login(
    email: string,
    password: string
  ): Promise<{ user: any; token: string }> {
    try {
      logger.debug(`Login attempt: ${email}`, "AuthService.login");

      /**
       * FIND USER BY EMAIL
       * 
       * Use select("+password") to include password field (excluded by default).
       */
      const user = await User.findOne({
        email: email.toLowerCase(),
      }).select("+password");

      if (!user) {
        throw new AuthenticationError("Invalid email or password");
      }

      /**
       * VERIFY PASSWORD
       * 
       * Compare provided password with stored hash.
       */
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        throw new AuthenticationError("Invalid email or password");
      }

      /**
       * CHECK IF ACCOUNT IS ACTIVE
       */
      if (!user.isActive) {
        throw new AuthenticationError("Account is inactive");
      }

      /**
       * UPDATE LAST LOGIN TIMESTAMP
       */
      user.lastLogin = new Date();
      await user.save();

      logger.info(
        `User logged in successfully: ${email}`,
        "AuthService.login"
      );

      /**
       * GENERATE JWT TOKEN
       */
      const token = jwtService.generateToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      });

      return {
        user: user.toJSON(),
        token,
      };
    } catch (error: any) {
      logger.error(
        "Login failed",
        "AuthService.login",
        error
      );
      throw error;
    }
  }

  /**
   * GET USER BY ID
   * 
   * Retrieves user data by user ID.
   * 
   * @param userId User ID
   * @returns User data
   */
  async getUserById(userId: string): Promise<IUser> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new NotFoundError("User");
      }

      return user;
    } catch (error: any) {
      logger.error(
        "Failed to get user",
        "AuthService.getUserById",
        error
      );
      throw error;
    }
  }

  /**
   * UPDATE USER PROFILE
   * 
   * Updates user profile information.
   * 
   * @param userId User ID
   * @param updates Fields to update
   * @returns Updated user data
   */
  async updateProfile(
    userId: string,
    updates: { firstName?: string; lastName?: string }
  ): Promise<IUser> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new NotFoundError("User");
      }

      logger.info(
        `User profile updated: ${userId}`,
        "AuthService.updateProfile"
      );

      return user;
    } catch (error: any) {
      logger.error(
        "Failed to update profile",
        "AuthService.updateProfile",
        error
      );
      throw error;
    }
  }

  /**
   * CHANGE PASSWORD
   * 
   * Changes user password with old password verification.
   * 
   * @param userId User ID
   * @param oldPassword Current password
   * @param newPassword New password
   * @returns Updated user data
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<IUser> {
    try {
      /**
       * GET USER WITH PASSWORD FIELD
       */
      const user = await User.findById(userId).select("+password");

      if (!user) {
        throw new NotFoundError("User");
      }

      /**
       * VERIFY OLD PASSWORD
       */
      const isOldPasswordValid = await user.comparePassword(oldPassword);

      if (!isOldPasswordValid) {
        throw new AuthenticationError("Incorrect current password");
      }

      /**
       * VALIDATE NEW PASSWORD
       */
      if (newPassword.length < 6) {
        throw new ValidationError(
          "Password must be at least 6 characters"
        );
      }

      /**
       * UPDATE PASSWORD
       * 
       * Pre-save hook will automatically hash the new password.
       */
      user.password = newPassword;
      await user.save();

      logger.info(
        `Password changed for user: ${userId}`,
        "AuthService.changePassword"
      );

      return user;
    } catch (error: any) {
      logger.error(
        "Failed to change password",
        "AuthService.changePassword",
        error
      );
      throw error;
    }
  }
}

// Export service
export const authService = new AuthService();

export default authService;
