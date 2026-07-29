// ═══════════════════════════════════════════
// Token Station 前端应用
// ═══════════════════════════════════════════

const API = window.location.origin;
let currentUser = null;
let currentPage = "home";

function toast(msg, type) {
  type = type || "success";
  const el = document.createElement("div");
  el.className = "toast toast-" + type;
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(function() { el.classList.add("show"); });
  setTimeout(function() { el.classList.remove("show"); setTimeout(function() { el.remove(); }, 300); }, 3000);
}

async function api(path, opts) {
  opts = opts || {};
  var headers = { "Content-Type": "application/json" };
  if (opts.headers) Object.assign(headers, opts.headers);
  if (currentUser) headers["Authorization"] = "Bearer " + currentUser.token;
  try {
    var res = await fetch(API + path, Object.assign({}, opts, { headers: headers }));
    var data = await res.json();
    if (!res.ok && data.error) throw new Error(data.error);
    return data;
  } catch (e) {
    if (e.message === "Failed to fetch") throw new Error("无法连接到服务器");
    throw e;
  }
}

function navigate(page) {
  currentPage = page;
  window.history.pushState({ page: page }, "", page === "home" ? "/" : "/" + page);
  render();
}

window.addEventListener("popstate", function(e) {
  currentPage = (e.state && e.state.page) || "home";
  render();
});

function setUser(user) {
  currentUser = user;
  if (user) localStorage.setItem("token_station_user", JSON.stringify(user));
  else localStorage.removeItem("token_station_user");
  renderNavbar();
}

function initAuth() {
  var saved = localStorage.getItem("token_station_user");
  if (saved) {
    try { currentUser = JSON.parse(saved); } catch(e) { currentUser = null; }
  }
  renderNavbar();
}

function renderNavbar() {
  var container = document.getElementById("navbar-container");
  if (!container) return;
  var authed = !!currentUser;
  var isAdmin = currentUser && currentUser.role === "admin";
  var navHtml = "";
  navHtml += '<a onclick="navigate(\'home\')" class="' + (currentPage === "home" ? "active" : "") + '">首页</a>';
  navHtml += '<a onclick="navigate(\'pricing\')" class="' + (currentPage === "pricing" ? "active" : "") + '">定价</a>';
  navHtml += '<a onclick="navigate(\'docs\')" class="' + (currentPage === "docs" ? "active" : "") + '">文档</a>';
  if (authed) {
    navHtml += '<a onclick="navigate(\'dashboard\')" class="' + (currentPage === "dashboard" ? "active" : "") + '">控制台</a>';
    navHtml += '<a onclick="navigate(\'keys\')" class="' + (currentPage === "keys" ? "active" : "") + '">API密钥</a>';
  }
  if (isAdmin) {
    navHtml += '<a onclick="navigate(\'admin\')" class="' + (currentPage === "admin" ? "active" : "") + '">管理</a>';
  }
  var rightHtml = "";
  if (authed) {
    rightHtml = '<div class="navbar-user" onclick="toggleUserMenu()">' +
      '<div class="avatar" style="background:linear-gradient(135deg,#7c5cbf,#5b5bd6)">' + currentUser.username[0] + '</div>' +
      '<span>' + currentUser.username + '</span>' +
      '<span style="color:var(--accent-light);font-weight:600;font-size:12px">' + Math.round(currentUser.tokens) + ' T</span></div>';
  } else {
    rightHtml = '<button class="btn btn-secondary btn-sm" onclick="navigate(\'login\')">登录</button>' +
      '<button class="btn btn-primary btn-sm" onclick="navigate(\'register\')">注册</button>';
  }
  container.innerHTML = '<nav class="navbar"><div class="navbar-inner">' +
    '<a class="navbar-logo" href="#" onclick="navigate(\'home\')"><div class="logo-icon">T</div><span>TokenStation</span></a>' +
    '<div class="navbar-nav">' + navHtml + '</div>' +
    '<div class="navbar-right">' + rightHtml + '</div></div></nav>';
  if (authed) {
    var menu = document.getElementById("user-menu");
    if (!menu) {
      menu = document.createElement("div");
      menu.id = "user-menu";
      menu.style.cssText = "display:none;position:fixed;top:56px;right:24px;z-index:200;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:8px;min-width:160px;box-shadow:var(--shadow)";
      menu.innerHTML = '<div style="padding:8px 12px;font-size:13px;color:var(--text-muted)">' + currentUser.email + '</div>' +
        '<div style="border-top:1px solid var(--border);margin:4px 0"></div>' +
        '<a style="display:block;padding:8px 12px;font-size:13px;color:var(--text-secondary);cursor:pointer;border-radius:6px" onclick="navigate(\'dashboard\');hideUserMenu()">控制台</a>' +
        '<a style="display:block;padding:8px 12px;font-size:13px;color:var(--text-secondary);cursor:pointer;border-radius:6px" onclick="navigate(\'keys\');hideUserMenu()">API密钥</a>' +
        '<a style="display:block;padding:8px 12px;font-size:13px;color:var(--red);cursor:pointer;border-radius:6px" onclick="logout()">退出登录</a>';
      document.body.appendChild(menu);
    }
    menu.style.display = "none";
  }
}

