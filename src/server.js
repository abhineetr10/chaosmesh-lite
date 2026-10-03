const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const config = require('./config');
const metrics = require('./metrics');
const chaosMiddleware = require('./proxy');

const app = express();
app.use(cors());
app.use(express.json());

// Control API to inspect and update chaos rules
app.get('/api/config', (req, res) => res.json(config));
app.post('/api/config', (req, res) => {
  Object.assign(config, req.body);
  console.log('🛠️ [Config Updated]:', JSON.stringify(config, null, 2));
  res.json({ status: 'success', config });
});

// Any other request goes straight through the Chaos Proxy
app.use((req, res) => chaosMiddleware(req, res));

const server = http.createServer(app);

// WebSocket Server for live metric streaming to the dashboard
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('📡 [WebSocket] Client dashboard connected');

  // Push updated metrics every 500ms
  const interval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(metrics.getStats()));
    }
  }, 500);

  ws.on('close', () => clearInterval(interval));
});

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`🚀 [ChaosMesh Proxy] Running on http://localhost:${PORT}`);
  console.log(`🎯 [Routing To Upstream] ${config.targetUrl}`);
});