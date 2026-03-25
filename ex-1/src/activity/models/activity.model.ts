/**
 * ACTIVITY MODEL
 * 
 * Tracks user actions and activities in the system.
 * Used for audit logging, analytics, and security monitoring.
 */

import mongoose, { Document, Schema } from "mongoose";

/**
 * ACTIVITY INTERFACE
 */
export interface IActivity extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: string;
  resource: string;
  method: string;
  statusCode: number;
  description?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

/**
 * ACTIVITY SCHEMA
 */
const activitySchema = new Schema<IActivity>(
  {
    /**
     * USER ID
     * 
     * Reference to the User who performed the action.
     */
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },

    /**
     * ACTION
     * 
     * Type of action performed.
     * Examples: "LOGIN", "CREATE", "UPDATE", "DELETE", "VIEW"
     */
    action: {
      type: String,
      required: [true, "Action is required"],
      enum: ["LOGIN", "LOGOUT", "CREATE", "READ", "UPDATE", "DELETE", "EXPORT", "IMPORT"],
      index: true,
    },

    /**
     * RESOURCE
     * 
     * What resource was acted upon.
     * Examples: "User", "Document", "ChainExecution", "Settings"
     */
    resource: {
      type: String,
      required: [true, "Resource is required"],
      index: true,
    },

    /**
     * HTTP METHOD
     * 
     * HTTP method used.
     * Examples: "GET", "POST", "PUT", "DELETE"
     */
    method: {
      type: String,
      required: [true, "Method is required"],
      enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    },

    /**
     * HTTP STATUS CODE
     * 
     * Response status code.
     */
    statusCode: {
      type: Number,
      required: [true, "Status code is required"],
    },

    /**
     * DESCRIPTION
     * 
     * Human-readable description of the activity.
     */
    description: {
      type: String,
      default: null,
    },

    /**
     * METADATA
     * 
     * Additional data relevant to the activity.
     * Can store anything (parameters, changes, errors, etc.).
     */
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },

    /**
     * IP ADDRESS
     * 
     * IP address of the request.
     * Useful for security analysis.
     */
    ipAddress: {
      type: String,
      default: null,
    },

    /**
     * USER AGENT
     * 
     * Browser/client information.
     */
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    /**
     * SCHEMA OPTIONS
     */
    timestamps: { createdAt: true, updatedAt: false }, // Only track creation time
  }
);

/**
 * CREATE INDEXES
 * 
 * Composite indexes for common queries.
 */
activitySchema.index({ userId: 1, createdAt: -1 }); // User activities (sorted by date)
activitySchema.index({ resource: 1, action: 1 }); // Resource activities
activitySchema.index({ createdAt: -1 }); // Timeline queries

/**
 * TTL INDEX
 * 
 * Automatically remove activity logs after 90 days.
 * Reduces database storage for audit logs.
 * MongoDB processes TTL indexes every 60 seconds.
 */
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

/**
 * CREATE ACTIVITY MODEL
 */
export const Activity = mongoose.model<IActivity>("Activity", activitySchema);

export default Activity;
