import mongoose, { Document, Schema } from 'mongoose';

/**
 * User document interface
 * Represents a user extracted from LLM responses
 */
export interface IUser extends Document {
  name: string;
  email: string;
  age: number;
  extractedFrom: string; // The prompt that was used to extract this
  extractedAt: Date;
  provider: string; // Which LLM provider extracted this
  updatedAt: Date;
}

/**
 * User schema with validation
 */
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    age: {
      type: Number,
      required: true,
      min: 0,
      max: 150,
    },
    extractedFrom: {
      type: String,
      required: true,
      maxlength: 500,
    },
    extractedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      enum: ['openai', 'ollama', 'gemini', 'claude'],
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Index for common queries
userSchema.index({ email: 1 });
userSchema.index({ extractedAt: -1 });
userSchema.index({ provider: 1 });

/**
 * Create unique index - handles duplicate key errors gracefully
 */
userSchema.index({ email: 1 }, { unique: true, sparse: true });

export const User = mongoose.model<IUser>('User', userSchema);

/**
 * Repository methods for User model
 */
export class UserRepository {
  /**
   * Create or update a user
   */
  static async upsert(
    userData: Omit<IUser, '_id' | 'createdAt' | 'updatedAt'>,
  ): Promise<IUser> {
    const existing = await User.findOne({ email: userData.email });

    if (existing) {
      Object.assign(existing, userData);
      return existing.save();
    }

    return User.create(userData);
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() });
  }

  /**
   * Get all users
   */
  static async findAll(limit = 50, skip = 0): Promise<IUser[]> {
    return User.find().limit(limit).skip(skip).sort({ extractedAt: -1 });
  }

  /**
   * Find users by provider
   */
  static async findByProvider(provider: string, limit = 50, skip = 0): Promise<IUser[]> {
    return User.find({ provider }).limit(limit).skip(skip).sort({ extractedAt: -1 });
  }

  /**
   * Delete user by email
   */
  static async deleteByEmail(email: string): Promise<boolean> {
    const result = await User.deleteOne({ email: email.toLowerCase() });
    return result.deletedCount > 0;
  }

  /**
   * Count total users
   */
  static async count(): Promise<number> {
    return User.countDocuments();
  }
}
