const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const JUPYTER_BASE = process.env.JUPYTER_BASE || 'http://jupyter:8888';
const DEV_JUPYTER_TOKEN = process.env.DEV_JUPYTER_TOKEN || 'devtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';
const sessions = new Map();
const users = new Map(); 

// Ensure user notebook directories exist
const notebooksDir = path.join(__dirname, '..', 'notebooks');
if (!fs.existsSync(notebooksDir)) {
  fs.mkdirSync(notebooksDir, { recursive: true });
}

// Auth routes
app.post('/api/auth/signup', async (req, res) => {
  const { username, password } = req.body;
  if (users.has(username)) {
    return res.status(400).json({ message: 'User already exists' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  users.set(username, { password: hashedPassword });

  // Create a directory for the user's notebooks
  const userNotebooksDir = path.join(notebooksDir, username);
  if (!fs.existsSync(userNotebooksDir)) {
    fs.mkdirSync(userNotebooksDir);
  }

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' }); // Increased expiration
  res.json({ token });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.get(username);
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' }); // Increased expiration
  res.json({ token });
});

// API route
app.post('/api/session/new', (req, res) => {
  const { token } = req.body;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = decoded.username;
    const proxyToken = crypto.randomBytes(16).toString('hex'); // Generate a random session ID
    sessions.set(proxyToken, { user, jupyterToken: DEV_JUPYTER_TOKEN, created: Date.now() });
    res.json({ sessionToken: proxyToken, jupyterBase: '/jupyter' });
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

// Proxy route
app.use(
  '/jupyter',
  createProxyMiddleware({
    target: JUPYTER_BASE,
    changeOrigin: true,
    ws: true,
    onProxyReq: (proxyReq, req, res) => {
      try {
        const sessionToken = req.query.session || req.headers['x-session-token'];
        let tokenToAttach = DEV_JUPYTER_TOKEN;
        let user = null;

        if (sessionToken && sessions.has(sessionToken)) {
          const s = sessions.get(sessionToken);
          tokenToAttach = s.jupyterToken;
          user = s.user;
        }


        const hasQ = proxyReq.path.includes('?');
        proxyReq.path = proxyReq.path + (hasQ ? '&' : '?') + 'token=' + tokenToAttach;
      } catch (err) {
        console.error('Proxy attach token error:', err);
      }
    },
  })
);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

// Root diagnostics endpoint
app.get('/', (req, res) => {
  res.send('Backend API is running!');
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`🚀 Session proxy listening on port ${port}`);
  console.log(`Using JWT_SECRET: ${JWT_SECRET}`);
});