function toggleUserMenu() { var m = document.getElementById("user-menu"); if (m) m.style.display = m.style.display === "none" ? "block" : "none"; }
function hideUserMenu() { var m = document.getElementById("user-menu"); if (m) m.style.display = "none"; }
document.addEventListener("click", function(e) {
  if (!e.target.closest(".navbar-user") && !e.target.closest("#user-menu")) {
    var m = document.getElementById("user-menu"); if (m) m.style.display = "none";
  }
});

async function logout() { setUser(null); toast("已退出登录"); navigate("home"); }

function render() {
  var main = document.getElementById("main-content");
  if (!main) return;
  renderNavbar();
  switch (currentPage) {
    case "home": renderHome(main); break;
    case "login": renderLogin(main); break;
    case "register": renderRegister(main); break;
    case "dashboard": renderDashboard(main); break;
    case "keys": renderKeys(main); break;
    case "pricing": renderPricing(main); break;
    case "docs": renderDocs(main); break;
    case "admin": renderAdmin(main); break;
    default: renderHome(main);
  }
}

// ── Home ──
function renderHome(el) {
  var userBtn = currentUser
    ? '<button class="btn btn-primary" onclick="navigate(\'dashboard\')">进入控制台 →</button>'
    : '<button class="btn btn-primary" onclick="navigate(\'register\')">免费开始 →</button>';
  el.innerHTML = '<section class="hero-section"><div class="container">' +
    '<h1>用 <em>AI</em> 的力量<br>从 <em>TokenStation</em> 开始</h1>' +
    '<p>一站式 AI API 中转服务，稳定、高速、低成本。统一接入 OpenAI、Claude 等主流模型。</p>' +
    '<div style="display:flex;gap:12px;margin-top:24px;flex-wrap:wrap">' + userBtn +
    '<button class="btn btn-secondary" onclick="navigate(\'docs\')">查看文档</button></div>' +
    '<div style="display:flex;gap:40px;margin-top:40px;flex-wrap:wrap">' +
    '<div><div style="font-size:32px;font-weight:800;letter-spacing:-1px">99.9%</div><div style="font-size:13px;color:var(--text-muted)">服务可用性</div></div>' +
    '<div><div style="font-size:32px;font-weight:800;letter-spacing:-1px">50ms</div><div style="font-size:13px;color:var(--text-muted)">平均延迟</div></div>' +
    '<div><div style="font-size:32px;font-weight:800;letter-spacing:-1px">100+</div><div style="font-size:13px;color:var(--text-muted)">接入模型</div></div>' +
    '<div><div style="font-size:32px;font-weight:800;letter-spacing:-1px">10K+</div><div style="font-size:13px;color:var(--text-muted)">活跃用户</div></div></div></div></section>' +
    '<section class="page-section" style="padding-top:20px"><div class="container">' +
    '<div style="text-align:center;margin-bottom:40px"><h2 style="font-size:28px;font-weight:800">三步接入</h2><p style="color:var(--text-secondary);margin-top:8px">只需 3 分钟即可开始</p></div>' +
    '<div class="steps"><div class="step-item"><div class="step-num">1</div><h3>注册账号</h3><p>免费注册送 1000 tokens</p></div>' +
    '<div class="step-item"><div class="step-num">2</div><h3>创建 API Key</h3><p>在控制台生成密钥</p></div>' +
    '<div class="step-item"><div class="step-num">3</div><h3>开始调用</h3><p>修改一行代码即可</p></div></div></div></section>' +
    '<section class="page-section"><div class="container">' +
    '<h2 style="font-size:28px;font-weight:800;text-align:center;margin-bottom:32px">支持的模型</h2>' +
    '<div class="grid-4">' +
    '<div class="card"><div class="card-title">GPT-3.5 Turbo</div><div class="card-desc">快速经济</div></div>' +
    '<div class="card"><div class="card-title">GPT-4</div><div class="card-desc">强大推理</div></div>' +
    '<div class="card"><div class="card-title">GPT-4 Turbo</div><div class="card-desc">最新模型</div></div>' +
    '<div class="card"><div class="card-title">GPT-4o</div><div class="card-desc">全能多模态</div></div>' +
    '<div class="card"><div class="card-title">Claude 3</div><div class="card-desc">全系列支持</div></div></div></div></section>' +
    '<footer class="footer"><div class="footer-inner"><div class="footer-links">' +
    '<a href="#" onclick="navigate(\'home\')">首页</a>' +
    '<a href="#" onclick="navigate(\'pricing\')">定价</a>' +
    '<a href="#" onclick="navigate(\'docs\')">文档</a></div>' +
    '<span class="footer-copy">© 2026 TokenStation</span></div></footer>';
}

