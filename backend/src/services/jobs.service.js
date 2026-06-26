'use strict';

/**
 * Background Jobs Service
 * Scheduled automated tasks that run without user interaction
 * Examples: Generate daily summaries, send parent notifications, cleanup old data
 */

const logger = require('../utils/logger');

class JobScheduler {
  constructor() {
    this.jobs = new Map();
    this.timers = new Map();
  }

  /**
   * Schedule a job to run at a specific time daily
   * @param {string} jobName - Unique job identifier
   * @param {string} time - HH:MM format (e.g., "18:00")
   * @param {Function} callback - Job function to execute
   */
  scheduleDaily(jobName, time, callback) {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    let nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const timeUntilRun = nextRun.getTime() - now.getTime();

    const timer = setTimeout(() => {
      logger.info(`Starting scheduled job: ${jobName}`);
      try {
        callback();
      } catch (err) {
        logger.error(`Job ${jobName} failed:`, err.message);
      }
      // Reschedule for next day
      this.scheduleDaily(jobName, time, callback);
    }, timeUntilRun);

    this.jobs.set(jobName, { time, callback, nextRun });
    this.timers.set(jobName, timer);

    logger.info(`Job scheduled: ${jobName} at ${time} (next run: ${nextRun.toISOString()})`);
  }

  /**
   * Schedule a job to run every N minutes
   */
  scheduleInterval(jobName, intervalMinutes, callback) {
    const timer = setInterval(() => {
      logger.info(`Running interval job: ${jobName}`);
      try {
        callback();
      } catch (err) {
        logger.error(`Job ${jobName} failed:`, err.message);
      }
    }, intervalMinutes * 60 * 1000);

    this.jobs.set(jobName, { interval: intervalMinutes, callback });
    this.timers.set(jobName, timer);

    logger.info(`Job scheduled: ${jobName} every ${intervalMinutes} minutes`);
  }

  /**
   * Cancel a scheduled job
   */
  cancel(jobName) {
    const timer = this.timers.get(jobName);
    if (timer) {
      clearTimeout(timer);
      clearInterval(timer);
      this.timers.delete(jobName);
      this.jobs.delete(jobName);
      logger.info(`Job cancelled: ${jobName}`);
    }
  }

  /**
   * Get all scheduled jobs
   */
  listJobs() {
    return Array.from(this.jobs.entries()).map(([name, config]) => ({
      name,
      ...config,
    }));
  }
}

module.exports = JobScheduler;

/**
 * BUILT-IN JOBS
 * Examples of jobs you can schedule
 */

// Example: Generate daily summaries at 6 PM
async function generateDailySummaries() {
  // Get all completed routines from today
  // Generate summaries using rule-based service
  // Send to parents via email/WhatsApp
  logger.info('Daily summary generation started');
  // Implementation in notification.service.js
}

// Example: Archive old routines (30+ days old)
async function archiveOldData() {
  // Move routines older than 30 days to archive table
  // Keeps database fast
  logger.info('Data archival started');
}

// Example: Generate weekly attendance reports
async function generateWeeklyReports() {
  // Calculate attendance stats for past week
  // Group by staff, classroom
  // Send to admin
  logger.info('Weekly report generation started');
}

// Example: Cleanup and health check
async function healthCheck() {
  // Check database connection
  // Check file storage
  // Check email service
  // Log any issues
  logger.info('Health check executed');
}
