import { analytics } from "./analytics.js";
import { cache } from "./cache.js";
import { EmbedBuilder } from "discord.js";

/**
 * Advanced Alerting and Monitoring System
 * Provides real-time alerts, health checks, and system monitoring
 */
class AlertingSystem {
  constructor() {
    this.alerts = new Map();
    this.alertRules = new Map();
    this.channels = new Map();
    this.suppressions = new Map();
    this.escalationPolicies = new Map();
    this.healthChecks = new Map();

    this.initializeDefaultRules();
    this.startHealthCheckLoop();
  }

  /**
   * Initialize default alert rules
   */
  initializeDefaultRules() {
    // High memory usage alert
    this.addAlertRule("high_memory", {
      condition: (metrics) => metrics.memoryUsage > 0.85,
      severity: "warning",
      message: "Memory usage is above 85%",
      cooldown: 300000, // 5 minutes
      escalation: "standard",
    });

    // High response time alert
    this.addAlertRule("slow_response", {
      condition: (metrics) => metrics.avgResponseTime > 5000,
      severity: "warning",
      message: "Average response time is above 5 seconds",
      cooldown: 180000, // 3 minutes
      escalation: "standard",
    });

    // Error rate alert
    this.addAlertRule("high_error_rate", {
      condition: (metrics) => metrics.errorRate > 0.05,
      severity: "critical",
      message: "Error rate is above 5%",
      cooldown: 120000, // 2 minutes
      escalation: "urgent",
    });

    // Database connection alert
    this.addAlertRule("db_connection", {
      condition: (metrics) => !metrics.dbConnected,
      severity: "critical",
      message: "Database connection lost",
      cooldown: 60000, // 1 minute
      escalation: "urgent",
    });

    // Rate limit alert
    this.addAlertRule("rate_limit_exceeded", {
      condition: (metrics) => metrics.rateLimitViolations > 100,
      severity: "warning",
      message: "High number of rate limit violations detected",
      cooldown: 600000, // 10 minutes
      escalation: "standard",
    });

    // Cache hit rate alert
    this.addAlertRule("low_cache_hit_rate", {
      condition: (metrics) => metrics.cacheHitRate < 0.7,
      severity: "info",
      message: "Cache hit rate is below 70%",
      cooldown: 900000, // 15 minutes
      escalation: "low",
    });
  }

  /**
   * Add alert rule
   */
  addAlertRule(name, rule) {
    this.alertRules.set(name, {
      ...rule,
      name,
      createdAt: new Date(),
      isActive: true,
      triggerCount: 0,
      lastTriggered: null,
    });

    analytics.trackEvent("alert_rule_added", { name, severity: rule.severity });
  }

  /**
   * Configure alert channel
   */
  configureAlertChannel(
    guildId,
    channelId,
    severityLevels = ["critical", "warning"],
  ) {
    this.channels.set(guildId, {
      channelId,
      severityLevels,
      isActive: true,
      configuredAt: new Date(),
    });

    analytics.trackEvent("alert_channel_configured", {
      guildId,
      channelId,
      severityLevels,
    });
  }

