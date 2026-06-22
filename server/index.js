/**
 * skill-graph 自动交易后端服务
 * 
 * 启动方式:
 *   1. 确保富途 OpenAPI 本地服务已运行
 *   2. npm install
 *   3. npm start
 * 
 * 前端地址: http://localhost:3001
 * 后端 API: http://localhost:3001/api
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const FutunnClient = require('./futunn');
const TradingBot = require('./bot');

// --- Init ---
const app = express();
app.use(cors());
app.use(express.json());

const futunn = new FutunnClient(
  process.env.FUTUNN_HOST || '127.0.0.1',
  parseInt(process.env.FUTUNN_PORT || '11111')
);
const bot = new TradingBot(futunn);

// --- API Routes ---

/** 健康检查 */
app.get('/api/ping', async (req, res) => {
  const result = await futunn.ping();
  res.json(result);
});

/** 连接富途（验证 OpenAPI 服务可用） */
app.post('/api/connect', async (req, res) => {
  const { host, port } = req.body || {};
  const client = (host && port) ? new FutunnClient(host, port) : futunn;
  const result = await client.ping();
  if (result.online) {
    // 尝试获取账户信息进一步验证
    try {
      const account = await client.getAccount();
      res.json({ connected: true, account: account || null, message: '富途 OpenAPI 已连接' });
    } catch {
      res.json({ connected: true, message: 'OpenAPI 在线但账户信息获取失败（可能未登录）' });
    }
  } else {
    res.json({ connected: false, message: result.error || '连接失败' });
  }
});

/** 获取账户信息 */
app.get('/api/account', async (req, res) => {
  try {
    const account = await futunn.getAccount();
    const positions = await futunn.getPositions();
    res.json({ account, positions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 获取行情 */
app.get('/api/quote/:symbol', async (req, res) => {
  try {
    const quote = await futunn.getQuote(req.params.symbol);
    res.json(quote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 下单 */
app.post('/api/order', async (req, res) => {
  try {
    const order = await futunn.placeOrder(req.body);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 获取未结委托 */
app.get('/api/orders/open', async (req, res) => {
  try {
    const orders = await futunn.getOpenOrders();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Bot Routes ---

/** 获取 Bot 状态 */
app.get('/api/bot/state', (req, res) => {
  res.json(bot.getState());
});

/** 更新 Bot 策略配置 */
app.post('/api/bot/config', (req, res) => {
  bot.updateConfig(req.body);
  res.json({ updated: true, config: bot.getState().config });
});

/** 手动执行一次策略检查 */
app.post('/api/bot/execute', async (req, res) => {
  const result = await bot.execute();
  res.json(result);
});

/** 启动自动循环 */
app.post('/api/bot/start', (req, res) => {
  const interval = req.body?.interval || 60000;
  bot.startLoop(interval);
  res.json({ running: true, interval });
});

/** 停止自动循环 */
app.post('/api/bot/stop', (req, res) => {
  bot.stopLoop();
  res.json({ running: false });
});

// --- Serve Frontend ---
app.use(express.static('..'));

// --- Start ---
const PORT = parseInt(process.env.SERVER_PORT || '3001');
app.listen(PORT, () => {
  console.log(`\n  🚀 自动交易服务已启动`);
  console.log(`  📡 前端页面: http://localhost:${PORT}/index.html`);
  console.log(`  🔌 API 地址: http://localhost:${PORT}/api`);
  console.log(`  ⚡ 富途 OpenAPI: ${futunn.baseURL}\n`);
});
