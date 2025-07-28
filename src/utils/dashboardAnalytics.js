import { performance } from "./performance.js";
import { analytics } from "./analytics.js";
import { cache } from "./cache.js";
import { alerting } from "./alerting.js";
import { EmbedBuilder } from "discord.js";

/**
 * Advanced Analytics Dashboard
 * Provides comprehensive analytics, reporting, and data visualization
 */
class DashboardAnalytics {
  constructor() {
    this.dashboards = new Map();
    this.reports = new Map();
    this.widgets = new Map();
    this.scheduledReports = new Map();

    this.initializeDefaultDashboards();
    this.startReportScheduler();
  }

  /**
   * Initialize default dashboards
   */
  initializeDefaultDashboards() {
    // System Overview Dashboard
    this.createDashboard("system_overview", {
      title: "🖥️ System Overview",
      description: "Real-time system health and performance metrics",
      widgets: [
        "system_health",
        "performance_metrics",
        "memory_usage",
        "active_users",
        "error_rate",
      ],
      refreshInterval: 30000, // 30 seconds
      permissions: ["admin"],
    });

    // User Analytics Dashboard
    this.createDashboard("user_analytics", {
      title: "👥 User Analytics",
      description: "User engagement and behavior insights",
      widgets: [
        "user_activity",
        "command_usage",
        "feature_adoption",
        "user_retention",
        "sentiment_analysis",
      ],
      refreshInterval: 300000, // 5 minutes
      permissions: ["admin", "moderator"],
    });

    // Bot Performance Dashboard
    this.createDashboard("bot_performance", {
      title: "🤖 Bot Performance",
      description: "Bot-specific performance and usage metrics",
      widgets: [
        "response_times",
        "command_success_rate",
        "cache_performance",
        "integration_status",
        "game_statistics",
      ],
      refreshInterval: 60000, // 1 minute
      permissions: ["admin"],
    });

    // Business Intelligence Dashboard
    this.createDashboard("business_intelligence", {
      title: "📊 Business Intelligence",
      description: "Strategic insights and growth metrics",
      widgets: [
        "growth_trends",
        "engagement_metrics",
        "feature_roi",
        "user_segments",
        "predictive_analytics",
      ],
      refreshInterval: 3600000, // 1 hour
      permissions: ["admin", "owner"],
    });
  }

  /**
   * Create a new dashboard
   */
  createDashboard(id, config) {
    const dashboard = {
      id,
      ...config,
      createdAt: Date.now(),
      lastUpdated: null,
      data: new Map(),
      subscribers: new Set(),
    };

    this.dashboards.set(id, dashboard);

    analytics.trackEvent("dashboard_created", {
      dashboardId: id,
      widgetCount: config.widgets.length,
    });

    return id;
  }