// ── Login ──
function renderLogin(el) {
  if (currentUser) { navigate("dashboard"); return; }
  el.innerHTML = '<div class="auth-page"><div class="auth-card">' +
    '<div class="auth-title">欢迎回来</div>' +
    '<div class="auth-subtitle">登录您的 TokenStation 账户</div>' +
    '<form id="login-form">' +
    '<div class="form-group"><label>邮箱 / 用户名</label><input class="input" type="text" id="login-email" placeholder="请输入邮箱或用户名" required></div>' +
    '<div class="form-group"><label>密码</label><input class="input" type="password" id="login-password" placeholder="请输入密码" required></div>' +
    '<button type="submit" class="btn btn-primary btn-block" style="margin-top:8px">登录</button></form>' +
    '<div class="auth-footer">还没有账号？<a href="#" onclick="navigate(\'register\')">立即注册</a></div>' +
    '<div style="margin-top:16px;padding:12px;background:var(--yellow-bg);border-radius:var(--radius-sm);font-size:12px;color:var(--yellow)">' +
    '<strong>演示账号：</strong> demo / demo123 或 admin / admin123</div></div></div>';
  document.getElementById("login-form").addEventListener("submit", async function(e) {
    e.preventDefault();
    try {
      var data = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: document.getElementById("login-email").value, password: document.getElementById("login-password").value }) });
      setUser(data.user);
      toast("登录成功！");
      navigate("dashboard");
    } catch (err) { toast(err.message, "error"); }
  });
}

