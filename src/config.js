const chaosConfig = {
  enabled: true,
  targetUrl: process.env.TARGET_URL || 'http://localhost:3000',

  latency: {
    enabled: false,
    delayMs: 1500,
    jitterMs: 200
  },

  faultInjection: {
    enabled: false,
    statusCode: 500,
    failureRate: 0.5,
    errorMessage: 'ChaosMesh-Lite: Simulated Upstream Failure'
  },

  connectionDrop: {
    enabled: false,
    rate: 0.2
  }
};

module.exports = chaosConfig;