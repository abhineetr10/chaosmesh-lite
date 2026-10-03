const httpProxy = require('http-proxy');
const config = require('./config');
const metrics = require('./metrics');

const proxy = httpProxy.createProxyServer({});

proxy.on('error', (err, req, res) => {
  console.error('[Proxy Error]:', err.message);
  if (!res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
  }
  res.end(JSON.stringify({ error: 'Target Offline or Bad Gateway' }));
});

const chaosMiddleware = (req, res) => {
  metrics.activeConnections++;
  const startTime = Date.now();

  res.on('finish', () => {
    metrics.activeConnections--;
    const latency = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    metrics.recordRequest(latency, isError);
  });

  if (!config.enabled) {
    return proxy.web(req, res, { target: config.targetUrl });
  }

  // Fault 1: Abrupt Connection Drop
  if (config.connectionDrop.enabled && Math.random() < config.connectionDrop.rate) {
    console.log(`⚡ [Chaos] Dropped TCP connection for ${req.method} ${req.url}`);
    return req.socket.destroy();
  }

  // Fault 2: HTTP Status Fault Injection
  if (config.faultInjection.enabled && Math.random() < config.faultInjection.failureRate) {
    console.log(`🔥 [Chaos] Injected ${config.faultInjection.statusCode} error for ${req.url}`);
    res.writeHead(config.faultInjection.statusCode, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: config.faultInjection.errorMessage }));
  }

  // Fault 3: Latency & Jitter Injection
  if (config.latency.enabled) {
    const jitter = Math.floor(Math.random() * (config.latency.jitterMs * 2)) - config.latency.jitterMs;
    const delay = Math.max(0, config.latency.delayMs + jitter);

    console.log(`⏳ [Chaos] Delayed ${req.url} by ${delay}ms`);
    return setTimeout(() => {
      proxy.web(req, res, { target: config.targetUrl });
    }, delay);
  }

  // Default passthrough
  proxy.web(req, res, { target: config.targetUrl });
};

module.exports = chaosMiddleware;