// ── Register ──
function renderRegister(el) {
  if (currentUser) { navigate("dashboard"); return; }
  el.innerHTML = '<div class="auth-page"><div class="auth-card">' +
    '<div class="auth-title">创建账号</div>' +
    '<div class="auth-subtitle">免费注册，即刻获得 1000 tokens</div>' +
    '<form id="register-form">' +
    '<div class="form-group"><label>用户名</label><input class="input" type="text" id="reg-username" placeholder="请输入用户名" required></div>' +
    '<div class="form-group"><label>邮箱</label><input class="input" type="email" id="reg-email" placeholder="请输入邮箱" required></div>' +
    '<div class="form-group"><label>密码</label><input class="input" type="password" id="reg-password" placeholder="至少6位密码" required minlength="6"></div>' +
    '<button type="submit" class="btn btn-primary btn-block" style="margin-top:8px">注册</button></form>' +
    '<div class="auth-footer">已有账号？<a href="#" onclick="navigate(\'login\')">立即登录</a></div></div></div>';
  document.getElementById("register-form").addEventListener("submit", async function(e) {
    e.preventDefault();
    try {
      var data = await api("/api/auth/register", { method: "POST", body: JSON.stringify({
        username: document.getElementById("reg-username").value,
        email: document.getElementById("reg-email").value,
        password: document.getElementById("reg-password").value
      })});
      setUser(data.user);
      toast("注册成功！赠送 1000 tokens");
      navigate("dashboard");
    } catch (err) { toast(err.message, "error"); }
  });
}
// ── Dashboard ──
async function renderDashboard(el) {
  if (!currentUser) { navigate("login"); return; }
  try {
    var profile = await api("/api/user/profile");
    if (profile.user) setUser(profile.user);
  } catch(e) {}
  el.innerHTML = '<div class="container" style="padding-top:32px;padding-bottom:60px">' +
    '<div class="page-header"><h1>控制台</h1><p>查看您的 API 使用情况与统计数据</p></div>' +
    '<div class="grid-4" id="stats-cards">' +
    '<div class="stat-card"><div class="stat-icon">💰</div><div class="stat-value" id="stat-tokens">-</div><div class="stat-label">可用 Tokens</div></div>' +
    '<div class="stat-card"><div class="stat-icon">📊</div><div class="stat-value" id="stat-used">-</div><div class="stat-label">已使用 Tokens</div></div>' +
    '<div class="stat-card"><div class="stat-icon">📨</div><div class="stat-value" id="stat-requests">-</div><div class="stat-label">请求次数</div></div>' +
    '<div class="stat-card"><div class="stat-icon">💵</div><div class="stat-value" id="stat-cost">-</div><div class="stat-label">总消费 (¥)</div></div></div>' +
    '<div style="margin-top:32px"><div class="card"><div class="flex-between" style="margin-bottom:16px">' +
    '<div class="card-title">近期使用记录</div><span class="text-sm text-muted">最近 20 条</span></div>' +
    '<div class="table-wrap"><table><thead><tr><th>时间</th><th>模型</th><th>Tokens</th><th>费用 (¥)</th></tr></thead>' +
    '<tbody id="usage-table"><tr><td colspan="4" class="text-center text-muted" style="padding:20px">加载中...</td></tr></tbody></table></div></div></div>' +
    '<div class="grid-2" style="margin-top:24px">' +
    '<div class="card"><div class="card-title mb-4">按日使用量</div><div id="daily-chart"><div class="text-muted text-sm">暂无数据</div></div></div>' +
    '<div class="card"><div class="card-title mb-4">按模型分布</div><div id="model-chart"><div class="text-muted text-sm">暂无数据</div></div></div></div></div>';
  loadUsageStats();
}

