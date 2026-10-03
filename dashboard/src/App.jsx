import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Clock, Zap, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const BACKEND_URL = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000';

export default function App() {
  const [config, setConfig] = useState({
    enabled: true,
    latency: { enabled: false, delayMs: 1500, jitterMs: 200 },
    faultInjection: { enabled: false, statusCode: 500, failureRate: 0.5, errorMessage: 'Chaos Outage' },
    connectionDrop: { enabled: false, rate: 0.2 }
  });

  const [metrics, setMetrics] = useState({
    totalRequests: 0,
    errorRate: 0,
    avgLatencyMs: 0,
    p95LatencyMs: 0,
    activeConnections: 0
  });

  const [history, setHistory] = useState([]);
  const [testResult, setTestResult] = useState('');

  // 1. Fetch active config on initial load
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/config`)
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error('Failed to load initial config:', err));
  }, []);

  // 2. Connect to WebSocket stream for live metrics
  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMetrics(data);

      setHistory(prev => {
        const next = [...prev, { time: new Date().toLocaleTimeString(), latency: data.avgLatencyMs, p95: data.p95LatencyMs }];
        return next.length > 20 ? next.slice(1) : next;
      });
    };

    return () => ws.close();
  }, []);

  // 3. Update Chaos Configuration
  const updateConfig = async (newConfig) => {
    setConfig(newConfig);
    await fetch(`${BACKEND_URL}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig)
    });
  };

  // 4. Send a test traffic ping through the proxy
  const fireTestTraffic = async () => {
    setTestResult('Sending request...');
    const start = Date.now();
    try {
      const res = await fetch(`${BACKEND_URL}/api/users`);
      const data = await res.json();
      const elapsed = Date.now() - start;
      if (res.ok) {
        setTestResult(`✅ 200 OK (${elapsed}ms): Received ${data.length} users`);
      } else {
        setTestResult(`🔥 ${res.status} Error (${elapsed}ms): ${data.error || 'Failed'}`);
      }
    } catch (err) {
      setTestResult(`⚡ Connection Terminated (${Date.now() - start}ms)`);
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '24px', maxWidth: '1100px', margin: '0 auto', color: '#1e293b' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>⚡ ChaosMesh-Lite</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b' }}>Network Resilience & Fault Injection Control Plane</p>
        </div>
        <button
          onClick={fireTestTraffic}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          <RefreshCw size={16} /> Send Traffic Request
        </button>
      </header>

      {testResult && (
        <div style={{ padding: '12px 16px', marginBottom: '20px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', fontWeight: 500 }}>
          Live Request Test: {testResult}
        </div>
      )}

      {/* Metrics Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '8px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Total Requests</span>
          <h2 style={{ margin: '8px 0 0', fontSize: '24px' }}>{metrics.totalRequests}</h2>
        </div>
        <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '8px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Error Rate</span>
          <h2 style={{ margin: '8px 0 0', fontSize: '24px', color: metrics.errorRate > 0 ? '#ef4444' : '#1e293b' }}>
            {(metrics.errorRate * 100).toFixed(0)}%
          </h2>
        </div>
        <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '8px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Avg Latency</span>
          <h2 style={{ margin: '8px 0 0', fontSize: '24px' }}>{metrics.avgLatencyMs} ms</h2>
        </div>
        <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '8px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>p95 Latency</span>
          <h2 style={{ margin: '8px 0 0', fontSize: '24px', color: '#8b5cf6' }}>{metrics.p95LatencyMs} ms</h2>
        </div>
      </div>

      {/* Real-Time Telemetry Graph */}
      <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Real-Time Latency Stream (ms)</h3>
        <div style={{ height: '220px', width: '100%' }}>
          <ResponsiveContainer>
            <LineChart data={history}>
              <XAxis dataKey="time" hide />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="latency" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="p95" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fault Injection Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        
        {/* Latency Injector */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: config.latency.enabled ? '#eff6ff' : '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Clock size={20} color="#2563eb" />
            <h4 style={{ margin: 0 }}>Latency Injection</h4>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.latency.enabled}
              onChange={(e) => updateConfig({ ...config, latency: { ...config.latency, enabled: e.target.checked } })}
            />
            Enable Delay
          </label>
          <label style={{ fontSize: '13px', color: '#64748b' }}>Delay Duration: {config.latency.delayMs}ms</label>
          <input
            type="range"
            min="200"
            max="4000"
            step="100"
            value={config.latency.delayMs}
            disabled={!config.latency.enabled}
            onChange={(e) => updateConfig({ ...config, latency: { ...config.latency, delayMs: Number(e.target.value) } })}
            style={{ width: '100%', marginTop: '6px' }}
          />
        </div>

        {/* HTTP Fault Injector */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: config.faultInjection.enabled ? '#fef2f2' : '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <AlertTriangle size={20} color="#dc2626" />
            <h4 style={{ margin: 0 }}>HTTP Faults</h4>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.faultInjection.enabled}
              onChange={(e) => updateConfig({ ...config, faultInjection: { ...config.faultInjection, enabled: e.target.checked } })}
            />
            Inject Status Code
          </label>
          <label style={{ fontSize: '13px', color: '#64748b' }}>Failure Rate: {(config.faultInjection.failureRate * 100).toFixed(0)}%</label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={config.faultInjection.failureRate}
            disabled={!config.faultInjection.enabled}
            onChange={(e) => updateConfig({ ...config, faultInjection: { ...config.faultInjection, failureRate: Number(e.target.value) } })}
            style={{ width: '100%', marginTop: '6px' }}
          />
        </div>

        {/* Connection Drop */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: config.connectionDrop.enabled ? '#fffbeb' : '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Zap size={20} color="#d97706" />
            <h4 style={{ margin: 0 }}>TCP Drop</h4>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.connectionDrop.enabled}
              onChange={(e) => updateConfig({ ...config, connectionDrop: { ...config.connectionDrop, enabled: e.target.checked } })}
            />
            Abrupt Socket Drops
          </label>
          <label style={{ fontSize: '13px', color: '#64748b' }}>Drop Rate: {(config.connectionDrop.rate * 100).toFixed(0)}%</label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={config.connectionDrop.rate}
            disabled={!config.connectionDrop.enabled}
            onChange={(e) => updateConfig({ ...config, connectionDrop: { ...config.connectionDrop, rate: Number(e.target.value) } })}
            style={{ width: '100%', marginTop: '6px' }}
          />
        </div>

      </div>
    </div>
  );
}