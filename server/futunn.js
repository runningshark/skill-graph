/**
 * 富途 OpenAPI 客户端
 * 连接本地富途 OpenAPI 服务 (http://127.0.0.1:11111)
 * 
 * 富途 OpenAPI 文档: https://openapi.futunn.com/
 */

const axios = require('axios');

class FutunnClient {
  constructor(host = '127.0.0.1', port = 11111) {
    this.baseURL = `http://${host}:${port}`;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /** 检查本地 OpenAPI 服务是否在线 */
  async ping() {
    try {
      const res = await this.client.get('/');
      return { online: true, data: res.data };
    } catch {
      return { online: false, error: '无法连接到富途 OpenAPI 本地服务' };
    }
  }

  /** 获取账户信息 */
  async getAccount() {
    const res = await this.client.post('/api/v1/asset/account');
    return res.data;
  }

  /** 获取持仓 */
  async getPositions() {
    const res = await this.client.post('/api/v1/asset/position');
    return res.data;
  }

  /** 获取实时行情 */
  async getQuote(symbol) {
    const res = await this.client.post('/api/v1/quote/real_time', {
      symbol,
      market: this._detectMarket(symbol),
    });
    return res.data;
  }

  /** 下单 */
  async placeOrder({ symbol, direction, quantity, price, orderType = 'LIMIT' }) {
    const res = await this.client.post('/api/v1/trade/order', {
      symbol,
      market: this._detectMarket(symbol),
      direction,        // 'BUY' or 'SELL'
      order_type: orderType,  // 'LIMIT' or 'MARKET'
      quantity,
      price: orderType === 'LIMIT' ? price : undefined,
    });
    return res.data;
  }

  /** 市价买入 */
  async marketBuy(symbol, quantity) {
    return this.placeOrder({ symbol, direction: 'BUY', quantity, orderType: 'MARKET' });
  }

  /** 市价卖出 */
  async marketSell(symbol, quantity) {
    return this.placeOrder({ symbol, direction: 'SELL', quantity, orderType: 'MARKET' });
  }

  /** 查询未结委托 */
  async getOpenOrders() {
    const res = await this.client.post('/api/v1/trade/order/list', { status: 'OPEN' });
    return res.data;
  }

  /** 查询历史订单 */
  async getOrderHistory(beginDate, endDate) {
    const res = await this.client.post('/api/v1/trade/order/list', {
      status: 'FILLED',
      begin_date: beginDate,
      end_date: endDate,
    });
    return res.data;
  }

  /** 简单检测市场 */
  _detectMarket(symbol) {
    // 数字开头 = A股
    if (/^\d/.test(symbol)) return 'SH'  // or 'SZ'
    // 带 .HK 后缀 = 港股
    if (symbol.endsWith('.HK')) return 'HK'
    // 默认美股
    return 'US'
  }
}

module.exports = FutunnClient;