  /**
   * Check all alert rules
   */
  async checkAlerts() {
    const startTime = Date.now();

    try {
      // Get current system metrics
      const metrics = await this.gatherMetrics();

      // Check each alert rule
      for (const [name, rule] of this.alertRules.entries()) {
        if (!rule.isActive) continue;

        try {
          if (rule.condition(metrics)) {
            await this.triggerAlert(name, rule, metrics);
          }
        } catch (error) {
          console.error(`Error checking alert rule ${name}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      performance.recordMetric("alert_check_time", duration);
    } catch (error) {
      console.error("Error in alert checking:", error);
      analytics.trackEvent("alert_check_error", { error: error.message });
    }
  }

  /**
   * Gather system metrics
   */
  async gatherMetrics() {
    const memUsage = process.memoryUsage();
    const performanceMetrics = performance.getMetrics();
    const analyticsData = analytics.getMetrics();
    const cacheStats = cache.getStats();

    return {
      // Memory metrics
      memoryUsage: memUsage.heapUsed / memUsage.heapTotal,
      totalMemory: memUsage.heapTotal,
      usedMemory: memUsage.heapUsed,

      // Performance metrics
      avgResponseTime: performanceMetrics.avgResponseTime || 0,
      requestCount: performanceMetrics.requestCount || 0,
      errorCount: performanceMetrics.errorCount || 0,
      errorRate:
        performanceMetrics.errorCount /
        Math.max(performanceMetrics.requestCount, 1),

      // System health
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage(),

      // Database status
      dbConnected: true, // This would check actual DB connection

      // Rate limiting
      rateLimitViolations: analyticsData.rateLimitViolations || 0,

      // Cache metrics
      cacheHitRate: cacheStats.hitRate || 0,
      cacheSize: cacheStats.size || 0,

      // Custom metrics
      activeGames: analyticsData.activeGames || 0,
      activeUsers: analyticsData.activeUsers || 0,

      timestamp: Date.now(),
    };
  }

  /**
   * Trigger an alert
   */
  async triggerAlert(name, rule, metrics) {
    const now = Date.now();

    // Check cooldown
    if (rule.lastTriggered && now - rule.lastTriggered < rule.cooldown) {
      return;
    }

    // Check suppression
    if (this.isAlertSuppressed(name)) {
      return;
    }

    const alertId = `${name}_${now}`;
    const alert = {
      id: alertId,
      name,
      rule: rule.name,
      severity: rule.severity,
      message: rule.message,
      metrics: { ...metrics },
      triggeredAt: new Date(),
      status: "active",
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolvedAt: null,
    };

    this.alerts.set(alertId, alert);
    rule.triggerCount++;
    rule.lastTriggered = now;

    // Send alert notifications
    await this.sendAlertNotifications(alert);

    // Handle escalation
    await this.handleEscalation(alert, rule);

    analytics.trackEvent("alert_triggered", {
      alertId,
      name,
      severity: rule.severity,
      triggerCount: rule.triggerCount,
    });
  }

  /**
   * Send alert notifications
   */
  async sendAlertNotifications(alert) {
    const embed = this.createAlertEmbed(alert);

    for (const [guildId, config] of this.channels.entries()) {
      if (!config.isActive || !config.severityLevels.includes(alert.severity)) {
        continue;
      }

      try {
        // In a real implementation, you'd get the channel and send the message
        // const channel = await client.channels.fetch(config.channelId);
        // await channel.send({ embeds: [embed] });

        console.log(`Alert sent to guild ${guildId}:`, alert.message);
      } catch (error) {
        console.error(`Failed to send alert to guild ${guildId}:`, error);
      }
    }
  }

  /**
   * Create alert embed
   */
  createAlertEmbed(alert) {
    const colors = {
      critical: 0xff0000,
      warning: 0xffa500,
      info: 0x0099ff,
      low: 0x808080,
    };

    const embed = new EmbedBuilder()
      .setTitle(`🚨 ${alert.severity.toUpperCase()} Alert`)
      .setDescription(alert.message)
      .setColor(colors[alert.severity] || 0x808080)
      .setTimestamp(alert.triggeredAt)
      .addFields(
        { name: "Alert ID", value: alert.id, inline: true },
        { name: "Rule", value: alert.rule, inline: true },
        { name: "Severity", value: alert.severity, inline: true },
      );

    // Add relevant metrics
    if (alert.metrics.memoryUsage) {
      embed.addFields({
        name: "Memory Usage",
        value: `${(alert.metrics.memoryUsage * 100).toFixed(1)}%`,
        inline: true,
      });
    }

    if (alert.metrics.avgResponseTime) {
      embed.addFields({
        name: "Avg Response Time",
        value: `${alert.metrics.avgResponseTime.toFixed(0)}ms`,
        inline: true,
      });
    }

    if (alert.metrics.errorRate) {
      embed.addFields({
        name: "Error Rate",
        value: `${(alert.metrics.errorRate * 100).toFixed(2)}%`,
        inline: true,
      });
    }

    return embed;
  }

  /**
   * Handle alert escalation
   */
  async handleEscalation(alert, rule) {
    const policy = this.escalationPolicies.get(rule.escalation);
    if (!policy) return;

    // Schedule escalation steps
    for (const step of policy.steps) {
      setTimeout(async () => {
        if (alert.status === "active") {
          await this.executeEscalationStep(alert, step);
        }
      }, step.delay);
    }
  }

  /**
   * Execute escalation step
   */
  async executeEscalationStep(alert, step) {
    switch (step.action) {
      case "notify_admin":
        // Notify administrators
        console.log(`Escalating alert ${alert.id} to administrators`);
        break;
      case "create_incident":
        // Create incident ticket
        console.log(`Creating incident for alert ${alert.id}`);
        break;
      case "auto_resolve":
        // Attempt automatic resolution
        await this.attemptAutoResolve(alert);
        break;
    }

    analytics.trackEvent("alert_escalated", {
      alertId: alert.id,
      step: step.action,
    });
  }

  /**
   * Attempt automatic resolution
   */
  async attemptAutoResolve(alert) {
    // Implement auto-resolution logic based on alert type
    switch (alert.name) {
      case "high_memory":
        // Clear caches
        cache.clear();
        console.log("Cleared cache to reduce memory usage");
        break;
      case "low_cache_hit_rate":
        // Warm up cache
        console.log("Warming up cache");
        break;
    }
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId, userId, username) {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== "active") {
      return false;
    }

    alert.status = "acknowledged";
    alert.acknowledgedBy = { userId, username };
    alert.acknowledgedAt = new Date();

    analytics.trackEvent("alert_acknowledged", {
      alertId,
      acknowledgedBy: userId,
    });

    return true;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId, userId, username, resolution = "") {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.status = "resolved";
    alert.resolvedAt = new Date();
    alert.resolution = resolution;
    alert.resolvedBy = { userId, username };

    analytics.trackEvent("alert_resolved", {
      alertId,
      resolvedBy: userId,
      duration: alert.resolvedAt - alert.triggeredAt,
    });

    return true;
  }

  /**
   * Suppress alerts
   */
  suppressAlert(name, duration = 3600000) {
    // 1 hour default
    this.suppressions.set(name, {
      until: Date.now() + duration,
      suppressedAt: new Date(),
    });

    analytics.trackEvent("alert_suppressed", { name, duration });
  }

  /**
   * Check if alert is suppressed
   */
  isAlertSuppressed(name) {
    const suppression = this.suppressions.get(name);
    if (!suppression) return false;

    if (Date.now() > suppression.until) {
      this.suppressions.delete(name);
      return false;
    }

    return true;
  }

  /**
   * Add escalation policy
   */
  addEscalationPolicy(name, steps) {
    this.escalationPolicies.set(name, {
      name,
      steps,
      createdAt: new Date(),
    });
  }

  /**
   * Add health check
   */
  addHealthCheck(name, checkFunction, interval = 60000) {
    this.healthChecks.set(name, {
      name,
      check: checkFunction,
      interval,
      lastCheck: null,
      lastResult: null,
      isHealthy: true,
      consecutiveFailures: 0,
    });
  }

  /**
   * Start health check loop
   */
  startHealthCheckLoop() {
    setInterval(async () => {
      for (const [name, healthCheck] of this.healthChecks.entries()) {
        try {
          const result = await healthCheck.check();
          healthCheck.lastCheck = new Date();
          healthCheck.lastResult = result;

          if (result.healthy) {
            healthCheck.isHealthy = true;
            healthCheck.consecutiveFailures = 0;
          } else {
            healthCheck.consecutiveFailures++;
            if (healthCheck.consecutiveFailures >= 3) {
              healthCheck.isHealthy = false;

              // Trigger health check alert
              await this.triggerHealthAlert(name, result);
            }
          }
        } catch (error) {
          healthCheck.consecutiveFailures++;
          healthCheck.lastResult = { healthy: false, error: error.message };

          if (healthCheck.consecutiveFailures >= 3) {
            healthCheck.isHealthy = false;
            await this.triggerHealthAlert(name, {
              healthy: false,
              error: error.message,
            });
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Trigger health check alert
   */
  async triggerHealthAlert(name, result) {
    const alertId = `health_${name}_${Date.now()}`;
    const alert = {
      id: alertId,
      name: `health_check_${name}`,
      rule: "health_check",
      severity: "critical",
      message: `Health check '${name}' is failing: ${result.error || "Unknown error"}`,
      metrics: result,
      triggeredAt: new Date(),
      status: "active",
    };

    this.alerts.set(alertId, alert);
    await this.sendAlertNotifications(alert);

    analytics.trackEvent("health_check_alert", {
      alertId,
      healthCheck: name,
      error: result.error,
    });
  }

  /**
   * Get system health status
   */
  getHealthStatus() {
    const healthChecks = Array.from(this.healthChecks.values()).map((hc) => ({
      name: hc.name,
      isHealthy: hc.isHealthy,
      lastCheck: hc.lastCheck,
      consecutiveFailures: hc.consecutiveFailures,
    }));

    const activeAlerts = Array.from(this.alerts.values()).filter(
      (alert) => alert.status === "active",
    ).length;

    return {
      overall: healthChecks.every((hc) => hc.isHealthy) && activeAlerts === 0,
      healthChecks,
      activeAlerts,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get alert statistics
   */
  getAlertStats() {
    const alerts = Array.from(this.alerts.values());
    const rules = Array.from(this.alertRules.values());

    return {
      totalAlerts: alerts.length,
      activeAlerts: alerts.filter((a) => a.status === "active").length,
      acknowledgedAlerts: alerts.filter((a) => a.status === "acknowledged")
        .length,
      resolvedAlerts: alerts.filter((a) => a.status === "resolved").length,
      alertRules: rules.length,
      activeRules: rules.filter((r) => r.isActive).length,
      topAlertRules: rules
        .sort((a, b) => b.triggerCount - a.triggerCount)
        .slice(0, 5)
        .map((r) => ({ name: r.name, triggerCount: r.triggerCount })),
    };
  }
}

// Initialize default escalation policies
const alerting = new AlertingSystem();

alerting.addEscalationPolicy("standard", [
  { action: "notify_admin", delay: 300000 }, // 5 minutes
  { action: "create_incident", delay: 900000 }, // 15 minutes
]);

alerting.addEscalationPolicy("urgent", [
  { action: "notify_admin", delay: 60000 }, // 1 minute
  { action: "create_incident", delay: 300000 }, // 5 minutes
  { action: "auto_resolve", delay: 600000 }, // 10 minutes
]);

alerting.addEscalationPolicy("low", [
  { action: "notify_admin", delay: 1800000 }, // 30 minutes
]);

// Add default health checks
alerting.addHealthCheck("memory", async () => {
  const usage = process.memoryUsage();
  const ratio = usage.heapUsed / usage.heapTotal;
  return {
    healthy: ratio < 0.9,
    memoryUsage: ratio,
    details: usage,
  };
});

alerting.addHealthCheck("response_time", async () => {
  const metrics = performance.getMetrics();
  return {
    healthy: (metrics.avgResponseTime || 0) < 10000,
    avgResponseTime: metrics.avgResponseTime,
    details: metrics,
  };
});

// Start alert checking loop
setInterval(() => {
  alerting.checkAlerts();
}, 60000); // Check every minute

export { alerting };