  /**
   * Generate dashboard data
   */
  async generateDashboardData(dashboardId) {
    const startTime = Date.now();

    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard not found: ${dashboardId}`);
      }

      const data = new Map();

      // Generate data for each widget
      for (const widgetId of dashboard.widgets) {
        try {
          const widgetData = await this.generateWidgetData(widgetId);
          data.set(widgetId, widgetData);
        } catch (error) {
          console.error(`Error generating widget data for ${widgetId}:`, error);
          data.set(widgetId, {
            error: true,
            message: error.message,
            timestamp: Date.now(),
          });
        }
      }

      dashboard.data = data;
      dashboard.lastUpdated = Date.now();

      const duration = Date.now() - startTime;
      performance.recordMetric("dashboard_generation_time", duration);

      analytics.trackEvent("dashboard_generated", {
        dashboardId,
        widgetCount: dashboard.widgets.length,
        duration,
      });

      return data;
    } catch (error) {
      analytics.trackEvent("dashboard_generation_error", {
        dashboardId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate widget data
   */
  async generateWidgetData(widgetId) {
    switch (widgetId) {
      case "system_health":
        return await this.generateSystemHealthWidget();
      case "performance_metrics":
        return await this.generatePerformanceMetricsWidget();
      case "memory_usage":
        return await this.generateMemoryUsageWidget();
      case "active_users":
        return await this.generateActiveUsersWidget();
      case "error_rate":
        return await this.generateErrorRateWidget();
      case "user_activity":
        return await this.generateUserActivityWidget();
      case "command_usage":
        return await this.generateCommandUsageWidget();
      case "feature_adoption":
        return await this.generateFeatureAdoptionWidget();
      case "user_retention":
        return await this.generateUserRetentionWidget();
      case "sentiment_analysis":
        return await this.generateSentimentAnalysisWidget();
      case "response_times":
        return await this.generateResponseTimesWidget();
      case "command_success_rate":
        return await this.generateCommandSuccessRateWidget();
      case "cache_performance":
        return await this.generateCachePerformanceWidget();
      case "integration_status":
        return await this.generateIntegrationStatusWidget();
      case "game_statistics":
        return await this.generateGameStatisticsWidget();
      case "growth_trends":
        return await this.generateGrowthTrendsWidget();
      case "engagement_metrics":
        return await this.generateEngagementMetricsWidget();
      case "feature_roi":
        return await this.generateFeatureROIWidget();
      case "user_segments":
        return await this.generateUserSegmentsWidget();
      case "predictive_analytics":
        return await this.generatePredictiveAnalyticsWidget();
      default:
        throw new Error(`Unknown widget: ${widgetId}`);
    }
  }

  /**
   * System Health Widget
   */
  async generateSystemHealthWidget() {
    const healthStatus = alerting.getHealthStatus();
    const alertStats = alerting.getAlertStats();

    return {
      type: "status",
      title: "System Health",
      status: healthStatus.overall ? "healthy" : "unhealthy",
      value: healthStatus.overall
        ? "All Systems Operational"
        : "Issues Detected",
      details: {
        healthChecks: healthStatus.healthChecks.length,
        healthyChecks: healthStatus.healthChecks.filter((hc) => hc.isHealthy)
          .length,
        activeAlerts: alertStats.activeAlerts,
        totalAlerts: alertStats.totalAlerts,
      },
      color: healthStatus.overall ? 0x2ecc71 : 0xe74c3c,
      timestamp: Date.now(),
    };
  }

  /**
   * Performance Metrics Widget
   */
  async generatePerformanceMetricsWidget() {
    const metrics = performance.getMetrics();

    return {
      type: "metrics",
      title: "Performance Metrics",
      metrics: [
        {
          name: "Avg Response Time",
          value: Math.round(metrics.avgResponseTime || 0),
          unit: "ms",
          trend: this.calculateTrend("response_time", metrics.avgResponseTime),
        },
        {
          name: "Requests/Min",
          value: Math.round(
            (metrics.requestCount || 0) / (process.uptime() / 60),
          ),
          unit: "req/min",
          trend: this.calculateTrend("request_rate", metrics.requestCount),
        },
        {
          name: "Error Rate",
          value: Math.round((metrics.errorRate || 0) * 100),
          unit: "%",
          trend: this.calculateTrend("error_rate", metrics.errorRate),
        },
      ],
      timestamp: Date.now(),
    };
  }

  /**
   * Memory Usage Widget
   */
  async generateMemoryUsageWidget() {
    const memUsage = process.memoryUsage();
    const usagePercent = Math.round(
      (memUsage.heapUsed / memUsage.heapTotal) * 100,
    );

    return {
      type: "gauge",
      title: "Memory Usage",
      value: usagePercent,
      unit: "%",
      max: 100,
      thresholds: {
        warning: 70,
        critical: 85,
      },
      details: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Active Users Widget
   */
  async generateActiveUsersWidget() {
    const analyticsData = analytics.getMetrics();
    const activeUsers = analyticsData.activeUsers || 0;

    return {
      type: "counter",
      title: "Active Users",
      value: activeUsers,
      trend: this.calculateTrend("active_users", activeUsers),
      details: {
        last24h: analyticsData.users24h || 0,
        last7d: analyticsData.users7d || 0,
        last30d: analyticsData.users30d || 0,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Error Rate Widget
   */
  async generateErrorRateWidget() {
    const metrics = performance.getMetrics();
    const errorRate = (metrics.errorRate || 0) * 100;

    return {
      type: "line_chart",
      title: "Error Rate",
      value: Math.round(errorRate * 100) / 100,
      unit: "%",
      data: this.getTimeSeriesData("error_rate", 24), // Last 24 hours
      thresholds: {
        warning: 1,
        critical: 5,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * User Activity Widget
   */
  async generateUserActivityWidget() {
    const analyticsData = analytics.getMetrics();

    return {
      type: "activity_chart",
      title: "User Activity",
      data: {
        hourly: this.getTimeSeriesData("user_activity_hourly", 24),
        daily: this.getTimeSeriesData("user_activity_daily", 7),
        commands: analyticsData.topCommands || [],
        channels: analyticsData.topChannels || [],
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Command Usage Widget
   */
  async generateCommandUsageWidget() {
    const analyticsData = analytics.getMetrics();
    const commandStats = analyticsData.commandStats || {};

    const topCommands = Object.entries(commandStats)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([command, stats]) => ({
        name: command,
        count: stats.count,
        avgTime: Math.round(stats.avgTime || 0),
        successRate: Math.round((stats.successRate || 0) * 100),
      }));

    return {
      type: "table",
      title: "Command Usage",
      headers: ["Command", "Count", "Avg Time", "Success Rate"],
      data: topCommands,
      timestamp: Date.now(),
    };
  }

  /**
   * Feature Adoption Widget
   */
  async generateFeatureAdoptionWidget() {
    const analyticsData = analytics.getMetrics();
    const featureUsage = analyticsData.featureUsage || {};

    const features = Object.entries(featureUsage).map(([feature, usage]) => ({
      name: feature,
      users: usage.uniqueUsers || 0,
      usage: usage.totalUsage || 0,
      adoption: Math.round((usage.adoptionRate || 0) * 100),
    }));

    return {
      type: "bar_chart",
      title: "Feature Adoption",
      data: features.sort((a, b) => b.adoption - a.adoption),
      xAxis: "name",
      yAxis: "adoption",
      unit: "%",
      timestamp: Date.now(),
    };
  }

  /**
   * User Retention Widget
   */
  async generateUserRetentionWidget() {
    const analyticsData = analytics.getMetrics();

    return {
      type: "retention_chart",
      title: "User Retention",
      data: {
        daily: analyticsData.dailyRetention || 0,
        weekly: analyticsData.weeklyRetention || 0,
        monthly: analyticsData.monthlyRetention || 0,
      },
      cohorts: analyticsData.retentionCohorts || [],
      timestamp: Date.now(),
    };
  }

  /**
   * Sentiment Analysis Widget
   */
  async generateSentimentAnalysisWidget() {
    const analyticsData = analytics.getMetrics();
    const sentimentData = analyticsData.sentiment || {};

    return {
      type: "pie_chart",
      title: "Sentiment Analysis",
      data: [
        {
          name: "Positive",
          value: sentimentData.positive || 0,
          color: "#2ecc71",
        },
        {
          name: "Neutral",
          value: sentimentData.neutral || 0,
          color: "#95a5a6",
        },
        {
          name: "Negative",
          value: sentimentData.negative || 0,
          color: "#e74c3c",
        },
      ],
      details: {
        totalAnalyzed: sentimentData.total || 0,
        avgSentiment: sentimentData.average || 0,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Response Times Widget
   */
  async generateResponseTimesWidget() {
    const metrics = performance.getMetrics();

    return {
      type: "histogram",
      title: "Response Times",
      data: this.getTimeSeriesData("response_times", 24),
      percentiles: {
        p50: metrics.p50ResponseTime || 0,
        p95: metrics.p95ResponseTime || 0,
        p99: metrics.p99ResponseTime || 0,
      },
      unit: "ms",
      timestamp: Date.now(),
    };
  }

  /**
   * Command Success Rate Widget
   */
  async generateCommandSuccessRateWidget() {
    const analyticsData = analytics.getMetrics();
    const successRate = (analyticsData.commandSuccessRate || 0) * 100;

    return {
      type: "gauge",
      title: "Command Success Rate",
      value: Math.round(successRate),
      unit: "%",
      max: 100,
      thresholds: {
        warning: 95,
        critical: 90,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Cache Performance Widget
   */
  async generateCachePerformanceWidget() {
    const cacheStats = cache.getStats();

    return {
      type: "metrics",
      title: "Cache Performance",
      metrics: [
        {
          name: "Hit Rate",
          value: Math.round((cacheStats.hitRate || 0) * 100),
          unit: "%",
          trend: this.calculateTrend("cache_hit_rate", cacheStats.hitRate),
        },
        {
          name: "Size",
          value: cacheStats.size || 0,
          unit: "items",
          trend: this.calculateTrend("cache_size", cacheStats.size),
        },
        {
          name: "Memory",
          value: Math.round((cacheStats.memoryUsage || 0) / 1024 / 1024),
          unit: "MB",
          trend: this.calculateTrend("cache_memory", cacheStats.memoryUsage),
        },
      ],
      timestamp: Date.now(),
    };
  }

  /**
   * Integration Status Widget
   */
  async generateIntegrationStatusWidget() {
    // This would integrate with the integration service
    const integrations = [
      { name: "Discord API", status: "healthy", latency: 45 },
      { name: "Database", status: "healthy", latency: 12 },
      { name: "Cache", status: "healthy", latency: 3 },
      { name: "External APIs", status: "degraded", latency: 234 },
    ];

    return {
      type: "status_list",
      title: "Integration Status",
      data: integrations,
      timestamp: Date.now(),
    };
  }

  /**
   * Game Statistics Widget
   */
  async generateGameStatisticsWidget() {
    const analyticsData = analytics.getMetrics();
    const gameStats = analyticsData.gameStats || {};

    return {
      type: "metrics",
      title: "Game Statistics",
      metrics: [
        {
          name: "Active Games",
          value: gameStats.activeGames || 0,
          trend: this.calculateTrend("active_games", gameStats.activeGames),
        },
        {
          name: "Total Players",
          value: gameStats.totalPlayers || 0,
          trend: this.calculateTrend("total_players", gameStats.totalPlayers),
        },
        {
          name: "Avg Session",
          value: Math.round((gameStats.avgSessionTime || 0) / 60),
          unit: "min",
          trend: this.calculateTrend("avg_session", gameStats.avgSessionTime),
        },
      ],
      topGames: gameStats.topGames || [],
      timestamp: Date.now(),
    };
  }

  /**
   * Growth Trends Widget
   */
  async generateGrowthTrendsWidget() {
    const analyticsData = analytics.getMetrics();

    return {
      type: "growth_chart",
      title: "Growth Trends",
      data: {
        users: this.getTimeSeriesData("user_growth", 30),
        servers: this.getTimeSeriesData("server_growth", 30),
        commands: this.getTimeSeriesData("command_growth", 30),
      },
      growth: {
        userGrowth: analyticsData.userGrowthRate || 0,
        serverGrowth: analyticsData.serverGrowthRate || 0,
        commandGrowth: analyticsData.commandGrowthRate || 0,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Engagement Metrics Widget
   */
  async generateEngagementMetricsWidget() {
    const analyticsData = analytics.getMetrics();

    return {
      type: "engagement_metrics",
      title: "Engagement Metrics",
      data: {
        dau: analyticsData.dailyActiveUsers || 0,
        mau: analyticsData.monthlyActiveUsers || 0,
        sessionLength: analyticsData.avgSessionLength || 0,
        retention: analyticsData.retentionRate || 0,
        engagement: analyticsData.engagementScore || 0,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Feature ROI Widget
   */
  async generateFeatureROIWidget() {
    const analyticsData = analytics.getMetrics();
    const featureROI = analyticsData.featureROI || {};

    const features = Object.entries(featureROI).map(([feature, roi]) => ({
      name: feature,
      roi: Math.round(roi.value || 0),
      usage: roi.usage || 0,
      impact: roi.impact || 0,
    }));

    return {
      type: "roi_chart",
      title: "Feature ROI",
      data: features.sort((a, b) => b.roi - a.roi),
      timestamp: Date.now(),
    };
  }

  /**
   * User Segments Widget
   */
  async generateUserSegmentsWidget() {
    const analyticsData = analytics.getMetrics();
    const segments = analyticsData.userSegments || {};

    return {
      type: "segment_chart",
      title: "User Segments",
      data: Object.entries(segments).map(([segment, data]) => ({
        name: segment,
        count: data.count || 0,
        percentage: Math.round((data.percentage || 0) * 100),
        engagement: data.engagement || 0,
      })),
      timestamp: Date.now(),
    };
  }

  /**
   * Predictive Analytics Widget
   */
  async generatePredictiveAnalyticsWidget() {
    const analyticsData = analytics.getMetrics();

    return {
      type: "prediction_chart",
      title: "Predictive Analytics",
      predictions: {
        userGrowth: analyticsData.predictedUserGrowth || [],
        churnRisk: analyticsData.churnRiskUsers || [],
        popularFeatures: analyticsData.predictedPopularFeatures || [],
      },
      confidence: analyticsData.predictionConfidence || 0.7,
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate trend for metrics
   */
  calculateTrend(metric, currentValue) {
    // This would compare with historical data
    // For now, return a placeholder
    const trends = ["up", "down", "stable"];
    return trends[Math.floor(Math.random() * trends.length)];
  }

  /**
   * Get time series data
   */
  getTimeSeriesData(metric, hours) {
    // This would fetch actual time series data
    // For now, generate sample data
    const data = [];
    const now = Date.now();

    for (let i = hours; i >= 0; i--) {
      data.push({
        timestamp: now - i * 60 * 60 * 1000,
        value: Math.floor(Math.random() * 100) + 50,
      });
    }

    return data;
  }

  /**
   * Generate dashboard embed for Discord
   */
  async generateDashboardEmbed(dashboardId) {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    // Generate fresh data
    await this.generateDashboardData(dashboardId);

    const embed = new EmbedBuilder()
      .setTitle(dashboard.title)
      .setDescription(dashboard.description)
      .setColor(0x3498db)
      .setTimestamp();

    // Add widget summaries
    for (const [widgetId, widgetData] of dashboard.data.entries()) {
      if (widgetData.error) {
        embed.addFields({
          name: `❌ ${widgetId}`,
          value: `Error: ${widgetData.message}`,
          inline: true,
        });
        continue;
      }

      let fieldValue = "";

      switch (widgetData.type) {
        case "status":
          fieldValue = `${widgetData.status === "healthy" ? "✅" : "❌"} ${widgetData.value}`;
          break;
        case "counter":
          fieldValue = `${widgetData.value}${widgetData.trend ? ` (${widgetData.trend})` : ""}`;
          break;
        case "gauge":
          fieldValue = `${widgetData.value}${widgetData.unit || ""}`;
          break;
        case "metrics":
          fieldValue = widgetData.metrics
            .map((m) => `${m.name}: ${m.value}${m.unit || ""}`)
            .join("\n");
          break;
        default:
          fieldValue = "Data available";
      }

      embed.addFields({
        name: widgetData.title,
        value: fieldValue,
        inline: true,
      });
    }

    return embed;
  }

  /**
   * Schedule report generation
   */
  scheduleReport(reportId, config) {
    this.scheduledReports.set(reportId, {
      id: reportId,
      ...config,
      nextRun: Date.now() + config.interval,
      lastRun: null,
    });

    analytics.trackEvent("report_scheduled", {
      reportId,
      interval: config.interval,
    });
  }

  /**
   * Start report scheduler
   */
  startReportScheduler() {
    setInterval(() => {
      const now = Date.now();

      for (const [reportId, report] of this.scheduledReports.entries()) {
        if (now >= report.nextRun) {
          this.generateScheduledReport(reportId);
          report.lastRun = now;
          report.nextRun = now + report.interval;
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Generate scheduled report
   */
  async generateScheduledReport(reportId) {
    try {
      const report = this.scheduledReports.get(reportId);
      if (!report) return;

      // Generate report data based on configuration
      const reportData = await this.generateReportData(report);

      // Store report
      this.reports.set(`${reportId}_${Date.now()}`, reportData);

      analytics.trackEvent("scheduled_report_generated", {
        reportId,
        dataSize: JSON.stringify(reportData).length,
      });
    } catch (error) {
      console.error(`Error generating scheduled report ${reportId}:`, error);
    }
  }

  /**
   * Generate report data
   */
  async generateReportData(reportConfig) {
    // This would generate comprehensive report data
    // based on the report configuration
    return {
      id: reportConfig.id,
      type: reportConfig.type,
      generatedAt: Date.now(),
      data: {
        summary: "Report generated successfully",
        metrics: {},
        insights: [],
      },
    };
  }

  /**
   * Get dashboard list
   */
  getDashboardList() {
    return Array.from(this.dashboards.values()).map((dashboard) => ({
      id: dashboard.id,
      title: dashboard.title,
      description: dashboard.description,
      widgetCount: dashboard.widgets.length,
      lastUpdated: dashboard.lastUpdated,
      permissions: dashboard.permissions,
    }));
  }

  /**
   * Get analytics statistics
   */
  getAnalyticsStats() {
    return {
      dashboards: this.dashboards.size,
      reports: this.reports.size,
      scheduledReports: this.scheduledReports.size,
      widgets: this.widgets.size,
    };
  }
}

export const dashboardAnalytics = new DashboardAnalytics();
