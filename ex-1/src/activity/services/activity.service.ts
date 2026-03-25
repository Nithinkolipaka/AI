/**
 * ACTIVITY SERVICE
 * 
 * Service for logging and retrieving user activities.
 */

import { Activity, type IActivity } from "../models/activity.model.js";
import mongoose from "mongoose";
import { logger } from "../../utils/logger.js";

/**
 * ACTIVITY LOG DATA INTERFACE
 */
export interface ActivityLogData {
  userId: string;
  action: string;
  resource: string;
  method: string;
  statusCode: number;
  description?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * ACTIVITY SERVICE CLASS
 */
export class ActivityService {
  /**
   * LOG ACTIVITY
   * 
   * Records a user activity in the database.
   * 
   * @param data Activity information to log
   * @returns Created activity document
   */
  async logActivity(data: ActivityLogData): Promise<IActivity> {
    try {
      /**
       * VALIDATE USER ID
       * 
       * Ensure userId is a valid MongoDB ObjectId.
       */
      if (!mongoose.Types.ObjectId.isValid(data.userId)) {
        logger.warn(
          `Invalid userId provided: ${data.userId}`,
          "ActivityService.logActivity"
        );
        throw new Error("Invalid user ID");
      }

      /**
       * CREATE ACTIVITY DOCUMENT
       * 
       * Store all activity information.
       */
      const activity = new Activity({
        userId: new mongoose.Types.ObjectId(data.userId),
        action: data.action,
        resource: data.resource,
        method: data.method,
        statusCode: data.statusCode,
        description: data.description,
        metadata: data.metadata,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      });

      /**
       * SAVE TO DATABASE
       */
      await activity.save();

      logger.debug(
        `Activity logged: ${data.action} ${data.resource}`,
        "ActivityService.logActivity"
      );

      return activity;
    } catch (error: any) {
      logger.error(
        "Failed to log activity",
        "ActivityService.logActivity",
        error
      );
      // Don't throw - activity logging should not block main operations
      return null as any;
    }
  }

  /**
   * GET USER ACTIVITIES
   * 
   * Retrieves activities for a specific user.
   * Supports pagination and filtering.
   * 
   * @param userId User ID to filter by
   * @param limit Number of results per page
   * @param skip Number of results to skip
   * @param filters Optional additional filters
   * @returns Array of activities and total count
   */
  async getUserActivities(
    userId: string,
    limit: number = 50,
    skip: number = 0,
    filters?: { action?: string; resource?: string; from?: Date; to?: Date }
  ): Promise<{ activities: IActivity[]; total: number }> {
    try {
      /**
       * BUILD QUERY FILTER
       */
      const query: Record<string, any> = {
        userId: new mongoose.Types.ObjectId(userId),
      };

      // Add optional filters
      if (filters?.action) {
        query.action = filters.action;
      }

      if (filters?.resource) {
        query.resource = filters.resource;
      }

      if (filters?.from || filters?.to) {
        query.createdAt = {};
        if (filters.from) {
          query.createdAt.$gte = filters.from;
        }
        if (filters.to) {
          query.createdAt.$lte = filters.to;
        }
      }

      /**
       * EXECUTE QUERY
       * 
       * Get total count for pagination.
       * Get activities sorted by date (newest first).
       */
      const total = await Activity.countDocuments(query);

      const activities = await Activity.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      logger.debug(
        `Retrieved ${activities.length} activities for user ${userId}`,
        "ActivityService.getUserActivities"
      );

      return { activities: activities as IActivity[], total };
    } catch (error: any) {
      logger.error(
        "Failed to get user activities",
        "ActivityService.getUserActivities",
        error
      );
      throw error;
    }
  }

  /**
   * GET RESOURCE ACTIVITIES
   * 
   * Retrieves all activities for a specific resource.
   * Useful for audit trails.
   * 
   * @param resource Resource type to filter by
   * @param limit Number of results
   * @param skip Skip count for pagination
   * @returns Array of activities
   */
  async getResourceActivities(
    resource: string,
    limit: number = 100,
    skip: number = 0
  ): Promise<{ activities: IActivity[]; total: number }> {
    try {
      const query = { resource };

      const total = await Activity.countDocuments(query);

      const activities = await Activity.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate("userId", "email firstName lastName")
        .lean();

      logger.debug(
        `Retrieved ${activities.length} activities for resource ${resource}`,
        "ActivityService.getResourceActivities"
      );

      return { activities: activities as IActivity[], total };
    } catch (error: any) {
      logger.error(
        "Failed to get resource activities",
        "ActivityService.getResourceActivities",
        error
      );
      throw error;
    }
  }

  /**
   * GET ACTIVITY STATISTICS
   * 
   * Aggregates activity data for analytics.
   * 
   * @param userId Optional user ID to filter by
   * @returns Statistics object
   */
  async getActivityStats(userId?: string): Promise<Record<string, any>> {
    try {
      /**
       * BUILD AGGREGATION PIPELINE
       */
      const pipeline: any[] = [];

      // Filter by user if provided
      if (userId) {
        pipeline.push({
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
          },
        });
      }

      /**
       * GROUP BY ACTION AND COUNT
       */
      pipeline.push(
        {
          $group: {
            _id: "$action",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        }
      );

      const stats = await Activity.aggregate(pipeline);

      logger.debug(
        `Generated activity statistics`,
        "ActivityService.getActivityStats"
      );

      return { actions: stats };
    } catch (error: any) {
      logger.error(
        "Failed to get activity stats",
        "ActivityService.getActivityStats",
        error
      );
      throw error;
    }
  }

  /**
   * DELETE OLD ACTIVITIES
   * 
   * Manually delete activities older than specified days.
   * Complements automatic TTL index cleanup.
   * 
   * @param daysOld Delete activities older than N days
   * @returns Number of deleted records
   */
  async deleteOldActivities(daysOld: number = 90): Promise<number> {
    try {
      const date = new Date();
      date.setDate(date.getDate() - daysOld);

      const result = await Activity.deleteMany({
        createdAt: { $lt: date },
      });

      logger.info(
        `Deleted ${result.deletedCount} old activities`,
        "ActivityService.deleteOldActivities"
      );

      return result.deletedCount || 0;
    } catch (error: any) {
      logger.error(
        "Failed to delete old activities",
        "ActivityService.deleteOldActivities",
        error
      );
      throw error;
    }
  }
}

// Export service
export const activityService = new ActivityService();

export default activityService;
