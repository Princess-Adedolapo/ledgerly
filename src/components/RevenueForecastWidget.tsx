import { useState, useEffect } from 'react';
import { supabase, type Invoice, type Deal } from '../lib/supabase';
import { useActiveWorkspaceId } from '../lib/workspace';
import { useUserPreferences } from '../lib/userPreferences';
import { formatCurrency } from '../lib/currency';
import { convertCurrency } from '../lib/exchangeRates';
import { Card } from './ui';
import { 
  TrendingUp, 
  HelpCircle, 
  DollarSign, 
  Percent, 
  Layers, 
  TrendingDown, 
  ShieldCheck 
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function RevenueForecastWidget() {
  const workspaceId = useActiveWorkspaceId();
  const { currencyCode, currencyDisplayMode } = useUserPreferences();

  // Settings
  const [horizonDays, setHorizonDays] = useState<30 | 60 | 90>(60);
  const [forecastModel, setForecastModel] = useState<'conservative' | 'hybrid'>('hybrid');
  const [rateShift, setRateShift] = useState<number>(0); // -10% to +10% rate fluctuation simulation

  // Raw data state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  // Default deal stage probabilities/weights
  const STAGE_PROBABILITIES: Record<string, number> = {
    'New': 0.15,
    'In Progress': 0.50,
    'Won': 1.00,
    'Lost': 0.00,
  };

  useEffect(() => {
    async function loadData() {
      if (!workspaceId) {
        setLoading(false);
        return;
      }
      try {
        const [invRes, dealRes] = await Promise.all([
          supabase.from('invoices').select('*').eq('workspace_id', workspaceId),
          supabase.from('deals').select('*').eq('workspace_id', workspaceId),
        ]);
        setInvoices((invRes.data ?? []) as Invoice[]);
        setDeals((dealRes.data ?? []) as Deal[]);
      } catch (err) {
        console.error('Error fetching forecasting data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 h-96 flex flex-col justify-center items-center animate-pulse">
        <TrendingUp className="w-8 h-8 text-violet-500/50 mb-3 animate-bounce" />
        <p className="text-sm text-gray-400">Assembling forecasting models...</p>
      </div>
    );
  }

  // --- 1. Compute Exposure Breakdown ---
  const currencyTotals: Record<string, number> = { USD: 0, EUR: 0, GBP: 0, NGN: 0 };
  let grandTotalInBase = 0;

  invoices.forEach((inv) => {
    const code = inv.currency_code || 'USD';
    const amount = Number(inv.amount || 0);
    if (code in currencyTotals) {
      currencyTotals[code] += amount;
    }
    grandTotalInBase += convertCurrency(amount, code, currencyCode);
  });

  deals.forEach((deal) => {
    if (deal.stage !== 'Lost') {
      const code = 'USD'; // Deals in database default to USD
      const prob = STAGE_PROBABILITIES[deal.stage] ?? 0.5;
      const weightedValue = Number(deal.value || 0) * prob;
      currencyTotals[code] += weightedValue;
      grandTotalInBase += convertCurrency(weightedValue, code, currencyCode);
    }
  });

  const exposureBreakdown = Object.entries(currencyTotals)
    .map(([code, value]) => {
      const valueInBase = convertCurrency(value, code, currencyCode);
      const percentage = grandTotalInBase > 0 ? (valueInBase / grandTotalInBase) * 100 : 0;
      return { code, originalValue: value, baseValue: valueInBase, percentage };
    })
    .filter((item) => item.baseValue > 0)
    .sort((a, b) => b.baseValue - a.baseValue);

  // --- 2. Build Forecast Timeline Data ---
  const today = new Date();
  const timelineData = [];

  // Sort and arrange timeline
  for (let i = 0; i <= horizonDays; i += Math.max(1, Math.round(horizonDays / 15))) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    let cumulativeRevenue = 0;

    // A. Invoices
    invoices.forEach((inv) => {
      const invDate = inv.due_date ? new Date(inv.due_date) : new Date(inv.created_at);
      const diffDays = Math.ceil((invDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Include if already paid, or if due/pending within this forecast bucket
      const isFulfilled = inv.status === 'paid' || (inv.status === 'pending' && diffDays <= i);
      if (isFulfilled) {
        const invCurrency = inv.currency_code || 'USD';
        let conversionRateModifier = 1;

        // Apply simulated volatility if currency differs from preferred base currency
        if (invCurrency !== currencyCode && rateShift !== 0) {
          conversionRateModifier = 1 + (rateShift / 100);
        }

        const baseAmount = convertCurrency(Number(inv.amount), invCurrency, currencyCode) * conversionRateModifier;
        cumulativeRevenue += baseAmount;
      }
    });

    // B. Deals (Hybrid Model)
    if (forecastModel === 'hybrid') {
      deals.forEach((deal) => {
        if (deal.stage === 'Lost') return;

        // If won, assume closed immediately. If open, assume closes 30 days from creation
        const dealCreated = deal.created_at ? new Date(deal.created_at) : today;
        const dealCloseDate = deal.stage === 'Won' 
          ? dealCreated 
          : new Date(dealCreated.getTime() + 30 * 24 * 60 * 60 * 1000);

        const diffDays = Math.ceil((dealCloseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= i || deal.stage === 'Won') {
          const prob = STAGE_PROBABILITIES[deal.stage] ?? 0.5;
          const weightedValue = Number(deal.value || 0) * prob;

          let conversionRateModifier = 1;
          // Deals are modeled in USD. If workspace base differs, apply shift
          if (currencyCode !== 'USD' && rateShift !== 0) {
            conversionRateModifier = 1 + (rateShift / 100);
          }

          const baseAmount = convertCurrency(weightedValue, 'USD', currencyCode) * conversionRateModifier;
          cumulativeRevenue += baseAmount;
        }
      });
    }

    timelineData.push({
      dayLabel: dateStr,
      revenue: Math.round(cumulativeRevenue),
    });
  }

  // Current metric highlights
  const totalPaidInBase = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + convertCurrency(Number(inv.amount), inv.currency_code || 'USD', currencyCode), 0);

  const totalPendingInBase = invoices
    .filter((inv) => inv.status === 'pending')
    .reduce((sum, inv) => sum + convertCurrency(Number(inv.amount), inv.currency_code || 'USD', currencyCode), 0);

  const totalDealsInBase = deals
    .filter((d) => d.stage !== 'Lost' && d.stage !== 'Won')
    .reduce((sum, d) => sum + convertCurrency(Number(d.value || 0) * (STAGE_PROBABILITIES[d.stage] ?? 0), 'USD', currencyCode), 0);

  const finalForecast = timelineData[timelineData.length - 1]?.revenue ?? 0;

  return (
    <div className="space-y-6">
      {/* Forecast Settings Banner */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/10 dark:bg-violet-600/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Dynamic Revenue Forecast</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Consolidated analytics using multi-currency invoice streams and active deal probabilities</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Model switch */}
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-800 p-0.5 bg-gray-50 dark:bg-gray-950">
              <button
                onClick={() => setForecastModel('conservative')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${forecastModel === 'conservative' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                Invoices Only
              </button>
              <button
                onClick={() => setForecastModel('hybrid')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${forecastModel === 'hybrid' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                Pipeline Hybrid
              </button>
            </div>

            {/* Timeline switch */}
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-800 p-0.5 bg-gray-50 dark:bg-gray-950">
              {([30, 60, 90] as const).map((days) => (
                <button
                  key={days}
                  onClick={() => setHorizonDays(days)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${horizonDays === days ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  {days}D
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white/60 dark:bg-gray-900/40 backdrop-blur-md">
          <p className="text-xs text-gray-500 dark:text-gray-400">Cash Received (Paid)</p>
          <p className="text-xl md:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalPaidInBase, currencyCode, currencyDisplayMode)}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-emerald-500 mt-2">
            <ShieldCheck className="w-3 h-3" /> Zero risk finalized
          </div>
        </Card>

        <Card className="p-4 bg-white/60 dark:bg-gray-900/40 backdrop-blur-md">
          <p className="text-xs text-gray-500 dark:text-gray-400">Billed Pending (Invoices)</p>
          <p className="text-xl md:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(totalPendingInBase, currencyCode, currencyDisplayMode)}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-2">
            <DollarSign className="w-3 h-3" /> Invoiced amounts
          </div>
        </Card>

        <Card className="p-4 bg-white/60 dark:bg-gray-900/40 backdrop-blur-md">
          <p className="text-xs text-gray-500 dark:text-gray-400">Deals weighted (Pipeline)</p>
          <p className="text-xl md:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {formatCurrency(totalDealsInBase, currencyCode, currencyDisplayMode)}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-2">
            <Layers className="w-3 h-3" /> Probability discounted
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-violet-600/10 via-indigo-600/5 to-transparent border-violet-500/20">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Projected Revenue ({horizonDays}D)</p>
          <p className="text-xl md:text-2xl font-black text-violet-600 dark:text-violet-400 mt-1">
            {formatCurrency(finalForecast, currencyCode, currencyDisplayMode)}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-violet-500 dark:text-violet-400 mt-2 font-medium">
            <TrendingUp className="w-3 h-3 animate-pulse" /> Estimated total outcome
          </div>
        </Card>
      </div>

      {/* Main Graph Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart View */}
        <Card className="lg:col-span-2 p-5 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Cumulative Revenue Timeline</h3>
            <span className="text-xs bg-violet-500/10 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full font-medium">
              Base: {currencyCode}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.15)" />
                <XAxis 
                  dataKey="dayLabel" 
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tickFormatter={(v) => formatCurrency(v, currencyCode, 'symbol')}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '12px',
                    color: '#f3f4f6'
                  }}
                  formatter={(value: number | string) => [
                    formatCurrency(Number(value), currencyCode, currencyDisplayMode),
                    'Projected Cum. Revenue'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8b5cf6" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Currency Risk Exposure & Stress Test Simulator */}
        <Card className="p-5 bg-white dark:bg-gray-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Currency Exposure</h3>
              <HelpCircle className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-200" title="Proportion of cash flow in each currency" />
            </div>

            {/* Currency exposure progress bars */}
            <div className="space-y-4">
              {exposureBreakdown.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">
                  No billing currency data found. Create multi-currency invoices.
                </div>
              ) : (
                exposureBreakdown.map((item) => (
                  <div key={item.code}>
                    <div className="flex items-center justify-between text-xs font-medium mb-1">
                      <span className="text-gray-700 dark:text-gray-300">{item.code} Exposure</span>
                      <span className="text-gray-500">
                        {formatCurrency(item.originalValue, item.code, 'symbol')} ({item.percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Stress test simulator */}
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-violet-500" /> Currency Stress Simulator
              </span>
              {rateShift !== 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${rateShift > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                  {rateShift > 0 ? `+${rateShift}% Rate Shift` : `${rateShift}% Rate Shift`}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-3">Simulate local currency fluctuation impact on future global cash flow.</p>

            <input
              type="range"
              min="-15"
              max="15"
              step="1"
              value={rateShift}
              onChange={(e) => setRateShift(Number(e.target.value))}
              className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-violet-600 mb-4"
            />

            <div className="bg-gray-50 dark:bg-gray-950 p-3 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {rateShift === 0 ? (
                  <ShieldCheck className="w-5 h-5 text-gray-400" />
                ) : rateShift > 0 ? (
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-500" />
                )}
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Simulated Outcome</p>
                  <p className="text-[10px] text-gray-400">Impact on projected revenue</p>
                </div>
              </div>
              <span className={`text-sm font-bold ${rateShift === 0 ? 'text-gray-500' : rateShift > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {rateShift === 0 
                  ? 'No Shift' 
                  : `${rateShift > 0 ? '+' : ''}${formatCurrency(Math.round(finalForecast * (rateShift / 100)), currencyCode, currencyDisplayMode)}`}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
