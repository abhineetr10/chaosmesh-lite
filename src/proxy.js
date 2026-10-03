const httpProxy = require('http-proxy');
const config = require('./config');
const metrics = require('./metrics');

const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  ws: true
});

// Intercept proxy responses to properly record metrics
proxy.on('proxyRes', (proxyRes, req, res) => {
  metrics.activeConnections = Math.max(0, metrics.activeConnections - 1);
  const latency = Date.now() - (req._startTime || Date.now());
  const isError = proxyRes.statusCode >= 400;
  metrics.recordRequest(latency, isError);
});

// Intercept proxy errors (e.g. mock server down or dropped)
proxy.on('error', (err, req, res) => {
  metrics.activeConnections = Math.max(0, metrics.activeConnections - 1);
  const latency = Date.now() - (req._startTime || Date.now());
  metrics.recordRequest(latency, true);

  if (!res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy Error', message: err.message }));
  }
});

function chaosMiddleware(req, res) {
  req._startTime = Date.now();
  metrics.activeConnections++;

  // Chaos check: Disabled
  if (!config.enabled) {
    return proxy.web(req, res, { target: config.targetUrl });
  }

  // Chaos: Connection Drop
  if (config.connectionDrop && config.connectionDrop.enabled) {
    if (Math.random() < config.connectionDrop.rate) {
      metrics.activeConnections = Math.max(0, metrics.activeConnections - 1);
      metrics.recordRequest(0, true);
      return req.destroy();
    }
  }

  // Chaos: Fault / Error Injection
  if (config.faultInjection && config.faultInjection.enabled) {
    if (Math.random() < config.faultInjection.failureRate) {
      metrics.activeConnections = Math.max(0, metrics.activeConnections - 1);
      const latency = Date.now() - req._startTime;
      metrics.recordRequest(latency, true);
      return res.status(config.faultInjection.statusCode || 500).json({
        error: config.faultInjection.errorMessage || 'Chaos Injected Error'
      });
    }
  }

  // Chaos: Latency & Jitter
  let delay = 0;
  if (config.latency && config.latency.enabled) {
    const jitter = (Math.random() * 2 - 1) * (config.latency.jitterMs || 0);
    delay = Math.max(0, (config.latency.delayMs || 0) + jitter);
  }

  if (delay > 0) {
    setTimeout(() => {
      proxy.web(req, res, { target: config.targetUrl });
    }, delay);
  } else {
    proxy.web(req, res, { target: config.targetUrl });
  }
}

module.exports = chaosMiddleware;