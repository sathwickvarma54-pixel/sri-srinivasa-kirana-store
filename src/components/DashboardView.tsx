import React, { useMemo, useState, useEffect, useRef } from "react";
import { 
  Package, 
  IndianRupee, 
  AlertTriangle, 
  Hourglass, 
  ShoppingCart, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft,
  RefreshCw,
  TrendingDown
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { Product, Transaction } from "../types";

// Hook removed temporarily

interface DashboardViewProps {
  products: Product[];
  transactions: Transaction[];
  onTriggerQuickRestock: (productId: string) => Promise<void>;
  role: "owner" | "manager" | "staff";
}

const CATEGORY_COLORS = {
  Grocery: "#166534",
  Dairy: "#10B981",
  Beverage: "#F4A261",
  FMCG: "#E63946",
  Stationery: "#9C27B0",
  Snacks: "#F59E0B",
  Other: "#718096"
};

export function DashboardView({ products, transactions, onTriggerQuickRestock, role }: DashboardViewProps) {
  const todayStr = "2026-06-01"; // Consistent prototype target date

  // 1. STATS METRICS COMPILATION
  const statMetrics = useMemo(() => {
    const totalCount = products.length;
    
    // Valuation
    const totalValuation = products.reduce((sum, p) => sum + (p.currentStock * p.purchasePrice), 0);
    
    // Low Stock
    const lowStockItems = products.filter(p => p.currentStock <= p.minStockLevel);
    
    // Expiries (within 30 days)
    const todayNum = new Date(todayStr).getTime();
    const expiriesSoon = products.filter(p => {
      if (!p.expiryDate) return false;
      const expNum = new Date(p.expiryDate).getTime();
      const diffDays = (expNum - todayNum) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 30;
    });

    // Today's Sales Value and Transaction counts (Outward on 2026-06-01)
    const todayTransactions = transactions.filter(t => t.timestamp.startsWith(todayStr));
    const todaySalesVal = todayTransactions
      .filter(t => t.type === "outward")
      .reduce((sum, t) => sum + (t.quantity * t.price), 0);
      
    const todaySalesQty = todayTransactions.filter(t => t.type === "outward").length;

    return {
      totalCount,
      totalValuation,
      lowStockCount: lowStockItems.length,
      expiringCount: expiriesSoon.length,
      todaySalesVal,
      todayTxCount: todayTransactions.length,
      lowStockItems: lowStockItems.slice(0, 5),
      expiringItems: expiriesSoon.map(p => {
        const expNum = new Date(p.expiryDate!).getTime();
        const diffDays = Math.ceil((expNum - todayNum) / (1000 * 60 * 60 * 24));
        return { ...p, daysLeft: diffDays };
      }).sort((a,b) => a.daysLeft - b.daysLeft).slice(0, 5)
    };
  }, [products, transactions]);

  // 2. CHART Aggregations
  // A. Last 7 Days Daily Sales Value (Line Chart)
  const lineChartData = useMemo(() => {
    const daysData: { [date: string]: number } = {};
    // Seed last 7 days from 2026-05-26 to 2026-06-01
    for (let i = 6; i >= 0; i--) {
      const d = new Date(new Date(todayStr).getTime() - i * 24 * 60 * 60 * 1000);
      const iso = d.toISOString().split("T")[0];
      daysData[iso] = 0;
    }

    transactions.forEach(t => {
      const date = t.timestamp.split("T")[0];
      if (t.type === "outward" && date in daysData) {
        daysData[date] += t.quantity * t.price;
      }
    });

    return Object.keys(daysData).sort().map(date => ({
      date: new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      "Sales (₹)": Math.round(daysData[date])
    }));
  }, [transactions]);

  // B. Category Stats (Bar & Pie Charts)
  const categoryChartData = useMemo(() => {
    const counts: { [cat: string]: { qty: number; value: number; count: number } } = {};
    const categoriesList = ["Grocery", "Dairy", "Beverage", "FMCG", "Stationery", "Snacks", "Other"];
    
    categoriesList.forEach(cat => {
      counts[cat] = { qty: 0, value: 0, count: 0 };
    });

    products.forEach(p => {
      const cat = p.category;
      if (counts[cat]) {
        counts[cat].qty += p.currentStock;
        counts[cat].value += p.currentStock * p.sellingPrice;
        counts[cat].count += 1;
      }
    });

    const barData = Object.keys(counts).map(cat => ({
      name: cat,
      "Stock Level": counts[cat].qty,
      "Valuation (₹)": Math.round(counts[cat].value)
    }));

    const pieData = Object.keys(counts)
      .map(cat => ({
        name: cat,
        value: counts[cat].count
      }))
      .filter(item => item.value > 0);

    return { barData, pieData };
  }, [products]);

  // Activity feed
  const recentFeed = useMemo(() => {
    return transactions.slice(0, 10);
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-display">
            Sri Venkateswara Kirana Dashboard
          </h1>
          <p className="text-xs text-gray-500">
            Real-time operations monitor • Today is <span className="font-mono font-bold text-gray-700">1st Jun 2026</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl">
          <TrendingUp className="w-4 h-4 text-[#10B981]" />
          <span>Active Real-time Syncing</span>
        </div>
      </div>

      {/* Grid: Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Card 1 */}
        <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Products</span>
            <Package className="w-5 h-5 text-[#166534]" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-gray-900 font-mono">{statMetrics.totalCount}</span>
            <span className="text-[10px] text-gray-500 block">Catalog items</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Stock Valuation</span>
            <IndianRupee className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-gray-900 font-mono">₹{statMetrics.totalValuation.toLocaleString("en-IN")}</span>
            <span className="text-[10px] text-gray-500 block">Capital assets (Purchase)</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className={`p-4 border shadow-sm rounded-2xl flex flex-col justify-between ${statMetrics.lowStockCount > 5 ? "bg-red-50 border-red-100 text-red-950" : "bg-white border-gray-100"}`}>
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Low Stock</span>
            <AlertTriangle className={`w-5 h-5 ${statMetrics.lowStockCount > 5 ? "text-red-500" : "text-amber-500"}`} />
          </div>
          <div className="mt-2">
            <span className={`text-2xl font-bold font-mono ${statMetrics.lowStockCount > 5 ? "text-red-650" : "text-gray-900"}`}>{statMetrics.lowStockCount}</span>
            <span className="text-[10px] text-gray-500 block">Items near depleted</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Expiry Alert</span>
            <Hourglass className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-gray-900 font-mono">{statMetrics.expiringCount}</span>
            <span className="text-[10px] text-gray-500 block">Required clear in 30d</span>
          </div>
        </div>

        {/* Card 5 */}
        <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Today's Sales</span>
            <ShoppingCart className="w-5 h-5 text-[#166534]" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-[#166534] font-mono">₹{statMetrics.todaySalesVal.toLocaleString("en-IN")}</span>
            <span className="text-[10px] text-gray-500 block">Sales Revenue today</span>
          </div>
        </div>

        {/* Card 6 */}
        <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Today's Bills</span>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-gray-900 font-mono">{statMetrics.todayTxCount}</span>
            <span className="text-[10px] text-gray-500 block">Active counters ticked</span>
          </div>
        </div>
      </div>

      {/* Grid: Charts (Only shown for Owner and Manager) */}
      {(role === "owner" || role === "manager") ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: Sales Growth */}
          <div className="lg:col-span-2 bg-white p-5 border border-gray-100 shadow-sm rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#166534] uppercase tracking-wider font-display">Sales Performance</h3>
                <p className="text-xs text-gray-500">Gross billing metrics of outward transactions (7 Days)</p>
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            {transactions.filter(t => t.type === "outward").length === 0 ? (
              <div className="h-[300px] w-full flex items-center justify-center border border-dashed rounded-2xl bg-gray-50 text-gray-400 text-xs">
                No data available yet
              </div>
            ) : (
              <div className="h-[300px] w-full" style={{ minHeight: "300px" }}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => [`₹${value}`, "Sales"]} />
                    <Line type="monotone" dataKey="Sales (₹)" stroke="#166534" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 3: Category Donut Distribution */}
          <div className="bg-white p-5 border border-gray-100 shadow-sm rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#166534] uppercase tracking-wider mb-1 font-display">Catalog Breadth</h3>
              <p className="text-xs text-gray-500">Number of products registered per category</p>
            </div>
            {categoryChartData.pieData.length === 0 ? (
              <div className="h-[300px] w-full flex items-center justify-center border border-dashed rounded-2xl bg-gray-50 text-gray-400 text-xs">
                No data available yet
              </div>
            ) : (
              <>
                <div className="h-[300px] w-full" style={{ minHeight: "300px" }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryChartData.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                        nameKey="name"
                        isAnimationActive={false}
                      >
                        {categoryChartData.pieData.map((entry, index) => {
                          const color = CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS] || "#718096";
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Pie>
                      <Tooltip formatter={(value) => [value, "Products"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[10px] text-gray-600 font-medium mt-4">
                  {categoryChartData.pieData.slice(0, 6).map((item, index) => {
                    const color = CATEGORY_COLORS[item.name as keyof typeof CATEGORY_COLORS] || "#718096";
                    return (
                      <div key={item.name} className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="truncate">{item.name}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 p-4 text-[#166534] rounded-xl flex items-center justify-between border border-emerald-200 text-xs">
          <span><b>Staff Portal View Active:</b> Visual executive analytics graphs have been disabled for security permissions. Contact store owner for full portal access.</span>
        </div>
      )}

      {/* Section: Operational Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Table 1: Critical Depleting Stocks */}
        <div className="bg-white p-5 border border-gray-100 shadow-sm rounded-2xl xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#166534] uppercase tracking-wider font-display">Low Stock Reordering</h3>
              <p className="text-xs text-gray-500">Products near or below minimum stock parameters</p>
            </div>
            <span className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-xl font-bold border border-red-100 font-mono">
              {statMetrics.lowStockCount} critical
            </span>
          </div>

          {products.length === 0 ? (
            <div className="py-6 text-center text-gray-500 text-xs">
              No products available
            </div>
          ) : statMetrics.lowStockItems.length === 0 ? (
            <div className="py-6 text-center text-gray-500 text-xs">
              🎉 No products are critically low on stock! Excellent job.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2">Product</th>
                    <th className="py-2">Category</th>
                    <th className="py-2">Current Stock</th>
                    <th className="py-2">Safety Level</th>
                    <th className="py-2 text-right">Instant Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {statMetrics.lowStockItems.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 font-semibold text-gray-800">
                        {p.productName} <span className="text-[10px] text-gray-400 block font-normal">{p.localName}</span>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] text-white font-semibold" style={{ backgroundColor: CATEGORY_COLORS[p.category as keyof typeof CATEGORY_COLORS] }}>
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 font-mono font-bold text-red-655 text-sm">{p.currentStock} {p.unit}</td>
                      <td className="py-3 font-mono text-gray-400 text-[11px]">{p.minStockLevel} {p.unit}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => onTriggerQuickRestock(p.id)}
                          className="px-3 py-1.5 bg-[#166534] hover:bg-[#14532D] text-white text-[11px] font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1 ml-auto"
                        >
                          <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
                          <span>Quick Restock (+50)</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Table 2: Expiry Risk */}
        <div className="bg-white p-5 border border-gray-100 shadow-sm rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#166534] uppercase tracking-wider font-display">Expiring Soon</h3>
              <p className="text-xs text-gray-500">Products requiring prompt clearance</p>
            </div>
            <Hourglass className="w-4 h-4 text-[#F59E0B]" />
          </div>

          {products.length === 0 ? (
            <div className="py-6 text-center text-gray-500 text-xs">
              No products available
            </div>
          ) : statMetrics.expiringItems.length === 0 ? (
            <div className="py-6 text-center text-gray-500 text-xs">
              🟢 No items are expiring within 30 days. Perfect shelf health!
            </div>
          ) : (
            <div className="space-y-3">
              {statMetrics.expiringItems.map(item => {
                const isCritical = item.daysLeft < 7;
                return (
                  <div key={item.id} className={`p-3 rounded-xl border flex items-center justify-between ${isCritical ? "bg-red-50 border-red-100" : "bg-orange-50 border-orange-100"}`}>
                    <div>
                      <h4 className="text-xs font-bold text-gray-800">{item.productName}</h4>
                      <p className="text-[10px] text-gray-500">Expiry date: <span className="font-mono font-bold text-[#4A5568]">{item.expiryDate}</span></p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-lg font-mono font-extrabold ${isCritical ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                        {item.daysLeft} {item.daysLeft === 1 ? "day" : "days"} left
                      </span>
                      <span className="block mt-1 font-mono text-[10px] font-bold text-gray-500">Stock: {item.currentStock}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Ledger Logs Transaction Activity feed */}
      <div className="bg-white p-5 border border-gray-100 shadow-sm rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#166534] uppercase tracking-wider font-display">Recent Counter Transactions</h3>
            <p className="text-xs text-gray-500">Last 10 inventory edits, sales, and replenishments</p>
          </div>
          <Hourglass className="w-4 h-4 text-emerald-500" />
        </div>

        {transactions.length === 0 ? (
          <div className="py-6 text-center text-gray-500 text-xs">
            No sales records found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2">Date / Time</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Product</th>
                  <th className="py-2 text-right">Quantity</th>
                  <th className="py-2 text-right">Rate</th>
                  <th className="py-2 text-right">Aggregate</th>
                  <th className="py-2 text-right">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentFeed.map(t => {
                  const aggregate = t.quantity * t.price;
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors font-mono">
                      <td className="py-2.5 text-gray-500 text-[11px]">
                        {new Date(t.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} • {new Date(t.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-sans font-bold uppercase tracking-wider ${
                          t.type === "inward" ? "bg-amber-100 text-amber-800" :
                          t.type === "outward" ? "bg-emerald-100 text-emerald-800" :
                          t.type === "damage" ? "bg-red-100 text-red-850" : "bg-gray-100 text-gray-700"
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="py-2.5 font-sans font-semibold text-gray-800">
                        {t.productName}
                      </td>
                      <td className="py-2.5 text-right font-bold text-gray-800">
                        {t.type === "outward" || t.type === "damage" ? "-" : "+"}{t.quantity}
                      </td>
                      <td className="py-2.5 text-right text-gray-500">₹{t.price}</td>
                      <td className="py-2.5 text-right text-slate-800 font-bold">₹{aggregate.toLocaleString("en-IN")}</td>
                      <td className="py-2.5 text-right text-gray-400 font-sans">{t.staffName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
