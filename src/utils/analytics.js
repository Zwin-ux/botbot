/**
 * Analytics and usage tracking for BotBot
 * Helps understand user behavior and bot performance
 */

import { performanceMonitor } from "./performance.js";

class AnalyticsTracker {
  constructor() {
    this.events = [];
    this.userSessions = new Map();
    this.commandUsage = new Map();
    this.errorCounts = new Map();
    this.startTime = Date.now();
  }

  /**
   * Track a user event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  trackEvent(event, data = {}) {
    const eventData = {
      event,
      timestamp: Date.now(),
      ...data,
    };

    this.events.push(eventData);

    // Keep only last 1000 events to prevent memory issues
    if (this.events.length > 1000) {
      this.events.shift();
    }

    // Track command usage
    if (event === "command_used") {
      const command = data.command || "unknown";
      this.commandUsage.set(command, (this.commandUsage.get(command) || 0) + 1);
    }

    // Track errors
    if (event === "error") {
      const errorType = data.type || "unknown";
      this.errorCounts.set(
        errorType,
        (this.errorCounts.get(errorType) || 0) + 1,
      );
    }
  }

  /**
   * Track user session
   * @param {string} userId - User ID
   * @param {string} action - Session action (start, end, activity)
   */
  trackUserSession(userId, action = "activity") {
    const now = Date.now();

    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, {
        firstSeen: now,
        lastSeen: now,
        messageCount: 0,
        sessionCount: 1,
      });
    }

    const session = this.userSessions.get(userId);
    session.lastSeen = now;

    if (action === "message") {
      session.messageCount++;
    }
  }

  /**
   * Get analytics summary
   * @returns {Object} Analytics data
   */
  getSummary() {
    const now = Date.now();
    const uptime = now - this.startTime;

    return {
      uptime: {
        milliseconds: uptime,
        hours: Math.floor(uptime / (1000 * 60 * 60)),
        formatted: this.formatUptime(uptime),
      },
      events: {
        total: this.events.length,
        recent: this.events.slice(-10),
      },
      users: {
        total: this.userSessions.size,
        active: this.getActiveUsers(),
      },
      commands: {
        total: Array.from(this.commandUsage.values()).reduce(
          (a, b) => a + b,
          0,
        ),
        breakdown: Object.fromEntries(this.commandUsage),
        mostUsed: this.getMostUsedCommand(),
      },
      errors: {
        total: Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0),
        breakdown: Object.fromEntries(this.errorCounts),
      },
      performance: performanceMonitor.getStats(),
    };
  }

  /**
   * Get active users (active in last hour)
   * @returns {number} Number of active users
   */
  getActiveUsers() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let activeCount = 0;

    for (const session of this.userSessions.values()) {
      if (session.lastSeen > oneHourAgo) {
        activeCount++;
      }
    }

    return activeCount;
  }

  /**
   * Get most used command
   * @returns {Object} Most used command info
   */
  getMostUsedCommand() {
    let maxCount = 0;
    let mostUsed = null;

    for (const [command, count] of this.commandUsage) {
      if (count > maxCount) {
        maxCount = count;
        mostUsed = command;
      }
    }

    return { command: mostUsed, count: maxCount };
  }

  /**
   * Format uptime duration
   * @param {number} milliseconds - Uptime in milliseconds
   * @returns {string} Formatted uptime
   */
  formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Generate analytics report
   * @returns {string} Formatted report
   */
  generateReport() {
    const summary = this.getSummary();

    return `
📊 **BotBot Analytics Report**

⏱️ **Uptime**: ${summary.uptime.formatted}
👥 **Users**: ${summary.users.total} total, ${summary.users.active} active
💬 **Commands**: ${summary.commands.total} total
🏆 **Most Used**: ${summary.commands.mostUsed.command} (${summary.commands.mostUsed.count} times)
❌ **Errors**: ${summary.errors.total} total

**Recent Activity**:
${summary.events.recent.map((e) => `• ${e.event} (${new Date(e.timestamp).toLocaleTimeString()})`).join("\n")}
    `.trim();
  }

  /**
   * Reset analytics data
   */
  reset() {
    this.events = [];
    this.userSessions.clear();
    this.commandUsage.clear();
    this.errorCounts.clear();
    this.startTime = Date.now();
  }
}

// Global instance
const analytics = new AnalyticsTracker();

export { AnalyticsTracker, analytics };
