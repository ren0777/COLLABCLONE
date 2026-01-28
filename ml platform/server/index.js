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

const usersFilePath = path.join(__dirname, 'users.json');

// Load users from file, or create admin if it doesn't exist
function loadUsers() {
  if (fs.existsSync(usersFilePath)) {
    const data = fs.readFileSync(usersFilePath, 'utf-8');
    const usersArray = JSON.parse(data);
    users.clear();
    if (usersArray.length === 0) {
      // Create a default admin user if the user file is empty
      bcrypt.hash('admin', 10).then(hashedPassword => {
        users.set('admin', { password: hashedPassword, role: 'admin' });
        saveUsers();
      });
    } else {
      usersArray.forEach(([username, userData]) => {
        users.set(username, userData);
      });
    }
  } else {
    // Create a default admin user if no user file exists
    bcrypt.hash('admin', 10).then(hashedPassword => {
      users.set('admin', { password: hashedPassword, role: 'admin' });
      saveUsers();
    });
  }
}

// Save users to file
function saveUsers() {
  const usersArray = Array.from(users.entries());
  fs.writeFileSync(usersFilePath, JSON.stringify(usersArray, null, 2));
}

loadUsers();

// Ensure user notebook directories exist
const notebooksDir = path.join(__dirname, '..', 'notebooks');
if (!fs.existsSync(notebooksDir)) {
  fs.mkdirSync(notebooksDir, { recursive: true });
}

// Auth routes
// Middleware to require admin role
function requiresAdmin(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: 'Missing token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    req.user = decoded; // Attach user info to request
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}

app.post('/auth/signup', async (req, res) => {
  const { username, password } = req.body;
  if (users.has(username)) {
    return res.status(400).json({ message: 'User already exists' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const userObject = { password: hashedPassword, role: "user" }; // Default role
  if (username === "admin") { // Assign admin role for "admin" user
    userObject.role = "admin";
  }
  users.set(username, userObject);
  saveUsers(); // Save users after signup

  // Create a directory for the user's notebooks
  const userNotebooksDir = path.join(notebooksDir, username);
  if (!fs.existsSync(userNotebooksDir)) {
    fs.mkdirSync(userNotebooksDir);
  }

  const token = jwt.sign({ username, role: userObject.role }, JWT_SECRET, { expiresIn: '7d' }); // Include role in token
  res.json({ token });
});

app.post('/auth/login', async (req, res) => {
  console.log('Login request received:', req.body);
  const { username, password } = req.body;
  const user = users.get(username);
  console.log('User from map:', user);
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign({ username, role: user.role }, JWT_SECRET, { expiresIn: '7d' }); // Include role in token
  res.json({ token });
});

// API route
app.post('/session/new', (req, res) => {
  const { token } = req.body;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = decoded.username; // Use username from decoded token
    const proxyToken = crypto.randomBytes(16).toString('hex'); // Generate a random session ID
    sessions.set(proxyToken, { user, jupyterToken: DEV_JUPYTER_TOKEN, created: Date.now() });
    res.json({ sessionToken: proxyToken, jupyterBase: '/jupyter' });
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

// Admin APIs
app.get("/admin/users", requiresAdmin, (req, res) => {
  // Return users with their roles (excluding passwords)
  const usersWithRoles = Array.from(users.entries()).map(([username, data]) => ({
    username,
    role: data.role
  }));
  res.json(usersWithRoles);
});

app.get("/admin/sessions", requiresAdmin, (req, res) => {
  res.json([...sessions.entries()]);
});

// Admin API to create a new user
app.post("/admin/user", requiresAdmin, async (req, res) => {
  const { username, password, role = "user" } = req.body; // Default role to 'user'
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }
  if (users.has(username)) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  users.set(username, { password: hashedPassword, role });
  saveUsers(); // Save users after creating a new user

  // Create a directory for the user's notebooks
  const userNotebooksDir = path.join(notebooksDir, username);
  if (!fs.existsSync(userNotebooksDir)) {
    fs.mkdirSync(userNotebooksDir);
  }

  res.status(201).json({ message: `User ${username} created with role ${role}` });
});

app.delete("/admin/user/:username", requiresAdmin, (req, res) => {
  const { username } = req.params;
  if (!users.has(username)) return res.status(404).json({ message: "User not found" });
  // Prevent admin from deleting themselves
  if (req.user.username === username && req.user.role === "admin") {
    return res.status(403).json({ message: "Admin cannot delete their own account." });
  }

  users.delete(username);
  saveUsers(); // Save users after deleting a user
  // Also delete their notebooks directory
  const userNotebooksDir = path.join(notebooksDir, username);
  if (fs.existsSync(userNotebooksDir)) {
    fs.rmSync(userNotebooksDir, { recursive: true, force: true });
  }
  // End any active sessions for the deleted user
  for (let [sessionKey, sessionData] of sessions.entries()) {
    if (sessionData.user === username) {
      sessions.delete(sessionKey);
    }
  }
  res.json({ message: "User and associated data deleted" });
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
app.get('/health', (req, res) => {
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
