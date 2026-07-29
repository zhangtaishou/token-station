const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');

const PORT = process.env.PORT || 3456;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');

// ── Ensure data directory exists ──
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Simple JSON DB ──
function dbRead(name) {
  const p = path.join(DATA_DIR, `${name}.json`);
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return []; }
}
function dbWrite(name, data) {
  fs.writeFileSync(path.join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2), 'utf-8');
}
function dbGet(name, id) {
  return dbRead(name).find(i => i.id === id) || null;
}

// ── Init default data ──
function initData() {
  if (!fs.existsSync(path.join(DATA_DIR, 'users.json'))) {
    dbWrite('users', [{
      id: 'admin-001',
      username: 'admin',
      email: 'admin@tokenstation.com',
      password: hashPassword('admin123'),
      role: 'admin',
      tokens: 999999,
      tokensUsed: 0,
      status: 'active',
      createdAt: new Date().toISOString()
    }, {
      id: 'demo-001',
      username: 'demo',
      email: 'demo@example.com',
      password: hashPassword('demo123'),
      role: 'user',
      tokens: 1000,
      tokensUsed: 0,
      status: 'active',
      createdAt: new Date().toISOString()
    }]);
  }
  if (!fs.existsSync(path.join(DATA_DIR, 'api_keys.json'))) dbWrite('api_keys', []);
  if (!fs.existsSync(path.join(DATA_DIR, 'usage_logs.json'))) dbWrite('usage_logs', []);
  if (!fs.existsSync(path.join(DATA_DIR, 'plans.json'))) {
    dbWrite('plans', [
      { id: 'free', name: '免费版', price: 0, tokens: 1000, rpm: 10, concurrent: 1, models: ['gpt-3.5-turbo'], features: ['基础API接入', '社区支持'] },
      { id: 'starter', name: '入门版', price: 29, tokens: 50000, rpm: 60, concurrent: 3, models: ['gpt-3.5-turbo', 'gpt-4'], features: ['全部模型', '优先队列', '邮件支持'] },
      { id: 'pro', name: '专业版', price: 99, tokens: 300000, rpm: 300, concurrent: 10, models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'claude-3'], features: ['全部模型', '专属通道', '技术支持', 'SLA 99.9%'] },
      { id: 'enterprise', name: '企业版', price: 499, tokens: 2000000, rpm: 1000, concurrent: 50, models: ['all'], features: ['全部模型', '专属算力', '7x24h支持', '定制化方案', 'SLA 99.99%'] }
    ]);
  }
  if (!fs.existsSync(path.join(DATA_DIR, 'orders.json'))) dbWrite('orders', []);
}

function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd + 'token-station-salt-2024').digest('hex');
}

function generateId() { return crypto.randomUUID().slice(0, 8); }
function generateApiKey() { return 'sk-' + crypto.randomBytes(32).toString('hex'); }

// ── Token Pricing (per 1K tokens) ──
const MODEL_PRICES = {
  'gpt-3.5-turbo': 0.002,
  'gpt-4': 0.03,
  'gpt-4-turbo': 0.01,
  'gpt-4o': 0.005,
  'claude-3-haiku': 0.0025,
  'claude-3-sonnet': 0.015,
  'claude-3-opus': 0.075,
  'default': 0.01
};

// ── Parse JSON body ──
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

// ── Static file serving ──
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  } catch {
    return false;
  }
  return true;
}

// ── Auth middleware ──
function getUserFromToken(req) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const users = dbRead('users');
  return users.find(u => u.token === token) || null;
}

