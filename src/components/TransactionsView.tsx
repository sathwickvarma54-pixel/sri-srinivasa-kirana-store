import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  FileSpreadsheet, 
  Filter, 
  ShoppingCart, 
  AlertOctagon, 
  Check, 
  HelpCircle,
  TrendingUp,
  PackagePlus,
  RefreshCw
} from "lucide-react";
import { Product, Transaction, Supplier, UserProfile } from "../types";
import { exportToExcel } from "../utils/export";

interface TransactionsViewProps {
  products: Product[];
  transactions: Transaction[];
  suppliers: Supplier[];
  profile: UserProfile | null;
  onRecordTransaction: (tx: Omit<Transaction, "id" | "timestamp" | "staffId" | "staffName">) => Promise<void>;
}

export function TransactionsView({ 
  products, 
  transactions, 
  suppliers, 
  profile, 
  onRecordTransaction 
}: TransactionsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  // Record Transaction state
  const [isRecordingOpen, setIsRecordingOpen] = useState(false);
  const [errorVal, setErrorVal] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [txType, setTxType] = useState<"inward" | "outward" | "adjustment" | "damage" | "return">("outward");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [qty, setQty] = useState(1);
  const [customPrice, setCustomPrice] = useState(0);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [notes, setNotes] = useState("");

  const activeProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Handle product select prefill price
  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      // Prefill: inward gets purchase price, outward gets selling price
      setCustomPrice(txType === "inward" ? prod.purchasePrice : prod.sellingPrice);
      setSelectedSupplierId(prod.supplierId || suppliers[0]?.id || "");
    }
  };

  // Keep price updated when switching transaction type
  const handleTypeSelect = (type: any) => {
    setTxType(type);
    if (activeProduct) {
      setCustomPrice(type === "inward" ? activeProduct.purchasePrice : activeProduct.sellingPrice);
    }
  };

  const handleValidateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorVal("");

    if (!selectedProductId) {
      setErrorVal("Please select a valid product.");
      return;
    }
    if (qty <= 0) {
      setErrorVal("Quantity must be greater than 0.");
      return;
    }
    if (customPrice < 0) {
      setErrorVal("Price/rate cannot be negative.");
      return;
    }

    // CRITICAL STOCK VERIFICATION: Outward or Damage cannot exceed stock!
    if (activeProduct && (txType === "outward" || txType === "damage")) {
      if (qty > activeProduct.currentStock) {
        setErrorVal(`Insufficient stock! ${activeProduct.productName} currently has only ${activeProduct.currentStock} ${activeProduct.unit} available.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await onRecordTransaction({
        type: txType,
        productId: selectedProductId,
        productName: activeProduct?.productName || "Unknown Product",
        quantity: qty,
        price: customPrice,
        supplierId: txType === "inward" ? selectedSupplierId : null,
        notes: notes || "Recorded via system terminal"
      });

      // Clear Form and close
      setIsRecordingOpen(false);
      setSelectedProductId("");
      setQty(1);
      setCustomPrice(0);
      setNotes("");
    } catch (err: any) {
      setErrorVal(err.message || "Failed to record transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  // 2. SEARCH & FILTER TRANSACTIONS
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = 
        t.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.staffName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchType = typeFilter === "All" || t.type === typeFilter;

      return matchSearch && matchType;
    });
  }, [transactions, searchTerm, typeFilter]);

  // SHEETJS EXPORT EXECUTOR
  const triggerExcelExport = () => {
    const headers = ["Timestamp", "Transaction Type", "Product Name", "Quantity", "Rate (₹)", "Aggregate Amount (₹)", "Logged By", "Notes"];
    const rows = filteredTransactions.map(t => [
      new Date(t.timestamp).toLocaleString("en-IN"),
      t.type.toUpperCase(),
      t.productName,
      t.quantity,
      t.price,
      t.quantity * t.price,
      t.staffName,
      t.notes
    ]);

    exportToExcel("Transaction_History_Report", headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-display">Store Transaction Terminal</h1>
          <p className="text-xs text-gray-500">Record billing receipts, sales checkouts, bulk inwards, and stock adjustments</p>
        </div>
        <button
          onClick={() => {
            setIsRecordingOpen(true);
            setErrorVal("");
          }}
          className="px-4 py-2 bg-[#166534] hover:bg-[#14532D] text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New ledger Entry</span>
        </button>
      </div>

      {/* Filters & Export Toolbar */}
      <div className="bg-white p-4 border border-gray-150 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-sm shadow-slate-100">
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#166534]"
              placeholder="Search products or staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              className="border border-[#E2E8F0] rounded-xl px-2.5 py-1.5 bg-white font-semibold text-gray-700"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="All">All Transaction Types</option>
              <option value="inward">Inward Restock</option>
              <option value="outward">Outward Sale</option>
              <option value="damage">Damage Outflow</option>
              <option value="adjustment">Quantity Adjustment</option>
              <option value="return">Customer Return</option>
            </select>
          </div>
        </div>

        <button
          onClick={triggerExcelExport}
          className="px-4 py-2 bg-[#10B981] hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2.5 shadow-sm shrink-0 self-start sm:self-auto uppercase tracking-wider text-[10px]"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Excel (SheetJS)</span>
        </button>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {transactions.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-xs">
            No transaction records found. Create your first ledger entry to begin.
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-xs">
            No transactions registered matching current filter query parameters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Product Unit SKU</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Aggregate Cost</th>
                  <th className="py-3 px-4 text-right">Logged By</th>
                  <th className="py-3 px-4 text-right">Internal Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {filteredTransactions.map(t => {
                  const grossVal = t.quantity * t.price;
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-gray-500 text-[11px] font-sans">
                        {new Date(t.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} • {new Date(t.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                          t.type === "inward" ? "bg-amber-100 text-amber-800" :
                          t.type === "outward" ? "bg-emerald-100 text-emerald-800" :
                          t.type === "damage" ? "bg-red-100 text-red-800" :
                          t.type === "return" ? "bg-purple-100 text-purple-850" : "bg-gray-100 text-gray-700"
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans font-bold text-gray-800">{t.productName}</td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {t.type === "inward" || t.type === "return" ? "+" : "-"}{t.quantity}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500">₹{t.price}</td>
                      <td className="py-3 px-4 text-right text-gray-900 font-bold">₹{grossVal.toLocaleString("en-IN")}</td>
                      <td className="py-3 px-4 text-right font-sans text-gray-400 font-medium">{t.staffName}</td>
                      <td className="py-3 px-4 text-right font-sans italic text-gray-400 text-[11px] max-w-[150px] truncate">{t.notes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RECORD TRANSACTION DIALOG OVERLAY */}
      {isRecordingOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto border border-gray-100">
            <h2 className="text-base font-bold text-[#166534] uppercase tracking-wider flex items-center gap-1.5 font-display border-b border-gray-100 pb-3">
              <ShoppingCart className="w-5 h-5 text-[#F59E0B]" />
              <span>Record Counter Ledger entry</span>
            </h2>

            {errorVal && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-center gap-2 border border-red-100">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>{errorVal}</span>
              </div>
            )}

            <form onSubmit={handleValidateAndSubmit} className="space-y-4 text-xs font-medium text-gray-500">
              {/* Type Select buttons */}
              <div>
                <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Operation Mode</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "outward", label: "Outward (Sale)" },
                    { id: "inward", label: "Inward (restock)" },
                    { id: "damage", label: "Damage Out" },
                    { id: "adjustment", label: "Tally Adjustment" },
                    { id: "return", label: "Customer Return" }
                  ].map(item => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => handleTypeSelect(item.id as any)}
                      className={`py-2 px-1 text-[10px] font-bold rounded-lg border text-center transition-all ${
                        txType === item.id 
                          ? "bg-[#166534] text-white border-[#166534] shadow-sm" 
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Catalog Product SKU *</label>
                <select
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-slate-800 font-bold"
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                >
                  <option value="">-- Choose registered item --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.productName} (Avail: {p.currentStock})</option>
                  ))}
                </select>
              </div>

              {activeProduct && (
                <div className="p-2.5 bg-emerald-50 rounded-xl text-[11px] text-gray-600 flex justify-between items-center font-sans">
                  <span>Current Available Stock: <b>{activeProduct.currentStock} {activeProduct.unit}</b></span>
                  <span>Safety Level: <b>{activeProduct.minStockLevel} {activeProduct.unit}</b></span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 font-mono">Count Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-slate-800 font-mono font-bold focus:ring-1 focus:ring-[#166534]"
                    value={qty}
                    onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 font-mono">Terminal rate (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-slate-800 font-mono font-bold focus:ring-1 focus:ring-[#166534]"
                    value={customPrice || ""}
                    onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Show Supplier only if Inward */}
              {txType === "inward" && (
                <div>
                  <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Stock Supplier Destination</label>
                  <select
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-slate-800 font-bold"
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                  >
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.supplierName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Receipt reference notes</label>
                <textarea
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-slate-800 font-semibold focus:ring-1 focus:ring-[#166534]"
                  rows={2}
                  placeholder="E.g. Paid cash, UPI completed, damaged on arrival..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRecordingOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#166534] text-white font-bold rounded-xl hover:bg-[#14532D] flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{submitting ? "Writing..." : "Commit Transaction"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
