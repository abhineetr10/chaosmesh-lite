const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: 'Alice', role: 'Engineer' },
    { id: 2, name: 'Bob', role: 'Designer' }
  ]);
});

app.post('/api/orders', (req, res) => {
  res.status(201).json({ status: 'Order created', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`[Mock Target Service] Running on http://localhost:${PORT}`);
});