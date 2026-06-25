export interface MarketData {
  value: number;
  change: number;
  percentChange: number;
  trend: number[];
}

export async function fetchGoldPrice(): Promise<MarketData> {
  try {
    const res = await fetch("https://www.vang.today/api/prices?days=15");
    if (!res.ok) throw new Error("Gold API error");
    const data = await res.json();
    
    // vang.today historical API returns an object with a 'history' array
    const history = data.history;
    if (!Array.isArray(history) || history.length === 0) throw new Error("Missing historical Gold data");
    
    // Sort chronologically (oldest to newest) just in case, usually it's newest first
    const sortedData = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const trend: number[] = [];
    sortedData.forEach(day => {
      const sjc = day.prices?.VNGSJC || day.prices?.SJL1L10;
      if (sjc && sjc.sell) {
        trend.push(sjc.sell);
      }
    });

    const latestDay = history[0]; // Newest
    const latestSjc = latestDay.prices?.VNGSJC || latestDay.prices?.SJL1L10;
    if (!latestSjc) throw new Error("Missing latest SJC data");

    const value = latestSjc.sell;
    let change = latestSjc.day_change_sell || latestSjc.change_sell || 0;
    
    // If change is 0, find the last time it changed
    if (change === 0 && history.length > 1) {
      for (let i = 1; i < history.length; i++) {
        const historicalSjc = history[i].prices?.VNGSJC || history[i].prices?.SJL1L10;
        if (historicalSjc && historicalSjc.sell && historicalSjc.sell !== value) {
          change = value - historicalSjc.sell;
          break;
        }
      }
    }

    const prev = value - change;
    const percentChange = prev !== 0 ? (change / prev) * 100 : 0;

    return { value, change, percentChange, trend: trend.slice(-10) };
  } catch (error) {
    console.error("fetchGoldPrice failed", error);
    throw error;
  }
}

export async function fetchBitcoinPrice(): Promise<MarketData> {
  try {
    const [tickerRes, klinesRes] = await Promise.all([
      fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"),
      fetch("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=10")
    ]);
    
    if (!tickerRes.ok) throw new Error("Binance Ticker API error");
    if (!klinesRes.ok) throw new Error("Binance Klines API error");
    
    const tickerData = await tickerRes.json();
    const klinesData = await klinesRes.json();

    const value = parseFloat(tickerData.lastPrice);
    const change = parseFloat(tickerData.priceChange);
    const percentChange = parseFloat(tickerData.priceChangePercent);

    // klinesData is an array of arrays. Index 4 is the close price.
    const trend = klinesData.map((k: any) => parseFloat(k[4]));

    return { value, change, percentChange, trend };
  } catch (error) {
    console.error("fetchBitcoinPrice failed", error);
    throw error;
  }
}

export async function fetchVNIndex(): Promise<MarketData> {
  try {
    const to = Math.floor(Date.now() / 1000);
    const from = to - 30 * 24 * 60 * 60; // last 30 days
    const url = `https://dchart-api.vndirect.com.vn/dchart/history?resolution=1D&symbol=VNINDEX&from=${from}&to=${to}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error("DNSE API error");
    const data = await res.json();

    const closes = data.c;
    if (!closes || closes.length < 2) throw new Error("Not enough OHLC data");

    const current = closes[closes.length - 1];
    const prev = closes[closes.length - 2];
    const change = current - prev;
    const percentChange = (change / prev) * 100;

    // Use last 10 days for trend sparkline
    const trend = closes.slice(-10);

    return { value: current, change, percentChange, trend };
  } catch (error) {
    console.error("fetchVNIndex failed", error);
    throw error;
  }
}
export async function fetchDowJonesPrice(): Promise<MarketData> {
  try {
    // We use corsproxy.io to bypass Yahoo Finance CORS in the browser. 
    // ^DJI is the symbol for Dow Jones Industrial Average on Yahoo Finance.
    const url = 'https://corsproxy.io/?' + encodeURIComponent('https://query1.finance.yahoo.com/v8/finance/chart/%5EDJI?interval=1d&range=1mo');
    
    const res = await fetch(url);
    if (!res.ok) throw new Error("Yahoo Finance API error: " + res.status);
    const data = await res.json();

    const result = data.chart.result[0];
    const closes = result.indicators.quote[0].close;
    
    // Filter out nulls if any
    const validCloses = closes.filter((c: number | null) => c !== null);
    
    if (!validCloses || validCloses.length < 2) throw new Error("Not enough OHLC data");

    const current = validCloses[validCloses.length - 1];
    const prev = validCloses[validCloses.length - 2];
    const change = current - prev;
    const percentChange = (change / prev) * 100;

    const trend = validCloses.slice(-10);

    return { value: current, change, percentChange, trend };
  } catch (error) {
    console.error("fetchDowJonesPrice failed", error);
    throw error;
  }
}