async function loadUsageStats() {
  try {
    var data = await api("/api/usage");
    document.getElementById("stat-tokens").textContent = Math.round(currentUser.tokens).toLocaleString();
    document.getElementById("stat-used").textContent = (data.totalTokens || 0).toLocaleString();
    document.getElementById("stat-requests").textContent = (data.totalRequests || 0).toLocaleString();
    document.getElementById("stat-cost").textContent = (data.totalCost || 0).toFixed(2);
    var tbody = document.getElementById("usage-table");
    if (data.recentLogs && data.recentLogs.length) {
      tbody.innerHTML = data.recentLogs.map(function(l) {
        return '<tr><td style="white-space:nowrap">' + (l.createdAt || "").slice(0,19).replace("T"," ") + '</td>' +
          '<td><span class="badge badge-purple">' + l.model + '</span></td>' +
          '<td>' + l.tokens + '</td>' +
          '<td>' + (l.cost || 0).toFixed(4) + '</td></tr>';
      }).join("");
    } else {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted" style="padding:20px">暂无记录</td></tr>';
    }
    var dailyEl = document.getElementById("daily-chart");
    if (data.dailyUsage && data.dailyUsage.length) {
      var maxVal = Math.max.apply(Math, data.dailyUsage.map(function(d) { return d.tokens; }));
      dailyEl.innerHTML = data.dailyUsage.slice(-14).map(function(d) {
        var pct = (d.tokens / maxVal) * 100;
        if (pct < 2) pct = 2;
        return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
          '<span style="font-size:11px;color:var(--text-muted);width:80px;flex-shrink:0">' + d.date.slice(5) + '</span>' +
          '<div style="flex:1;height:20px;background:var(--bg-secondary);border-radius:4px;overflow:hidden">' +
          '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,var(--accent),var(--accent-light));border-radius:4px"></div></div>' +
          '<span style="font-size:11px;color:var(--text-secondary);width:50px;text-align:right">' + d.tokens.toLocaleString() + '</span></div>';
      }).join("");
    }
    var modelEl = document.getElementById("model-chart");
    if (data.modelUsage && data.modelUsage.length) {
      var maxVal2 = Math.max.apply(Math, data.modelUsage.map(function(d) { return d.tokens; }));
      modelEl.innerHTML = data.modelUsage.map(function(d) {
        var pct = (d.tokens / maxVal2) * 100;
        if (pct < 2) pct = 2;
        return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
          '<span style="font-size:11px;color:var(--text-muted);width:120px;flex-shrink:0">' + d.model + '</span>' +
          '<div style="flex:1;height:20px;background:var(--bg-secondary);border-radius:4px;overflow:hidden">' +
          '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#5b5bd6,var(--accent-light));border-radius:4px"></div></div>' +
          '<span style="font-size:11px;color:var(--text-secondary);width:50px;text-align:right">' + d.tokens.toLocaleString() + '</span></div>';
      }).join("");
    }
  } catch (err) { toast("加载统计数据失败", "error"); }
}

// ── API Keys ──
async function renderKeys(el) {
  if (!currentUser) { navigate("login"); return; }
  el.innerHTML = '<div class="container" style="padding-top:32px;padding-bottom:60px">' +
    '<div class="flex-between" style="flex-wrap:wrap;gap:12px;margin-bottom:32px">' +
    '<div><h1 style="font-size:28px;font-weight:800">API 密钥</h1><p style="color:var(--text-secondary);margin-top:4px;font-size:14px">管理您的 API 访问密钥</p></div>' +
    '<button class="btn btn-primary" onclick="showCreateKeyModal()">+ 创建密钥</button></div>' +
    '<div id="keys-list"><div class="card"><div class="text-center text-muted" style="padding:20px">加载中...</div></div></div></div>' +
    '<div class="modal-overlay" id="key-modal"><div class="modal">' +
    '<button class="modal-close" onclick="closeModal(\'key-modal\')">×</button>' +
    '<div class="modal-title">创建新密钥</div>' +
    '<div class="form-group"><label>密钥名称</label><input class="input" id="key-name" placeholder="例如：生产环境" value="默认密钥"></div>' +
    '<div class="form-group"><label>绑定模型</label><select class="input" id="key-model">' +
    '<option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>' +
    '<option value="gpt-4">GPT-4</option>' +
    '<option value="gpt-4-turbo">GPT-4 Turbo</option>' +
    '<option value="gpt-4o">GPT-4o</option>' +
    '<option value="claude-3-haiku">Claude 3 Haiku</option>' +
    '<option value="claude-3-sonnet">Claude 3 Sonnet</option>' +
    '<option value="claude-3-opus">Claude 3 Opus</option></select></div>' +
    '<button class="btn btn-primary btn-block" onclick="createKey()">创建</button></div></div>';
  loadKeys();
}

