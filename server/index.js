// server/index.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const crypto = require('crypto');


const app = express();
app.use(express.json());


const JUPYTER_BASE = process.env.JUPYTER_BASE || 'http://jupyter:8888'; // when in k8s jupyter service
const DEV_JUPYTER_TOKEN = process.env.DEV_JUPYTER_TOKEN || 'devtoken';


// very small in-memory session map for dev
const sessions = new Map();


function genToken() {
return crypto.randomBytes(16).toString('hex');
}


app.post('/api/session/new', (req, res) => {
const user = req.body.user || 'guest';
const proxyToken = genToken();
sessions.set(proxyToken, { user, jupyterToken: DEV_JUPYTER_TOKEN, created: Date.now() });
res.json({ sessionToken: proxyToken, jupyterBase: '/jupyter' });
});


// Proxy to Jupyter, attach token server-side so clients never see real token
app.use('/jupyter', createProxyMiddleware({
target: JUPYTER_BASE,
changeOrigin: true,
ws: true,
pathRewrite: { '^/jupyter': '' },
onProxyReq: (proxyReq, req, res) => {
try {
const sessionToken = req.query.session || req.headers['x-session-token'];
let tokenToAttach = DEV_JUPYTER_TOKEN;
if (sessionToken && sessions.has(sessionToken)) {
const s = sessions.get(sessionToken);
tokenToAttach = s.jupyterToken;
}
// proxyReq.path may include query; append token param
const hasQ = proxyReq.path.includes('?');
proxyReq.path = proxyReq.path + (hasQ ? '&' : '?') + 'token=' + tokenToAttach;
} catch (err) {
console.error('proxy attach token error', err);
}
}
}));


const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Session proxy listening on ${port}`));