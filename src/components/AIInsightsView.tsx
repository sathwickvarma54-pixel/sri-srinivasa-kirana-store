import React, { useState, useMemo } from "react";
import { 
  Sparkles, 
  RefreshCw, 
  TrendingUp, 
  Hourglass, 
  AlertTriangle, 
  Activity, 
  HelpCircle,
  IndianRupee,
  ShoppingBag,
  TrendingDown,
  ShieldCheck
} from "lucide-react";
import { Product, Transaction } from "../types";

interface AIInsightsViewProps {
  products: Product[];
  transactions: Transaction[];
  onCallGemini: (cardType: "forecast" | "expiry" | "slow-stock" | "health-summary", payload: any) => Promise<any>;
}

export function AIInsightsView({ products, transactions, onCallGemini }: AIInsightsViewProps) {
  const todayDateStr = "2026-06-01"; // Target date

  // 1. Loading states for 4 cards individually
  const [loadingCard, setLoadingCard] = useState<{ [card: string]: boolean }>({
    forecast: false,
    expiry: false,
    slow: false,
    health: false
  });

  const [errors, setErrors] = useState<{ [card: string]: string | null }>({
    forecast: null,
    expiry: null,
    slow: null,
    health: null
  });

  // 2. Parsed response states
  const [forecastData, setForecastData] = useState<any[] | null>(null);
  const [expiryData, setExpiryData] = useState<any[] | null>(null);
  const [slowData, setSlowData] = useState<any[] | null>(null);
  const [healthData, setHealthData] = useState<{ summary: string; prioritizedAction: string } | null>(null);

  // Computed local inputs
  const salesOutward30DaysMap = useMemo(() => {
    const map: { [prodId: string]: number } = {};
    products.forEach(p => { map[p.id] = 0; });
    transactions.forEach(t => {
      if (t.type === "outward") {
        const prodId = t.productId;
        if (prodId && (prodId in map)) {
          map[prodId] += t.quantity;
        }
      }
    });
    return map;
  }, [products, transactions]);

  // Card 1 Execution
  const triggerForecastAnalysis = async () => {
    setLoadingCard(prev => ({ ...prev, forecast: true }));
    setErrors(prev => ({ ...prev, forecast: null }));
    try {
      const payload = {
        products: products.map(p => ({
          productName: p.productName,
          sku: p.sku,
          currentStock: p.currentStock,
          minStockLevel: p.minStockLevel,
          unit: p.unit
        })),
        transactions: transactions.filter(t => t.type === "outward").map(t => ({
          productName: t.productName,
          quantity: t.quantity,
          timestamp: t.timestamp
        })),
        todayDate: todayDateStr
      };

      const res = await onCallGemini("forecast", payload);
      if (res && res.forecasts) {
        setForecastData(res.forecasts);
      } else {
        throw new Error("Invalid output format from AI model");
      }
    } catch (err: any) {
      setErrors(prev => ({ ...prev, forecast: err.message || "Failed to generate report." }));
    } finally {
      setLoadingCard(prev => ({ ...prev, forecast: false }));
    }
  };

  // Card 2 Execution
  const triggerExpiryAnalysis = async () => {
    setLoadingCard(prev => ({ ...prev, expiry: true }));
    setErrors(prev => ({ ...prev, expiry: null }));
    try {
      // Send products that have expiries
      const expiringProds = products.filter(p => p.expiryDate !== null).map(p => ({
        productName: p.productName,
        expiryDate: p.expiryDate,
        currentStock: p.currentStock,
        unit: p.unit
      }));

      const payload = {
        products: expiringProds,
        todayDate: todayDateStr
      };

      const res = await onCallGemini("expiry", payload);
      if (res && res.expiryRisks) {
        setExpiryData(res.expiryRisks);
      } else {
        throw new Error("Invalid output format from AI model");
      }
    } catch (err: any) {
      setErrors(prev => ({ ...prev, expiry: err.message || "Failed to analyze expiry risk." }));
    } finally {
      setLoadingCard(prev => ({ ...prev, expiry: false }));
    }
  };

  // Card 3 Execution
  const triggerSlowStockAnalysis = async () => {
    setLoadingCard(prev => ({ ...prev, slow: true }));
    setErrors(prev => ({ ...prev, slow: null }));
    try {
      const payload = {
        products: products.map(p => ({
          id: p.id,
          productName: p.productName,
          currentStock: p.currentStock,
          purchasePrice: p.purchasePrice
        })),
        sales30Days: salesOutward30DaysMap
      };

      const res = await onCallGemini("slow-stock", payload);
      if (res && res.slowStock) {
        setSlowData(res.slowStock);
      } else {
        throw new Error("Invalid slow stock format from AI.");
      }
    } catch (err: any) {
      setErrors(prev => ({ ...prev, slow: err.message || "Failed to analyze slow items." }));
    } finally {
      setLoadingCard(prev => ({ ...prev, slow: false }));
    }
  };

  // Card 4 Execution
  const triggerHealthAnalysis = async () => {
    setLoadingCard(prev => ({ ...prev, health: true }));
    setErrors(prev => ({ ...prev, health: null }));
    try {
      const valuation = products.reduce((sum, p) => sum + (p.currentStock * p.purchasePrice), 0);
      const lowStockCount = products.filter(p => p.currentStock <= p.minStockLevel).length;
      
      const expCount = products.filter(p => {
        if (!p.expiryDate) return false;
        const diff = (new Date(p.expiryDate).getTime() - new Date(todayDateStr).getTime()) / (1000*60*60*24);
        return diff >= 0 && diff <= 30;
      }).length;

      const salesPast30DaysVal = transactions
        .filter(t => t.type === "outward")
        .reduce((sum, t) => sum + (t.quantity * t.price), 0);
        
      const salesPast7DaysVal = transactions
        .filter(t => t.type === "outward" && (new Date(todayDateStr).getTime() - new Date(t.timestamp).getTime()) <= 7*24*60*60*1000)
        .reduce((sum, t) => sum + (t.quantity * t.price), 0);

      const slowCount = Object.keys(salesOutward30DaysMap).filter(id => {
        const prod = products.find(p => p.id === id);
        if (!prod) return false;
        return salesOutward30DaysMap[id] < (prod.currentStock * 0.2); // sold less than 20%
      }).length;

      const slowLockedVal = Object.keys(salesOutward30DaysMap).reduce((sum, id) => {
        const prod = products.find(p => p.id === id);
        if (!prod) return sum;
        if (salesOutward30DaysMap[id] < (prod.currentStock * 0.2)) {
          return sum + (prod.currentStock * prod.purchasePrice);
        }
        return sum;
      }, 0);

      const summaryData = {
        totalProducts: products.length,
        totalStockValue: valuation,
        lowStockItems: lowStockCount,
        itemsExpiring30Days: expCount,
        sales7Days: salesPast7DaysVal,
        sales30Days: salesPast30DaysVal,
        topCategory: "Grocery", // simple dynamic fallback or placeholder category name
        slowDeadCount: slowCount,
        slowCapital: slowLockedVal
      };

      const res = await onCallGemini("health-summary", { summaryData });
      if (res && res.summary) {
        setHealthData({
          summary: res.summary,
          prioritizedAction: res.prioritizedAction
        });
      } else {
        throw new Error("Invalid output format from business health AI.");
      }
    } catch (err: any) {
      setErrors(prev => ({ ...prev, health: err.message || "Failed to compile business synopsis." }));
    } finally {
      setLoadingCard(prev => ({ ...prev, health: false }));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Search Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-display">AI Intelligence Assistant</h1>
          <p className="text-xs text-gray-500 font-sans">Secure, OpenRouter-powered Google Gemini LLM diagnostics parsing real-time store trends</p>
        </div>
        <div className="flex items-center gap-1 bg-[#166534]/10 text-[#166534] border border-[#166534]/20 px-3 py-1 rounded-xl text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 shrink-0 text-[#10B981]" />
          <span>Gemini OpenRouter Secured Proxy</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Demand Forecast */}
        <div className="bg-white p-5 border border-gray-150 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex gap-2.5 items-center">
              <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
                <TrendingUp className="w-5 h-5 text-[#166534]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 font-display">Demand Out-of-Stock Forecast</h3>
                <p className="text-[11px] text-gray-500 font-medium">Identify top products likely to run out within 7 days</p>
              </div>
            </div>
            <button
              onClick={triggerForecastAnalysis}
              disabled={loadingCard.forecast}
              className="px-3 py-1.5 bg-[#166534] hover:bg-[#14532D] text-white text-xs font-bold rounded-lg shadow-sm disabled:bg-gray-300 flex items-center gap-1.5 transition-colors uppercase tracking-wider"
            >
              {loadingCard.forecast ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{loadingCard.forecast ? "Analyzing..." : "Analyze"}</span>
            </button>
          </div>

          {errors.forecast && <p className="text-red-650 bg-red-50 p-2 text-[11px] rounded border border-red-100 font-bold">{errors.forecast}</p>}

          {forecastData ? (
            <div className="overflow-x-auto max-h-72 overflow-y-auto mt-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                    <th className="py-2">Product SKU</th>
                    <th className="py-2">Current</th>
                    <th className="py-2">Days Left</th>
                    <th className="py-2">Reorder Qty</th>
                    <th className="py-2">Urgency</th>
                    <th className="py-2 text-right">Reason Prognosis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-sans">
                  {forecastData.map((f, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 text-[11px] text-gray-700">
                      <td className="py-2 font-bold text-gray-900">{f.productName}</td>
                      <td className="py-2 font-mono font-semibold">{f.currentStock} pcs</td>
                      <td className="py-2 font-mono font-extrabold text-amber-600">{f.daysUntilStockOut} days</td>
                      <td className="py-2 font-mono">{f.reorderQty}</td>
                      <td className="py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          f.urgency === "HIGH" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {f.urgency}
                        </span>
                      </td>
                      <td className="py-2 text-right text-gray-400 text-[10px] italic leading-tight max-w-[150px] truncate" title={f.reason}>{f.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-gray-400 bg-gray-50 rounded-xl leading-relaxed">
              Click <b>Analyze</b> to trigger the AI's inventory sales velocity forecast.
            </div>
          )}
        </div>

        {/* Card 2: Expiry Risk */}
        <div className="bg-white p-5 border border-gray-150 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex gap-2.5 items-center">
              <div className="p-2.5 bg-orange-50 text-orange-700 rounded-xl">
                <Hourglass className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 font-display">Shelf Expiry Diagnostics</h3>
                <p className="text-[11px] text-gray-500 font-medium">Loss minimization clearing actions for soon-expiring items</p>
              </div>
            </div>
            <button
              onClick={triggerExpiryAnalysis}
              disabled={loadingCard.expiry}
              className="px-3 py-1.5 bg-[#166534] hover:bg-[#14532D] text-white text-xs font-bold rounded-lg shadow-sm disabled:bg-gray-300 flex items-center gap-1.5 transition-colors uppercase tracking-wider"
            >
              {loadingCard.expiry ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{loadingCard.expiry ? "Analyzing..." : "Analyze"}</span>
            </button>
          </div>

          {errors.expiry && <p className="text-red-650 bg-red-50 p-2 text-[11px] rounded border border-red-100 font-bold">{errors.expiry}</p>}

          {expiryData ? (
            <div className="overflow-x-auto max-h-72 overflow-y-auto mt-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                    <th className="py-2">Product Name</th>
                    <th className="py-2">Stock</th>
                    <th className="py-2">Days Left</th>
                    <th className="py-2">Action Recommendation</th>
                    <th className="py-2">Discount</th>
                    <th className="py-2 text-right">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[11px] text-gray-700 font-sans">
                  {expiryData.map((e, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-2 font-bold text-gray-955">{e.productName}</td>
                      <td className="py-2 font-mono">{e.currentStock} pcs</td>
                      <td className="py-2 font-mono text-red-655 font-bold">{e.daysLeft} days</td>
                      <td className="py-2 font-bold text-emerald-800 text-[10px] leading-tight max-w-[130px]">{e.recommendedAction}</td>
                      <td className="py-2 font-mono font-bold text-green-700 bg-green-50 px-1 py-0.5 rounded text-[10px] w-fit">{e.suggestedDiscount || "0%"}</td>
                      <td className="py-2 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          e.priority === "URGENT" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                        }`}>
                          {e.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-gray-400 bg-gray-50 rounded-xl leading-relaxed">
              Click <b>Analyze</b> to map clearance solutions for perishable products.
            </div>
          )}
        </div>

        {/* Card 3: Slow/Dead Stock Detection */}
        <div className="bg-white p-5 border border-gray-150 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex gap-2.5 items-center">
              <div className="p-2.5 bg-red-50 text-red-700 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-[#E63946]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 font-display">Dead & Slow Stock Sweeper</h3>
                <p className="text-[11px] text-gray-500 font-medium">Reconcile low-velocity capital locked in inventory</p>
              </div>
            </div>
            <button
              onClick={triggerSlowStockAnalysis}
              disabled={loadingCard.slow}
              className="px-3 py-1.5 bg-[#166534] hover:bg-[#14532D] text-white text-xs font-bold rounded-lg shadow-sm disabled:bg-gray-300 flex items-center gap-1.5 transition-colors uppercase tracking-wider"
            >
              {loadingCard.slow ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{loadingCard.slow ? "Analyzing..." : "Analyze"}</span>
            </button>
          </div>

          {errors.slow && <p className="text-red-650 bg-red-50 p-2 text-[11px] rounded border border-red-100 font-bold">{errors.slow}</p>}

          {slowData ? (
            <div className="overflow-x-auto max-h-72 overflow-y-auto mt-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                    <th className="py-2">Slow product SKU</th>
                    <th className="py-2">Stock Level</th>
                    <th className="py-2">30D Sales qty</th>
                    <th className="py-2">Capital locked</th>
                    <th className="py-2">Label type</th>
                    <th className="py-2 text-right">Clearing Strategy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[11px] text-gray-700 font-sans">
                  {slowData.map((s, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-2 font-bold text-gray-955">{s.productName}</td>
                      <td className="py-2 font-mono">{s.currentStock} pcs</td>
                      <td className="py-2 font-mono font-bold text-red-550">{s.salesLast30Days} units</td>
                      <td className="py-2 font-mono font-bold text-slate-800">₹{s.capitalLocked}</td>
                      <td className="py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          s.label === "DEAD" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"
                        }`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="py-2 text-right text-gray-400 text-[10px] leading-tight max-w-[130px] truncate" title={s.suggestedAction}>{s.suggestedAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-gray-400 bg-gray-50 rounded-xl leading-relaxed">
              Click <b>Analyze</b> to spot items locking cash flow in the backroom.
            </div>
          )}
        </div>

        {/* Card 4: Business Health Summary */}
        <div className="bg-white p-5 border border-gray-150 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex gap-2.5 items-center">
              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl">
                <Activity className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 font-display">Business Health narrative</h3>
                <p className="text-[11px] text-gray-500 font-medium">Executive B2B store efficiency summary report & prioritized action</p>
              </div>
            </div>
            <button
              onClick={triggerHealthAnalysis}
              disabled={loadingCard.health}
              className="px-3 py-1.5 bg-[#166534] hover:bg-[#14532D] text-white text-xs font-bold rounded-lg shadow-sm disabled:bg-gray-300 flex items-center gap-1.5 transition-colors uppercase tracking-wider"
            >
              {loadingCard.health ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{loadingCard.health ? "Analyzing..." : "Analyze"}</span>
            </button>
          </div>

          {errors.health && <p className="text-red-650 bg-red-50 p-2 text-[11px] rounded border border-red-100 font-bold">{errors.health}</p>}

          {healthData ? (
            <div className="space-y-4 p-3 bg-gray-50 rounded-xl border border-gray-100 mt-2">
              <p className="text-xs text-slate-700 leading-relaxed font-sans first-letter:text-2xl first-letter:font-bold first-letter:text-[#166534] first-letter:mr-1">
                {healthData.summary}
              </p>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 block font-mono">Prioritized action item this week</span>
                  <span className="text-xs font-extrabold text-slate-800 block mt-0.5 font-sans">
                    {healthData.prioritizedAction}
                  </span>
                </div>
                <IndianRupee className="w-5 h-5 text-[#166534] font-medium shrink-0" />
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-gray-400 bg-gray-50 rounded-xl leading-relaxed">
              Click <b>Analyze</b> to compile an Indian retail business health overview.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