async function loadKeys() {
  try {
    var data = await api("/api/keys");
    var container = document.getElementById("keys-list");
    if (!data.keys || !data.keys.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔑</div><h3>暂无 API 密钥</h3><p>创建第一个密钥开始使用</p>' +
        '<button class="btn btn-primary" style="margin-top:16px" onclick="showCreateKeyModal()">创建密钥</button></div>';
      return;
    }
    container.innerHTML = data.keys.map(function(k) {
      return '<div class="card" style="margin-bottom:12px">' +
        '<div class="flex-between" style="flex-wrap:wrap;gap:8px">' +
        '<div><div style="font-weight:600">' + k.name + '</div>' +
        '<div class="key-display" style="margin-top:8px"><span>' + k.keyPrefix + '...</span>' +
        '<button class="key-copy-btn" onclick="toast(\'完整 Key 仅创建时可见\',\'info\')">已隐藏</button></div></div>' +
        '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">' +
        '<span class="badge ' + (k.isActive ? "badge-green" : "badge-red") + '">' + (k.isActive ? "启用" : "禁用") + '</span>' +
        '<span class="text-xs text-muted">' + (k.usageCount || 0) + ' 次</span>' +
        '<button class="btn btn-danger btn-sm" onclick="deleteKey(\'' + k.id + '\')">删除</button></div></div>' +
        (k.lastUsedAt ? '<div style="margin-top:8px;font-size:12px;color:var(--text-muted)">最近: ' + new Date(k.lastUsedAt).toLocaleString() + '</div>' : '') + '</div>';
    }).join("");
  } catch (err) { toast("加载失败", "error"); }
}

function showCreateKeyModal() { document.getElementById("key-modal").classList.add("show"); }
function closeModal(id) { document.getElementById(id).classList.remove("show"); }

async function createKey() {
  try {
    var data = await api("/api/keys", { method: "POST", body: JSON.stringify({
      name: document.getElementById("key-name").value,
      model: document.getElementById("key-model").value
    })});
    toast("密钥创建成功！请妥善保管");
    closeModal("key-modal");
    loadKeys();
  } catch (err) { toast(err.message, "error"); }
}

async function deleteKey(id) {
  if (!confirm("确定要删除此密钥吗？")) return;
  try {
    await api("/api/keys/" + id, { method: "DELETE" });
    toast("密钥已删除");
    loadKeys();
  } catch (err) { toast(err.message, "error"); }
}

// ── Pricing ──
async function renderPricing(el) {
  el.innerHTML = '<div class="container" style="padding-top:40px;padding-bottom:60px">' +
    '<div style="text-align:center;margin-bottom:40px"><h1 style="font-size:36px;font-weight:800">简单透明的定价</h1>' +
    '<p style="color:var(--text-secondary);margin-top:8px">按需付费，用多少付多少</p></div>' +
    '<div class="grid-4" id="plans-grid"><div class="text-center text-muted" style="padding:40px">加载中...</div></div></div>' +
    '<footer class="footer"><div class="footer-inner"><div class="footer-links">' +
    '<a href="#" onclick="navigate(\'home\')">首页</a>' +
    '<a href="#" onclick="navigate(\'pricing\')">定价</a>' +
    '<a href="#" onclick="navigate(\'docs\')">文档</a></div>' +
    '<span class="footer-copy">© 2026 TokenStation</span></div></footer>';
  try {
    var data = await api("/api/plans");
    var grid = document.getElementById("plans-grid");
    if (data.plans) {
      grid.innerHTML = data.plans.map(function(p, i) {
        var featured = p.id === "pro" ? "featured" : "";
        var badge = p.id === "pro" ? '<div class="pricing-badge">推荐</div>' : "";
        var btn = currentUser
          ? '<button class="btn btn-primary btn-block">立即订阅</button>'
          : '<button class="btn btn-primary btn-block" onclick="navigate(\'register\')">免费开始</button>';
        return '<div class="pricing-card ' + featured + '">' + badge +
          '<div class="pricing-name">' + p.name + '</div>' +
          '<div class="pricing-price">¥' + p.price + '<span> / 月</span></div>' +
          '<div class="pricing-desc">' + p.tokens.toLocaleString() + ' tokens/月 · ' + p.rpm + ' RPM</div>' +
          '<ul class="pricing-features">' + p.features.map(function(f) { return '<li>' + f + '</li>'; }).join("") +
          '<li>' + (p.models.length > 5 ? "全部模型" : p.models.join("、")) + '</li></ul>' + btn + '</div>';
      }).join("");
    }
  } catch(e) {}
}