// ── CORS headers ──
function writeCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function json(res, status, data) {
  writeCors(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

// ═══════════════════════════════════════════
//  ROUTER
// ═══════════════════════════════════════════
async function handleRequest(req, res) {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const method = req.method;

  writeCors(res);
  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── API Routes ──
  
  // Auth
  if (pathname === '/api/auth/register' && method === 'POST') {
    const body = await parseBody(req);
    const users = dbRead('users');
    if (users.find(u => u.email === body.email)) {
      return json(res, 400, { error: '邮箱已注册' });
    }
    if (users.find(u => u.username === body.username)) {
      return json(res, 400, { error: '用户名已存在' });
    }
    const user = {
      id: generateId(),
      username: body.username,
      email: body.email,
      password: hashPassword(body.password),
      role: 'user',
      tokens: 100, // new user bonus
      tokensUsed: 0,
      status: 'active',
      token: 'tok-' + crypto.randomBytes(24).toString('hex'),
      createdAt: new Date().toISOString()
    };
    users.push(user);
    dbWrite('users', users);
    const { password, ...safe } = user;
    return json(res, 200, { message: '注册成功', user: safe });
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    const body = await parseBody(req);
    const users = dbRead('users');
    const user = users.find(u => (u.email === body.email || u.username === body.email));
    if (!user || user.password !== hashPassword(body.password)) {
      return json(res, 401, { error: '邮箱/用户名或密码错误' });
    }
    user.token = 'tok-' + crypto.randomBytes(24).toString('hex');
    user.lastLoginAt = new Date().toISOString();
    dbWrite('users', users);
    const { password, ...safe } = user;
    return json(res, 200, { message: '登录成功', user: safe });
  }

  // User profile
  if (pathname === '/api/user/profile' && method === 'GET') {
    const user = getUserFromToken(req);
    if (!user) return json(res, 401, { error: '未登录' });pathname)      pathname.replace(/^\//, ''))                              
    
    const { password, ...safe } = user;
    return json(res, 200, { user: safe });
  }

  // API Keys management
  if (pathname === '/api/keys' && method === 'GET') {
    const user = getUserFromToken(req);
    if (!user) return json(res, 401, { error: '未登录' });
    const keys = dbRead('api_keys').filter(k => k.userId === user.id);
    return json(res, 200, { keys: keys.map(k => ({ ...k, key: k.key?.slice(0, 12) + '...' })) });
  }

  if (pathname === '/api/keys' && method === 'POST') {
    const user = getUserFromToken(req);
    if (!user) return json(res, 401, { error: '未登录' });
    const body = await parseBody(req);
    const rawKey = generateApiKey();
    const keys = dbRead('api_keys');
    const newKey = {
      id: generateId(),
      userId: user.id,
      name: body.name || '默认密钥',
      key: rawKey,
      keyPrefix: rawKey.slice(0, 12),
      model: body.model || 'gpt-3.5-turbo',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      usageCount: 0
    };
    keys.push(newKey);
    dbWrite('api_keys', keys);
    return json(res, 200, { message: '创建成功', key: newKey });
  }

  if (pathname.startsWith('/api/keys/') && method === 'DELETE') {
    const user = getUserFromToken(req);
    if (!user) return json(res, 401, { error: '未登录' });
    const keyId = pathname.split('/')[3];
    let keys = dbRead('api_keys');
    const idx = keys.findIndex(k => k.id === keyId && k.userId === user.id);
    if (idx === -1) return json(res, 404, { error: '密钥不存在' });
    keys.splice(idx, 1);
    dbWrite('api_keys', keys);
    return json(res, 200, { message: '已删除' });
  }

  // Usage statistics
  if (pathname === '/api/usage' && method === 'GET') {
    const user = getUserFromToken(req);
    if (!user) return json(res, 401, { error: '未登录' });
    const logs = dbRead('usage_logs').filter(l => l.userId === user.id);
    const days = {};
    const models = {};
    let totalTokens = 0;
    let totalCost = 0;
    logs.forEach(l => {
      const day = l.createdAt?.slice(0, 10) || 'unknown';
      days[day] = (days[day] || 0) + l.tokens;
      models[l.model] = (models[l.model] || 0) + l.tokens;
      totalTokens += l.tokens;
      totalCost += l.cost || 0;
    });
    return json(res, 200, {
      totalTokens,
      totalCost: Math.round(totalCost * 100) / 100,
      totalRequests: logs.length,
      dailyUsage: Object.entries(days).map(([date, tokens]) => ({ date, tokens })),
      modelUsage: Object.entries(models).map(([model, tokens]) => ({ model, tokens })),
      recentLogs: logs.slice(-20).reverse()
    });
  }

  // Plans
  if (pathname === '/api/plans' && method === 'GET') {
    const plans = dbRead('plans');
    return json(res, 200, { plans });
  }

  // Admin: users
  if (pathname === '/api/admin/users' && method === 'GET') {
    const user = getUserFromToken(req);
    if (!user || user.role !== 'admin') return json(res, 403, { error: '无权访问' });
    const users = dbRead('users').map(u => {
      const { password, ...safe } = u;
      return safe;
    });
    return json(res, 200, { users });
  }

  if (pathname === '/api/admin/users/toggle-status' && method === 'POST') {
    const user = getUserFromToken(req);
    if (!user || user.role !== 'admin') return json(res, 403, { error: '无权访问' });
    const body = await parseBody(req);
    const users = dbRead('users');
    const target = users.find(u => u.id === body.userId);
    if (!target) return json(res, 404, { error: '用户不存在' });
    target.status = target.status === 'active' ? 'suspended' : 'active';
    dbWrite('users', users);
    return json(res, 200, { message: '状态已更新', status: target.status });
  }

  if (pathname === '/api/admin/stats' && method === 'GET') {
    const user = getUserFromToken(req);
    if (!user || user.role !== 'admin') return json(res, 403, { error: '无权访问' });
    const users = dbRead('users');
    const keys = dbRead('api_keys');
    const logs = dbRead('usage_logs');
    const totalTokens = logs.reduce((s, l) => s + (l.tokens || 0), 0);
    return json(res, 200, {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.status === 'active').length,
      totalKeys: keys.length,
      totalRequests: logs.length,
      totalTokens
    });
  }

  // ── Proxy endpoint (mock) ──
  if (pathname === '/api/proxy/chat' && method === 'POST') {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) return json(res, 401, { error: '请提供 API Key' });
    const keyStr = auth.slice(7);
    const keys = dbRead('api_keys');
    const apiKey = keys.find(k => k.key === keyStr && k.isActive);
    if (!apiKey) return json(res, 403, { error: 'API Key 无效或已禁用' });
    const users = dbRead('users');
    const user = users.find(u => u.id === apiKey.userId);
    if (!user || user.status !== 'active') return json(res, 403, { error: '账户已被禁用' });
    const body = await parseBody(req);
    const model = body.model || apiKey.model;
    const price = (MODEL_PRICES[model] || MODEL_PRICES.default);
    // estimate tokens from messages
    const messages = body.messages || [];
    const estimatedTokens = messages.reduce((s, m) => s + (m.content?.length || 0), 0) / 2 + 50;
    const cost = (estimatedTokens / 1000) * price;
    if (user.tokens < estimatedTokens) return json(res, 402, { error: '余额不足' });
    // Deduct tokens
    user.tokens -= Math.ceil(estimatedTokens);
    user.tokensUsed = (user.tokensUsed || 0) + Math.ceil(estimatedTokens);
    apiKey.lastUsedAt = new Date().toISOString();
    apiKey.usageCount = (apiKey.usageCount || 0) + 1;
    // Log usage
    const logs = dbRead('usage_logs');
    logs.push({
      id: generateId(),
      userId: user.id,
      apiKeyId: apiKey.id,
      model,
      tokens: Math.ceil(estimatedTokens),
      cost: Math.round(cost * 100000) / 100000,
      endpoint: '/v1/chat/completions',
      createdAt: new Date().toISOString()
    });
    dbWrite('usage_logs', logs);
    dbWrite('users', users);
    dbWrite('api_keys', keys);
    return json(res, 200, {
      id: 'chatcmpl-' + generateId(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      usage: { prompt_tokens: Math.ceil(estimatedTokens * 0.6), completion_tokens: Math.ceil(estimatedTokens * 0.4), total_tokens: Math.ceil(estimatedTokens) },
      choices: [{ index: 0, message: { role: 'assistant', content: `[模拟回复] 您使用了 ${Math.ceil(estimatedTokens)} tokens (模型: ${model})，余额剩余 ${Math.round(user.tokens)} tokens。` }, finish_reason: 'stop' }]
    });
  }

  // ── Static files ──
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  
  // SPA routing: if no extension, serve as page
  if (!path.extname(pathname) && pathname !== '/') {
    filePath = path.join(PUBLIC_DIR, 'pages', pathname.slice(1) + '.html');
    if (!fs.existsSync(filePath)) {
      filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    }
  }

  if (serveStatic(res, filePath)) return;

  // Fallback to index.html for SPA
  if (serveStatic(res, path.join(PUBLIC_DIR, 'index.html'))) return;

  json(res, 404, { error: 'Not Found' });
}

// ═══════════════════════════════════════════
//  START
// ═══════════════════════════════════════════
initData();
const server = http.createServer(handleRequest);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✦ Token Station 中转站 v1.0`);
  console.log(`✦ 服务运行于 http://localhost:${PORT}`);
  console.log(`✦ 管理后台: http://localhost:${PORT}/admin`);
  console.log(`✦ 默认管理员: admin / admin123`);
  console.log(`✦ 默认体验: demo / demo123`);
});
