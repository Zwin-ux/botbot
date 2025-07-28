/**
 * Performance monitoring utilities for BotBot
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.startTimes = new Map();
  }

  /**
   * Start timing an operation
   * @param {string} operation - Name of the operation
   * @param {string} id - Unique identifier for this instance
   */
  startTimer(operation, id = "default") {
    const key = `${operation}:${id}`;
    this.startTimes.set(key, process.hrtime.bigint());
  }

  /**
   * End timing an operation and record the metric
   * @param {string} operation - Name of the operation
   * @param {string} id - Unique identifier for this instance
   * @returns {number} Duration in milliseconds
   */
  endTimer(operation, id = "default") {
    const key = `${operation}:${id}`;
    const startTime = this.startTimes.get(key);

    if (!startTime) {
      console.warn(`No start time found for ${key}`);
      return 0;
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    this.startTimes.delete(key);
    this.recordMetric(operation, duration);

    return duration;
  }

  /**
   * Record a metric value
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   */
  recordMetric(name, value) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        count: 0,
        total: 0,
        min: Infinity,
        max: -Infinity,
        avg: 0,
      });
    }

    const metric = this.metrics.get(name);
    metric.count++;
    metric.total += value;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
    metric.avg = metric.total / metric.count;
  }

  /**
   * Get performance statistics
   * @param {string} name - Metric name (optional)
   * @returns {Object} Performance stats
   */
  getStats(name = null) {
    if (name) {
      return this.metrics.get(name) || null;
    }

    const stats = {};
    for (const [metricName, data] of this.metrics) {
      stats[metricName] = { ...data };
    }
    return stats;
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics.clear();
    this.startTimes.clear();
  }

  /**
   * Log performance summary
   */
  logSummary() {
    console.log("\n=== BotBot Performance Summary ===");
    for (const [name, stats] of this.metrics) {
      console.log(`${name}:`);
      console.log(`  Count: ${stats.count}`);
      console.log(`  Avg: ${stats.avg.toFixed(2)}ms`);
      console.log(`  Min: ${stats.min.toFixed(2)}ms`);
      console.log(`  Max: ${stats.max.toFixed(2)}ms`);
    }
    console.log("================================\n");
  }
}

// Global instance
const performanceMonitor = new PerformanceMonitor();

export { PerformanceMonitor, performanceMonitor };