// ── Docs ──
function renderDocs(el) {
  var origin = window.location.origin;
  el.innerHTML = '<div class="container" style="padding-top:40px;padding-bottom:60px">' +
    '<div class="page-header"><h1>API 文档</h1><p>快速接入 TokenStation API 服务</p></div>' +
    '<div class="card mb-4"><div class="card-title">1. 获取 API Key</div><div class="card-desc">登录后进入控制台 → API 密钥 → 创建密钥</div></div>' +
    '<div class="card mb-4"><div class="card-title">2. 基础配置（Python）</div><div class="card-desc" style="margin-bottom:12px">修改 base_url 即可：</div>' +
    '<div class="code-block"><span style="color:#6a6a80"># OpenAI Python SDK</span><br>' +
    '<span style="color:#b388ff">from</span> openai <span style="color:#b388ff">import</span> OpenAI<br><br>' +
    'client = OpenAI(<br>' +
    '&nbsp;&nbsp;&nbsp;&nbsp;api_key=<span style="color:#34d399">"sk-your-key"</span>,<br>' +
    '&nbsp;&nbsp;&nbsp;&nbsp;base_url=<span style="color:#34d399">"' + origin + '/api/proxy"</span><br>' +
    ')<br><br>' +
    'response = client.chat.completions.create(<br>' +
    '&nbsp;&nbsp;&nbsp;&nbsp;model=<span style="color:#34d399">"gpt-4"</span>,<br>' +
    '&nbsp;&nbsp;&nbsp;&nbsp;messages=[{<span style="color:#34d399">"role"</span>: <span style="color:#34d399">"user"</span>, <span style="color:#34d399">"content"</span>: <span style="color:#34d399">"Hello"</span>}]<br>' +
    ')</div></div>' +
    '<div class="card mb-4"><div class="card-title">3. cURL 接入</div><div class="card-desc" style="margin-bottom:12px">直接 HTTP 调用：</div>' +
    '<div class="code-block">curl ' + origin + '/api/proxy/chat \<br>' +
    '&nbsp;&nbsp;-H <span style="color:#34d399">"Content-Type: application/json"</span> \<br>' +
    '&nbsp;&nbsp;-H <span style="color:#34d399">"Authorization: Bearer sk-your-key"</span> \<br>' +
    '&nbsp;&nbsp;-d <span style="color:#34d399">'{"model": "gpt-4", "messages": [{"role": "user", "content": "Hello"}]}'</span></div></div>' +
    '<div class="card mb-4"><div class="card-title">4. 支持端点</div><div style="margin-top:12px"><table><thead><tr><th>端点</th><th>方法</th><th>说明</th></tr></thead><tbody>' +
    '<tr><td><code>/api/proxy/chat</code></td><td><span class="badge badge-green">POST</span></td><td>聊天补全</td></tr>' +
    '<tr><td><code>/api/proxy/models</code></td><td><span class="badge badge-blue">GET</span></td><td>获取模型列表</td></tr></tbody></table></div></div>' +
    '<div class="card"><div class="card-title">5. 常见问题</div><div style="margin-top:12px">' +
    '<div style="margin-bottom:12px"><div style="font-weight:600;margin-bottom:4px">Q: 余额不足怎么办？</div><div class="text-sm text-muted">A: 选择套餐订阅或在控制台充值。</div></div>' +
    '<div style="margin-bottom:12px"><div style="font-weight:600;margin-bottom:4px">Q: 支持哪些模型？</div><div class="text-sm text-muted">A: 支持 OpenAI 全系列、Claude 3 系列。</div></div>' +
    '<div><div style="font-weight:600;margin-bottom:4px">Q: API Key 泄露？</div><div class="text-sm text-muted">A: 立即在控制台删除并重新创建。</div></div></div></div></div>' +
    '<footer class="footer"><div class="footer-inner"><div class="footer-links">' +
    '<a href="#" onclick="navigate(\'home\')">首页</a>' +
    '<a href="#" onclick="navigate(\'pricing\')">定价</a>' +
    '<a href="#" onclick="navigate(\'docs\')">文档</a></div>' +
    '<span class="footer-copy">© 2026 TokenStation</span></div></footer>';
}

