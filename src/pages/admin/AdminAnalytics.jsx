import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';

const API_BASE_URL = 'https://m3hoptm1hi.execute-api.us-east-1.amazonaws.com/prod';

const AdminAnalytics = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [insight, setInsight] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`${API_BASE_URL}/admin/orders`);
        if (!res.ok) throw new Error('Failed to load orders for analytics');
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message || 'Failed to load analytics');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const o of orders) {
      const day = new Date(o.createdAt || o.updatedAt || Date.now());
      const key = new Date(day.getFullYear(), day.getMonth(), day.getDate()).toISOString();
      const amt = Number(o.total || 0);
      map.set(key, (map.get(key) || 0) + (Number.isFinite(amt) ? amt : 0));
    }
    return Array.from(map.entries())
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([date, revenue]) => ({ date, revenue }));
  }, [orders]);

  const kpis = useMemo(() => {
    if (orders.length === 0) {
      return { revenue30: 0, prevRevenue30: 0, aov: 0, count: 0 };
    }
    const now = Date.now();
    const d30 = 30 * 24 * 60 * 60 * 1000;
    const last30 = orders.filter(o => now - new Date(o.createdAt || o.updatedAt).getTime() <= d30);
    const prev30 = orders.filter(o => {
      const t = new Date(o.createdAt || o.updatedAt).getTime();
      return now - t > d30 && now - t <= 2 * d30;
    });
    const revenue30 = last30.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const prevRevenue30 = prev30.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const aov = orders.length ? (orders.reduce((s, o) => s + (Number(o.total) || 0), 0) / orders.length) : 0;
    return { revenue30, prevRevenue30, aov, count: orders.length };
  }, [orders]);

  const topProducts = useMemo(() => {
    const map = new Map();
    for (const o of orders) {
      for (const it of o.items || []) {
        const key = it.productId || it.name || 'Unknown';
        const amount = (Number(it.price) || 0) * (Number(it.quantity) || 0);
        const prev = map.get(key) || { name: it.name || key, qty: 0, revenue: 0 };
        prev.qty += Number(it.quantity) || 0;
        prev.revenue += amount;
        map.set(key, prev);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [orders]);

  const forecast = useMemo(() => {
    if (byDay.length === 0) return [];
    // 7-day moving average forecast for next 7 days
    const window = 7;
    const vals = byDay.map(d => d.revenue);
    const avg = (arr) => arr.reduce((s, v) => s + v, 0) / (arr.length || 1);
    const lastAvg = avg(vals.slice(-window));
    const lastDate = new Date(byDay[byDay.length - 1].date);
    const out = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + i);
      out.push({ date: d.toISOString(), revenue: Math.round(lastAvg) });
    }
    return out;
  }, [byDay]);

  const anomalies = useMemo(() => {
    if (byDay.length < 10) return [];
    const vals = byDay.map(d => d.revenue);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length;
    const stdev = Math.sqrt(variance);
    const threshold = 2 * stdev;
    return byDay.filter(d => Math.abs(d.revenue - mean) > threshold).slice(-5);
  }, [byDay]);

  const rfm = useMemo(() => {
    // Basic RFM: group by userId
    const map = new Map();
    for (const o of orders) {
      const uid = o.userId || 'unknown';
      const recency = new Date(o.createdAt || o.updatedAt).getTime();
      const freq = 1;
      const monetary = Number(o.total) || 0;
      const current = map.get(uid) || { userId: uid, last: 0, freq: 0, amount: 0 };
      current.last = Math.max(current.last, recency);
      current.freq += freq;
      current.amount += monetary;
      map.set(uid, current);
    }
    const arr = Array.from(map.values());
    // Score 1-5 by quantiles
    const score = (v, arr, key, asc = true) => {
      const sorted = [...arr].sort((a, b) => asc ? a[key] - b[key] : b[key] - a[key]);
      const idx = sorted.findIndex(x => x[key] === v);
      const q = Math.ceil(((idx + 1) / sorted.length) * 5);
      return Math.min(Math.max(q, 1), 5);
    };
    return arr
      .map(x => ({
        ...x,
        recencyScore: score(x.last, arr, 'last', false),
        frequencyScore: score(x.freq, arr, 'freq', true),
        monetaryScore: score(x.amount, arr, 'amount', true)
      }))
      .sort((a, b) => (b.recencyScore + b.frequencyScore + b.monetaryScore) - (a.recencyScore + a.frequencyScore + a.monetaryScore))
      .slice(0, 5);
  }, [orders]);

  const generateInsight = () => {
    const growth = kpis.prevRevenue30 ? ((kpis.revenue30 - kpis.prevRevenue30) / kpis.prevRevenue30) * 100 : 0;
    const top = topProducts[0];
    const anomalyText = anomalies.length ? `There ${anomalies.length === 1 ? 'is 1 anomaly' : `are ${anomalies.length} anomalies`} in daily revenue.` : 'No significant anomalies detected.';
    setInsight(
      `In the last 30 days, revenue is ₹${Math.round(kpis.revenue30).toLocaleString()} (${growth.toFixed(1)}% vs previous 30 days). ` +
      `Average order value is ₹${Math.round(kpis.aov).toLocaleString()}. ` +
      (top ? `Top product: ${top.name} (₹${Math.round(top.revenue).toLocaleString()}). ` : '') +
      anomalyText
    );
  };

  const Sparkline = ({ points, color = '#3B82F6' }) => {
    if (!points || points.length === 0) return null;
    const width = 200;
    const height = 50;
    const xs = points.map((_, i) => i);
    const ys = points;
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const scaleX = (i) => (i / (xs.length - 1 || 1)) * width;
    const scaleY = (v) => height - ((v - minY) / (maxY - minY || 1)) * height;
    const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(ys[i])}`).join(' ');
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <path d={d} fill="none" stroke={color} strokeWidth="2" />
      </svg>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Analytics</h2>
            <p className="text-gray-600">Insights, forecasts, and anomalies from your real orders</p>
          </div>
          <button onClick={generateInsight} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium">
            Generate AI Insight
          </button>
        </div>

        {error && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs text-gray-500">Revenue (30d)</p>
            <p className="text-2xl font-bold">₹{Math.round(kpis.revenue30).toLocaleString()}</p>
            <div className="mt-2"><Sparkline points={byDay.slice(-30).map(d => d.revenue)} /></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs text-gray-500">Avg Order Value</p>
            <p className="text-2xl font-bold">₹{Math.round(kpis.aov).toLocaleString()}</p>
            <div className="mt-2 text-xs text-gray-500">Orders: {kpis.count}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs text-gray-500">Growth vs prev 30d</p>
            <p className={`text-2xl font-bold ${kpis.prevRevenue30 ? (kpis.revenue30 - kpis.prevRevenue30) >= 0 ? 'text-green-600' : 'text-red-600' : 'text-gray-800'}`}>
              {kpis.prevRevenue30 ? `${(((kpis.revenue30 - kpis.prevRevenue30) / kpis.prevRevenue30) * 100).toFixed(1)}%` : 'N/A'}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs text-gray-500">Forecast (next 7d)</p>
            <p className="text-2xl font-bold">₹{forecast.length ? Math.round(forecast.reduce((s, d) => s + d.revenue, 0)).toLocaleString() : 0}</p>
          </div>
        </div>

        {/* AI Insight */}
        {insight && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-xl p-4">
            <div className="text-sm text-gray-800">
              <span className="font-semibold">AI Insight: </span>{insight}
            </div>
          </div>
        )}

        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Top Products</h3></div>
          <div className="p-4">
            {topProducts.length === 0 ? (
              <div className="text-sm text-gray-500">No product data</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {topProducts.map((p) => (
                  <div key={p.name} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-500">Qty: {p.qty}</div>
                      </div>
                      <div className="text-right font-semibold">₹{Math.round(p.revenue).toLocaleString()}</div>
                    </div>
                    <div className="mt-2 h-2 bg-gray-100 rounded">
                      <div className="h-2 bg-blue-500 rounded" style={{ width: `${Math.min(100, (p.revenue / (topProducts[0]?.revenue || 1)) * 100)}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Forecast Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">7-Day Revenue Forecast</h3></div>
          <div className="p-4">
            {forecast.length === 0 ? (
              <div className="text-sm text-gray-500">Not enough data to forecast</div>
            ) : (
              <div className="flex items-end space-x-2 h-40">
                {forecast.map(f => (
                  <div key={f.date} className="flex-1">
                    <div className="bg-green-500 rounded-t" style={{ height: `${Math.max(6, (f.revenue / (forecast[0].revenue || 1)) * 100)}%` }}></div>
                    <div className="text-[10px] text-gray-500 mt-1 text-center">{new Date(f.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Anomalies */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Anomaly Detection</h3></div>
          <div className="p-4">
            {anomalies.length === 0 ? (
              <div className="text-sm text-gray-500">No significant anomalies detected.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {anomalies.map(a => (
                  <div key={a.date} className="border border-red-200 bg-red-50 rounded p-3">
                    <div className="text-sm font-semibold text-red-700">{new Date(a.date).toLocaleDateString()}</div>
                    <div className="text-sm text-red-800">Revenue: ₹{Math.round(a.revenue).toLocaleString()}</div>
                    <div className="text-xs text-red-600 mt-1">Action: review campaigns, pricing, or stock events for this day.</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RFM Segments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Top Customers (RFM)</h3></div>
          <div className="p-4">
            {rfm.length === 0 ? (
              <div className="text-sm text-gray-500">Not enough data to segment customers.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Order</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spent</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">R / F / M</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rfm.map(c => (
                      <tr key={c.userId} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">{c.userId}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{new Date(c.last).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{c.freq}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">₹{Math.round(c.amount).toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{c.recencyScore} / {c.frequencyScore} / {c.monetaryScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="text-center text-gray-500">Loading analytics...</div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
