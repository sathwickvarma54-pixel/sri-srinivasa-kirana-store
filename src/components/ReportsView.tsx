import React, { useState, useMemo } from "react";
import { 
  FileSpreadsheet, 
  FileText, 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Hourglass, 
  ChevronRight,
  TrendingDown,
  Percent,
  Calculator
} from "lucide-react";
import { Product, Transaction } from "../types";
import { exportToExcel, exportToPDF } from "../utils/export";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

interface ReportsViewProps {
  products: Product[];
  transactions: Transaction[];
}

export function ReportsView({ products, transactions }: ReportsViewProps) {
  const [activeTab, setActiveTab] = useState<"valuation" | "sales" | "expiry" | "category">("valuation");
  const [salesDaysLimit, setSalesDaysLimit] = useState(7);

  const todayStr = "2026-06-01"; // consistent target

  // A. CALCULATE VALUATION DATA
  const valuationReport = useMemo(() => {
    let grandCost = 0;
    let grandRevenue = 0;
    
    const rows = products.map((p, idx) => {
      const lineCost = p.currentStock * p.purchasePrice;
      const lineRev = p.currentStock * p.sellingPrice;
      const profitMargin = p.sellingPrice > 0 ? ((p.sellingPrice - p.purchasePrice) / p.sellingPrice) * 100 : 0;
      
      grandCost += lineCost;
      grandRevenue += lineRev;

      return {
        ...p,
        lineCost,
        lineRev,
        profitMargin: Math.round(profitMargin)
      };
    });

    return {
      rows,
      grandCost,
      grandRevenue,
      potentialProfit: grandRevenue - grandCost
    };
  }, [products]);

  // VALUATION EXPORT HANDLERS
  const exportValuanExcel = () => {
    const headers = ["SKU Code", "Product Name", "Category", "Shelf Qty", "Purchase rate (₹)", "Selling rate (₹)", "Aggregate Asset Cost (₹)", "Profit Margin (%)"];
    const rows = valuationReport.rows.map(r => [
      r.sku,
      r.productName,
      r.category,
      r.currentStock,
      r.purchasePrice,
      r.sellingPrice,
      r.lineCost,
      `${r.profitMargin}%`
    ]);
    exportToExcel("Stock_Valuation_Report", headers, rows);
  };

  const exportValuanPDF = () => {
    const headers = ["SKU", "Product", "Category", "Stock", "Purchase Rate", "Asset Cost"];
    const rows = valuationReport.rows.map(r => [
      r.sku,
      r.productName,
      r.category,
      `${r.currentStock} ${r.unit}`,
      `Rs. ${r.purchasePrice}`,
      `Rs. ${r.lineCost.toLocaleString("en-IN")}`
    ]);
    const totalRow = ["GRAND TOTALS", "", "", `${products.reduce((sum, p) => sum + p.currentStock, 0)} items`, "", `Rs. ${valuationReport.grandCost.toLocaleString("en-IN")}`];

    exportToPDF("Stock Valuation Assets Report", headers, rows, totalRow);
  };

  // B. CALCULATE SALES DATA
  const salesReportData = useMemo(() => {
    // Generate date array
    const dateMap: { [date: string]: number } = {};
    for (let i = salesDaysLimit - 1; i >= 0; i--) {
      const d = new Date(new Date(todayStr).getTime() - i * 24 * 60 * 60 * 1000);
      const iso = d.toISOString().split("T")[0];
      dateMap[iso] = 0;
    }

    transactions.forEach(t => {
      const date = t.timestamp.split("T")[0];
      if (t.type === "outward" && date in dateMap) {
        dateMap[date] += t.quantity * t.price;
      }
    });

    const list = Object.keys(dateMap).sort().map(date => {
      const txs = transactions.filter(t => t.type === "outward" && t.timestamp.startsWith(date));
      return {
        date,
        formattedDate: new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        "Sales (₹)": dateMap[date],
        transactionCount: txs.length
      };
    });

    const totalVolume = list.reduce((sum, item) => sum + item["Sales (₹)"], 0);
    return { list, totalVolume };
  }, [transactions, salesDaysLimit]);

  const exportSalesExcel = () => {
    const headers = ["Date", "Sales Volume (₹)", "Successful Invoices Bill Count"];
    const rows = salesReportData.list.map(s => [s.date, s["Sales (₹)"], s.transactionCount]);
    exportToExcel(`Sales_Performance_${salesDaysLimit}Days_Report`, headers, rows);
  };

  const exportSalesPDF = () => {
    const headers = ["Date ID", "Gross Sales Val (Rs.)", "Billing Invoice ticks"];
    const rows = salesReportData.list.map(s => [
      s.formattedDate,
      `Rs. ${s["Sales (₹)"].toLocaleString("en-IN")}`,
      s.transactionCount.toString()
    ]);
    const totalRow = ["SUM TOTALS", `Rs. ${salesReportData.totalVolume.toLocaleString("en-IN")}`, salesReportData.list.reduce((sum, s) => sum + s.transactionCount, 0).toString()];

    exportToPDF(`${salesDaysLimit} Days Counter Sales Velocity`, headers, rows, totalRow);
  };

  // C. PERISHABLE EXPIRY RISK TIMELINE
  const expiryReportData = useMemo(() => {
    const list = products
      .filter(p => p.expiryDate !== null)
      .map(p => {
        const diffDays = Math.ceil((new Date(p.expiryDate!).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24));
        return {
          ...p,
          daysLeft: diffDays
        };
      })
      .filter(p => p.daysLeft <= 45) // limit to those expiring next 45 days
      .sort((a,b) => a.daysLeft - b.daysLeft);

    return list;
  }, [products]);

  const exportExpiryExcel = () => {
    const headers = ["SKU", "Product Name", "Category", "Current Stock", "Expiry date", "Remaining days left"];
    const rows = expiryReportData.map(e => [e.sku, e.productName, e.category, e.currentStock, e.expiryDate, e.daysLeft]);
    exportToExcel("Shelf_Expiry_Timeline_Report", headers, rows);
  };

  const exportExpiryPDF = () => {
    const headers = ["SKU", "Product Name", "Shelf Quant", "Expiry date", "Days remaining"];
    const rows = expiryReportData.map(e => [
      e.sku,
      e.productName,
      `${e.currentStock} ${e.unit}`,
      e.expiryDate!,
      `${e.daysLeft} days`
    ]);
    exportToPDF("30-45 Days Shelf Expiry Clearance Audit", headers, rows);
  };

  // D. CATEGORY MARGINS ANALYTICS
  const categoryMargins = useMemo(() => {
    const result: { [cat: string]: { cost: number; salesExpected: number } } = {};
    const categoriesList = ["Grocery", "Dairy", "Beverage", "FMCG", "Stationery", "Snacks", "Other"];
    
    categoriesList.forEach(cat => {
      result[cat] = { cost: 0, salesExpected: 0 };
    });

    products.forEach(p => {
      if (p.category in result) {
        result[p.category].cost += p.currentStock * p.purchasePrice;
        result[p.category].salesExpected += p.currentStock * p.sellingPrice;
      }
    });

    return Object.keys(result).map(cat => {
      const data = result[cat];
      const marginVal = data.salesExpected > 0 ? ((data.salesExpected - data.cost) / data.salesExpected) * 100 : 0;
      return {
        category: cat,
        cost: Math.round(data.cost),
        revenue: Math.round(data.salesExpected),
        margin: Math.round(marginVal)
      };
    }).filter(item => item.revenue > 0);
  }, [products]);

  const exportCategoryExcel = () => {
    const headers = ["Category Name", "Total Asset Cost (₹)", "Expected Revenue (₹)", "Expected Gross Margins (%)"];
    const rows = categoryMargins.map(c => [c.category, c.cost, c.revenue, `${c.margin}%`]);
    exportToExcel("Category_Margins_Performance_Report", headers, rows);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Search Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-display">Business Reports Central</h1>
        <p className="text-xs text-gray-500 font-sans">Generate comprehensive PDFs and Excel spreadsheets summarizing stock values, sales, and product life shelf timelines</p>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-400">
        {[
          { id: "valuation", label: "Inventory Valuation Assets", icon: FileSpreadsheet },
          { id: "sales", label: "Outward Sales Velocity", icon: BarChart3 },
          { id: "expiry", label: "Shelf Expiries Timeline", icon: Hourglass },
          { id: "category", label: "Category Retail Margins", icon: Calculator }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-4 flex items-center gap-1.5 border-b-2 transition-all font-display ${
                isActive 
                  ? "border-[#0F4C81] text-[#0F4C81] font-bold" 
                  : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ACTIONS ROW */}
      <div className="bg-white p-5 border border-gray-150 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans text-xs">
        <div>
          <h3 className="text-sm font-bold text-gray-800 font-display tracking-wide uppercase">
            {activeTab === "valuation" && "Stock Asset Valuation Report"}
            {activeTab === "sales" && "Terminal Billing Sales Report"}
            {activeTab === "expiry" && "Perishable Goods Shelf Expiry Timeline"}
            {activeTab === "category" && "Distributive Category Retail Margins"}
          </h3>
          <p className="text-[11px] text-gray-450 mt-0.5">
            {activeTab === "valuation" && "Compilation of wholesale capital assets currently resting on store shelves."}
            {activeTab === "sales" && "Graphing outward gross billing totals across customizable day offsets."}
            {activeTab === "expiry" && "Traced timeline of items expiring shortly. Prioritize clearances."}
            {activeTab === "category" && "Gross markup calculations contrasting wholesale purchase values and selling margins."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
          {activeTab === "sales" && (
            <div className="flex bg-gray-100 p-0.5 rounded-lg border">
              <button 
                onClick={() => setSalesDaysLimit(7)}
                className={`px-2.5 py-1 text-[10px] rounded font-bold font-mono transition-transform ${salesDaysLimit === 7 ? "bg-white text-slate-800 shadow" : "text-gray-400"}`}
              >
                7 DAYS
              </button>
              <button 
                onClick={() => setSalesDaysLimit(30)}
                className={`px-2.5 py-1 text-[10px] rounded font-bold font-mono transition-transform ${salesDaysLimit === 30 ? "bg-white text-slate-800 shadow" : "text-gray-400"}`}
              >
                30 DAYS
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 font-display">
            <button
              onClick={
                activeTab === "valuation" ? exportValuanExcel :
                activeTab === "sales" ? exportSalesExcel :
                activeTab === "expiry" ? exportExpiryExcel : exportCategoryExcel
              }
              className="py-1.5 px-3 bg-teal-650 hover:bg-emerald-700 text-white font-extrabold rounded-xl flex items-center gap-1 shadow-sm uppercase tracking-wider text-[9px]"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span>Spreadsheet (SheetJS)</span>
            </button>

            <button
              onClick={
                activeTab === "valuation" ? exportValuanPDF :
                activeTab === "sales" ? exportSalesPDF :
                activeTab === "expiry" ? exportExpiryPDF : exportValuanPDF // generic helper
              }
              className="py-1.5 px-3 bg-[#0F4C81] hover:bg-[#1A6DB5] text-white font-extrabold rounded-xl flex items-center gap-1 shadow-sm uppercase tracking-wider text-[9px]"
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Full PDF (jsPDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* RENDER ACTIVE TAB BODY */}
      {activeTab === "valuation" && (
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm shadow-slate-100 space-y-4 p-5">
          {/* Header metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium text-gray-500 border-b border-gray-100 pb-4">
            <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-950 rounded-xl">
              <span className="text-[9px] block uppercase font-bold tracking-widest text-[#0F4C81]">Wholesale Asset Cost</span>
              <span className="text-xl font-bold font-mono text-[#0F4C81]">₹{valuationReport.grandCost.toLocaleString("en-IN")}</span>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-950 rounded-xl">
              <span className="text-[9px] block uppercase font-bold tracking-widest text-emerald-700">Gross Shelf Valuation</span>
              <span className="text-xl font-bold font-mono text-emerald-800">₹{valuationReport.grandRevenue.toLocaleString("en-IN")}</span>
            </div>
            <div className="p-3 bg-[#F0F4F8] text-slate-800 rounded-xl">
              <span className="text-[9px] block uppercase font-bold tracking-widest text-slate-500">Maximum markup margin potential</span>
              <span className="text-xl font-bold font-mono text-slate-900">₹{valuationReport.potentialProfit.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                  <th className="py-2.5 px-3">EAN SKU</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Shelf stock</th>
                  <th className="py-2.5 px-3 text-right">Purchase rate</th>
                  <th className="py-2.5 px-3 text-right">Selling rate</th>
                  <th className="py-2.5 px-3 text-right">Aggregate Cost</th>
                  <th className="py-2.5 px-3 text-right">Profit Markup</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                {valuationReport.rows.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 font-medium">
                    <td className="py-2.5 px-3 shrink-0 text-slate-400">{r.sku}</td>
                    <td className="py-2.5 px-3 font-sans font-bold text-gray-800">{r.productName}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-600">{r.currentStock} {r.unit}</td>
                    <td className="py-2.5 px-3 text-right text-gray-500">₹{r.purchasePrice}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">₹{r.sellingPrice}</td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">₹{r.lineCost.toLocaleString("en-IN")}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-bold bg-emerald-50/40">{r.profitMargin}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "sales" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
          {/* Sales chart */}
          <div className="lg:col-span-2 bg-white p-5 border border-gray-100 shadow-sm rounded-2xl">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Gross Revenue Chart Velocity</h4>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesReportData.list}>
                  <XAxis dataKey="formattedDate" stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [`₹${value}`, "Daily Sales"]} />
                  <Bar dataKey="Sales (₹)" fill="#0F4C81" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 border border-gray-100 shadow-sm rounded-2xl flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Metrics Summary</h4>
              <div className="space-y-4 my-4 font-sans text-xs font-medium text-gray-500">
                <div className="p-3 bg-blue-50 text-blue-950 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-blue-700 block mb-0.5">Aggregate gross Sales volume</span>
                  <span className="text-2xl font-bold font-mono text-blue-900">₹{salesReportData.totalVolume.toLocaleString("en-IN")}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl flex justify-between items-center text-xs">
                  <span>Period ticket invoices:</span>
                  <span className="font-mono font-bold text-gray-800">{salesReportData.list.reduce((sum, s) => sum + s.transactionCount, 0)} counter ticks</span>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-gray-400 leading-relaxed italic p-2.5 bg-gray-50 rounded-lg">
              *コントロール periods aggregate daily outward checkout billing items perfectly.
            </div>
          </div>
        </div>
      )}

      {activeTab === "expiry" && (
        <div className="bg-white p-5 border border-gray-150 rounded-2xl shadow-sm space-y-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Expiring next 30-45 days</h4>
          
          {expiryReportData.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-450">🎉 Perfect! No products are expiring within the next 45 days.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600 border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                    <th className="py-2.5 px-3">SKU Id</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Shelf stock balance</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3 text-right">Days left</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[11px] font-mono">
                  {expiryReportData.map(e => {
                    const isUrgent = e.daysLeft <= 7;
                    return (
                      <tr key={e.id} className="hover:bg-gray-50 font-medium">
                        <td className="py-2.5 px-3 shrink-0 text-slate-400">{e.sku}</td>
                        <td className="py-2.5 px-3 font-sans font-bold text-gray-800">{e.productName}</td>
                        <td className="py-2.5 px-3 font-sans font-semibold text-gray-500">{e.category}</td>
                        <td className="py-2.5 px-3 font-bold text-[#0F4C81]">{e.currentStock} {e.unit}</td>
                        <td className="py-2.5 px-3 text-gray-500 font-bold">{e.expiryDate}</td>
                        <td className="py-2.5 px-1 text-right">
                          <span className={`px-2.5 py-0.5 rounded-lg font-extrabold text-[10px] ${isUrgent ? "bg-red-100 text-red-705" : "bg-orange-100 text-orange-705"}`}>
                            {e.daysLeft} days remaining
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "category" && (
        <div className="bg-white p-5 border border-gray-150 rounded-2xl shadow-sm space-y-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Contrasting category retail markups</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                  <th className="py-3 px-3">Category Lane</th>
                  <th className="py-3 px-3 text-right">Aggregate Purchase Value</th>
                  <th className="py-3 px-3 text-right">Expected Retail value</th>
                  <th className="py-3 px-3 text-right">Expected Profit Yield</th>
                  <th className="py-3 px-3 text-right">Expected Markups (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[11px] font-mono font-medium">
                {categoryMargins.map(c => (
                  <tr key={c.category} className="hover:bg-gray-50">
                    <td className="py-3 px-3 font-sans font-extrabold text-[#0F4C81]">{c.category}</td>
                    <td className="py-3 px-3 text-right text-gray-500">₹{c.cost.toLocaleString("en-IN")}</td>
                    <td className="py-3 px-3 text-right text-slate-800">₹{c.revenue.toLocaleString("en-IN")}</td>
                    <td className="py-3 px-3 text-right text-gray-700 font-bold">₹{(c.revenue - c.cost).toLocaleString("en-IN")}</td>
                    <td className="py-3 px-3 text-right text-emerald-800 font-extrabold bg-[#2A9D8F]/10">
                      <div className="flex items-center justify-end gap-1 font-bold">
                        <span>{c.margin}%</span>
                        <Percent className="w-3.5 h-3.5 shrink-0" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