// ── Admin ──
async function renderAdmin(el) {
  if (!currentUser || currentUser.role !== "admin") {
    toast("无权访问", "error");
    navigate("home");
    return;
  }
  el.innerHTML = '<div class="container" style="padding-top:32px;padding-bottom:60px">' +
    '<div class="page-header"><h1>管理后台</h1><p>系统管理与监控</p></div>' +
    '<div class="grid-4" id="admin-stats">' +
    '<div class="stat-card"><div class="stat-icon">👥</div><div class="stat-value" id="admin-users">-</div><div class="stat-label">用户总数</div></div>' +
    '<div class="stat-card"><div class="stat-icon">✅</div><div class="stat-value" id="admin-active">-</div><div class="stat-label">活跃用户</div></div>' +
    '<div class="stat-card"><div class="stat-icon">🔑</div><div class="stat-value" id="admin-keys">-</div><div class="stat-label">API 密钥数</div></div>' +
    '<div class="stat-card"><div class="stat-icon">📨</div><div class="stat-value" id="admin-requests">-</div><div class="stat-label">总请求</div></div></div>' +
    '<div class="card" style="margin-top:24px"><div class="card-title mb-4">用户管理</div>' +
    '<div class="table-wrap"><table><thead><tr><th>用户</th><th>邮箱</th><th>角色</th><th>Tokens</th><th>状态</th><th>操作</th></tr></thead>' +
    '<tbody id="admin-users-table"><tr><td colspan="6" class="text-center text-muted" style="padding:20px">加载中...</td></tr></tbody></table></div></div></div>';
  loadAdminStats();
}

async function loadAdminStats() {
  try {
    var stats = await api("/api/admin/stats");
    document.getElementById("admin-users").textContent = stats.totalUsers;
    document.getElementById("admin-active").textContent = stats.activeUsers;
    document.getElementById("admin-keys").textContent = stats.totalKeys;
    document.getElementById("admin-requests").textContent = stats.totalRequests;
    var users = await api("/api/admin/users");
    var tbody = document.getElementById("admin-users-table");
    if (users.users) {
      tbody.innerHTML = users.users.map(function(u) {
        return '<tr><td><div style="display:flex;align-items:center;gap:8px">' +
          '<div class="avatar" style="width:26px;height:26px;font-size:11px;background:linear-gradient(135deg,#7c5cbf,#5b5bd6)">' + u.username[0] + '</div>' +
          u.username + '</div></td><td>' + u.email + '</td>' +
          '<td><span class="badge ' + (u.role === "admin" ? "badge-purple" : "badge-blue") + '">' + u.role + '</span></td>' +
          '<td>' + Math.round(u.tokens).toLocaleString() + '</td>' +
          '<td><span class="badge ' + (u.status === "active" ? "badge-green" : "badge-red") + '">' + (u.status === "active" ? "正常" : "已停用") + '</span></td>' +
          '<td><button class="btn btn-sm ' + (u.status === "active" ? "btn-danger" : "btn-primary") + '" onclick="toggleUserStatus(\'' + u.id + '\')">' + (u.status === "active" ? "停用" : "启用") + '</button></td></tr>';
      }).join("");
    }
  } catch (err) { toast("加载管理数据失败", "error"); }
}

async function toggleUserStatus(userId) {
  try {
    await api("/api/admin/users/toggle-status", { method: "POST", body: JSON.stringify({ userId: userId }) });
    toast("用户状态已更新");
    loadAdminStats();
  } catch (err) { toast(err.message, "error"); }
}

// Init
initAuth();
render();
