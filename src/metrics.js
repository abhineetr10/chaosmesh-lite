const metrics = {
  totalRequests: 0,
  failedRequests: 0,
  totalLatencyMs: 0,
  activeConnections: 0,
  recentLatencies: [],

  recordRequest: function(latency, isError) {
    console.log(`>>> RECORDED REQUEST: latency=${latency}, total=${this.totalRequests + 1}`);
    this.totalRequests++;
    this.totalLatencyMs += latency;
    if (isError) this.failedRequests++;

    this.recentLatencies.push(latency);
    if (this.recentLatencies.length > 50) {
      this.recentLatencies.shift();
    }
  },

  getStats: function() {
    const avg = this.totalRequests === 0 ? 0 : this.totalLatencyMs / this.totalRequests;

    let p95 = 0;
    if (this.recentLatencies.length > 0) {
      const sorted = [...this.recentLatencies].sort((a, b) => a - b);
      const idx = Math.floor(sorted.length * 0.95);
      p95 = sorted[idx] || 0;
    }

    return {
      totalRequests: this.totalRequests,
      errorRate: this.totalRequests === 0 ? 0 : parseFloat((this.failedRequests / this.totalRequests).toFixed(2)),
      avgLatencyMs: Math.round(avg),
      p95LatencyMs: p95,
      activeConnections: this.activeConnections
    };
  }
};

module.exports = metrics;