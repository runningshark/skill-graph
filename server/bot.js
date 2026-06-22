/**
 * 自动交易引擎
 * 基于策略规则执行买卖决策，通过富途 API 下单
 */

class TradingBot {
  constructor(futunnClient) {
    this.futunn = futunnClient;
    this.state = {
      running: false,
      config: {
        symbol: 'AAPL',
        buyThreshold: 3,    // 跌超 % 则买入
        sellThreshold: 6,   // 涨超 % 则卖出
        allocPercent: 25,   // 每笔动用资金比例
        maxPosition: 0,     // 0 = 不限制
      },
      lastCheck: null,
      trades: [],
      dailyPnL: 0,
    };
  }

  getState() {
    return this.state;
  }

  updateConfig(config) {
    Object.assign(this.state.config, config);
  }

  /** 执行一次策略检查 → 判断买卖 */
  async execute() {
    const { symbol, buyThreshold, sellThreshold, allocPercent } = this.state.config;
    if (!symbol) return { action: 'skip', reason: '未设置股票代码' };

    // 1. 获取账户信息
    let account, positions, quote;
    try {
      account = await this.futunn.getAccount();
      positions = await this.futunn.getPositions();
      quote = await this.futunn.getQuote(symbol);
    } catch (err) {
      return { action: 'error', reason: `API 调用失败: ${err.message}` };
    }

    const cash = account?.cash || 0;
    const holding = (positions || []).find(p => p.symbol === symbol);
    const currentPrice = quote?.price || 0;
    const prevClose = quote?.prev_close || currentPrice;
    const changePct = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;

    this.state.lastCheck = {
      time: new Date().toISOString(),
      price: currentPrice,
      changePct,
      cash,
    };

    let result = { action: 'hold', reason: '' };

    // 2. 买入逻辑：跌幅超过阈值
    if (changePct <= -buyThreshold) {
      const allocCash = cash * (allocPercent / 100);
      const maxCost = this.state.config.maxPosition > 0
        ? Math.min(allocCash, this.state.config.maxPosition * currentPrice)
        : allocCash;
      const shares = Math.floor(maxCost / currentPrice);

      if (shares > 0 && cash > currentPrice) {
        try {
          const order = await this.futunn.marketBuy(symbol, shares);
          this.state.trades.push({
            time: new Date().toISOString(),
            action: 'BUY',
            symbol,
            price: currentPrice,
            shares,
            total: shares * currentPrice,
            orderId: order?.order_id,
          });
          result = { action: 'buy', symbol, price: currentPrice, shares, total: shares * currentPrice, changePct };
        } catch (err) {
          result = { action: 'error', reason: `买入失败: ${err.message}` };
        }
      } else {
        result = { action: 'hold', reason: '可用资金不足' };
      }
    }
    // 3. 卖出逻辑：涨幅超过阈值 且 持有该股
    else if (changePct >= sellThreshold && holding) {
      try {
        const order = await this.futunn.marketSell(symbol, holding.quantity);
        this.state.trades.push({
          time: new Date().toISOString(),
          action: 'SELL',
          symbol,
          price: currentPrice,
          shares: holding.quantity,
          total: holding.quantity * currentPrice,
          orderId: order?.order_id,
        });
        result = { action: 'sell', symbol, price: currentPrice, shares: holding.quantity, total: holding.quantity * currentPrice, changePct };
      } catch (err) {
        result = { action: 'error', reason: `卖出失败: ${err.message}` };
      }
    } else {
      result = { action: 'hold', reason: `涨跌幅 ${changePct.toFixed(2)}% 未触发条件` };
    }

    return result;
  }

  /** 连续运行模式（定时轮询） */
  startLoop(intervalMs = 60000) {
    if (this.state.running) return;
    this.state.running = true;

    const loop = async () => {
      if (!this.state.running) return;
      await this.execute();
      setTimeout(loop, intervalMs);
    };
    loop();
  }

  stopLoop() {
    this.state.running = false;
  }
}

module.exports = TradingBot;
