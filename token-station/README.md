# TokenStation - AI API 中转站

一站式 AI API 中转服务，统一接入 OpenAI、Claude 等主流模型。

## 🌐 快速部署（免费）

### 方案一：Railway（推荐，最快）

1. 注册 [Railway](https://railway.app/)（GitHub 登录，免费额度 $5/月）
2. 点击 **New Project** → **Deploy from GitHub repo**
3. 上传本项目到 GitHub，连接 Railway
4. 无需任何配置，Railway 会自动检测 Node.js

### 方案二：Render

1. 注册 [Render](https://render.com/)
2. 点击 **New +** → **Web Service**
3. 连接 GitHub 仓库
4. Build Command: 留空
5. Start Command: `node server.js`
6. Free 套餐即可

### 方案三：Vercel + 后端分离

**前端部署到 Vercel（免费）：**
- `public/` 目录可以部署为静态网站

**后端部署到 Railway/Render：**
- `server.js` 作为 Node.js 服务

### 方案四：云服务器

```bash
# 安装 Node.js，然后
cd token-station
node server.js

# 推荐用 PM2 管理进程
npm install -g pm2
pm2 start server.js --name token-station
pm2 save
```

## 🔑 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 体验用户 | demo | demo123 |

## 📁 项目结构

```
token-station/
├── server.js        # 后端服务（零依赖，纯 Node.js 内置模块）
├── package.json
├── Dockerfile       # 容器化部署
├── Procfile         # Render 部署配置
├── data/            # JSON 数据库（自动生成）
├── public/          # 前端静态文件
│   ├── index.html   # 入口页面
│   ├── css/style.css
│   └── js/app.js
└── start.bat        # Windows 一键启动
```

## 🚀 本地运行

```bash
# 需要 Node.js 18+
node server.js
```

打开 http://localhost:3456

## 📡 API 接口

| 端点 | 方法 | 说明 |
|------|------|------|
| /api/auth/login | POST | 登录 |
| /api/auth/register | POST | 注册 |
| /api/user/profile | GET | 获取用户信息 |
| /api/keys | GET/POST | API 密钥管理 |
| /api/usage | GET | 使用统计 |
| /api/proxy/chat | POST | AI 聊天代理 |
| /api/admin/stats | GET | 管理统计 |
| /api/admin/users | GET | 管理用户 |
