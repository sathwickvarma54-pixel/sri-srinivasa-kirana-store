import React, { useState, useMemo } from "react";
import { 
  Truck, 
  Phone, 
  MessageSquare, 
  Plus, 
  MapPin, 
  Package, 
  CheckCircle,
  X,
  CreditCard,
  Building,
  MailCheck,
  TrendingUp,
  History
} from "lucide-react";
import { Supplier, Product, Transaction } from "../types";

interface SuppliersViewProps {
  products: Product[];
  transactions: Transaction[];
  suppliers: Supplier[];
  onAddSupplier: (sup: Omit<Supplier, "id" | "createdAt">) => Promise<void>;
  onSettleSupplierBalance: (supplierId: string) => Promise<void>;
}

export function SuppliersView({ 
  products, 
  transactions, 
  suppliers, 
  onAddSupplier, 
  onSettleSupplierBalance 
}: SuppliersViewProps) {
  const [detailedSupplier, setDetailedSupplier] = useState<Supplier | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [linkedProdsText, setLinkedProdsText] = useState("");
  const [pendingAmount, setPendingAmount] = useState(0);

  // 1. Trace active linked products in catalog for each supplier
  const supplierAggregates = useMemo(() => {
    const summary: { [id: string]: { skus: Product[]; inwardsValue: number } } = {};
    
    suppliers.forEach(s => {
      summary[s.id] = { skus: [], inwardsValue: 0 };
    });

    products.forEach(p => {
      if (p.supplierId && summary[p.supplierId]) {
        summary[p.supplierId].skus.push(p);
      }
    });

    transactions.forEach(t => {
      if (t.type === "inward" && t.supplierId && summary[t.supplierId]) {
        summary[t.supplierId].inwardsValue += t.quantity * t.price;
      }
    });

    return summary;
  }, [suppliers, products, transactions]);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await onAddSupplier({
        supplierName: name,
        phone: phone || "+91 98765 43210",
        whatsapp: whatsapp || "+91 98765 43210",
        address: address || "Main Market",
        products: linkedProdsText ? linkedProdsText.split(",").map(i => i.trim()) : [],
        pendingAmount: pendingAmount || 0
      });

      // Clear Form and close
      setIsAddOpen(false);
      setName("");
      setPhone("");
      setWhatsapp("");
      setAddress("");
      setLinkedProdsText("");
      setPendingAmount(0);
    } catch (err: any) {
      alert("Error adding supplier: " + err.message);
    }
  };

  const handleSettleDebt = async (id: string) => {
    if (confirm("Mark outstanding balance as SETTLED (Paid in full)?")) {
      try {
        await onSettleSupplierBalance(id);
        // Refresh details
        if (detailedSupplier && detailedSupplier.id === id) {
          setDetailedSupplier(prev => prev ? { ...prev, pendingAmount: 0 } : null);
        }
      } catch (err: any) {
        alert("Settle ledger error: " + err.message);
      }
    }
  };

  // Supplied products list for detailed view
  const detailedProducts = useMemo(() => {
    if (!detailedSupplier) return [];
    return products.filter(p => p.supplierId === detailedSupplier.id);
  }, [detailedSupplier, products]);

  // Inward invoice ledger history
  const detailedInwards = useMemo(() => {
    if (!detailedSupplier) return [];
    return transactions.filter(t => t.type === "inward" && t.supplierId === detailedSupplier.id);
  }, [detailedSupplier, transactions]);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-display">Wholesale Distributors Ledger</h1>
          <p className="text-xs text-gray-500 font-sans">Enlist B2B merchant partnerships, catalog item distribution lanes, and settlement balances</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 bg-[#166534] hover:bg-[#14532D] text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add wholeseller</span>
        </button>
      </div>

      {detailedSupplier ? (
        <div className="space-y-6 font-sans">
          {/* Detailed Screen */}
          <button
            onClick={() => setDetailedSupplier(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#166534] hover:underline"
          >
            <MapPin className="w-4 h-4 rotate-180" />
            <span>Return to Supplier Directory</span>
          </button>

          <div className="bg-white p-6 border border-gray-100 shadow-sm rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-lg bg-emerald-50 text-[#166534] border border-emerald-250">
                  Active Partnership
                </span>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-2.5 font-display">{detailedSupplier.supplierName}</h2>
                <p className="text-xs font-medium text-gray-500 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{detailedSupplier.address}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-medium text-gray-500">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400 block text-[9px] font-bold uppercase tracking-wide mb-1">Official Contact Phone</span>
                  <div className="flex items-center gap-1.5 text-gray-800 font-semibold font-mono">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{detailedSupplier.phone}</span>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400 block text-[9px] font-bold uppercase tracking-wide mb-1">Active WhatsApp Support</span>
                  <div className="flex items-center gap-1.5 text-[#10B981] font-bold font-mono">
                    <MessageSquare className="w-4 h-4 text-[#10B981] shrink-0" />
                    <span>{detailedSupplier.whatsapp}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border border-[#E2E8F0] rounded-xl bg-slate-50 flex flex-col justify-between">
              <div>
                <span className="text-gray-400 text-[9px] font-bold uppercase tracking-widest block font-mono">Unsettled accounts due</span>
                <span className={`text-2xl font-bold font-mono block mt-1.5 ${detailedSupplier.pendingAmount > 0 ? "text-red-655" : "text-emerald-700"}`}>
                  ₹{detailedSupplier.pendingAmount.toLocaleString("en-IN")}
                </span>
              </div>
              {detailedSupplier.pendingAmount > 0 ? (
                <button
                  onClick={() => handleSettleDebt(detailedSupplier.id)}
                  className="w-full mt-4 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  <CheckCircle className="w-4 h-4 animate-bounce-hover" />
                  <span>Settled Balance (Mark Paid)</span>
                </button>
              ) : (
                <div className="my-4 text-xs font-bold text-emerald-800 p-2.5 bg-emerald-100 rounded-lg flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Accounts Cleanly Balanced</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Table 1: Supplied Catalog SKU Items */}
            <div className="bg-white p-5 border border-gray-100 shadow-sm rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-[#166534] uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-1 font-display">
                <Package className="w-4 h-4 text-[#F59E0B]" />
                <span>Linked products catalog ({detailedProducts.length})</span>
              </h3>
              {detailedProducts.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">No items are officially configured on this supplier currently.</div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                  {detailedProducts.map(p => (
                    <div key={p.id} className="py-2 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-gray-800 block text-xs">{p.productName}</span>
                        <span className="text-[10px] text-gray-400 font-medium italic">SKU: {p.sku}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-[#166534] block">Stock: {p.currentStock} {p.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Table 2: Purchase history ledger */}
            <div className="bg-white p-5 border border-gray-100 shadow-sm rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-[#166534] uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-1 font-display">
                <History className="w-4 h-4 text-[#10B981]" />
                <span>Restock Invoice Ledger (Inwards)</span>
              </h3>
              {detailedInwards.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">No recent restock events logged for this merchant.</div>
              ) : (
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                        <th className="py-2">Date</th>
                        <th className="py-2">Item Product</th>
                        <th className="py-2 text-right">Qty</th>
                        <th className="py-2 text-right">Value (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono">
                      {detailedInwards.map(i => (
                        <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2 text-[10px] text-gray-500 font-sans">
                            {new Date(i.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </td>
                          <td className="py-2 font-sans font-semibold text-gray-800">{i.productName}</td>
                          <td className="py-2 text-right">+{i.quantity}</td>
                          <td className="py-2 text-right font-bold text-slate-800">₹{(i.quantity * i.price).toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="bg-white p-8 text-center text-gray-500 text-xs border border-gray-100 rounded-2xl shadow-sm">
          No supplier data available
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
          {/* Master Cards Grid */}
          {suppliers.map(s => {
            const agg = supplierAggregates[s.id] || { skus: [], inwardsValue: 0 };
            return (
              <div 
                key={s.id} 
                className="bg-white p-5 border border-gray-100 shadow-sm rounded-2xl hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 bg-emerald-50 text-[#166534] rounded-xl">
                      <Building className="w-5 h-5 text-[#166534]" />
                    </div>
                    {s.pendingAmount > 0 ? (
                      <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-lg font-mono">
                        Debt: ₹{s.pendingAmount}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-lg">
                        Outstanding: 0
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 text-sm font-bold text-gray-900 font-display">{s.supplierName}</h3>
                  <p className="mt-1 text-xs text-gray-400 italic font-medium max-w-[200px] truncate">{s.address}</p>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-500 font-bold">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{s.phone}</span>
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                      <Package className="w-3.5 h-3.5 text-[#166534] shrink-0" />
                      <span>{agg.skus.length} catalog items</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-50 pt-3.5 flex items-center gap-2">
                  <button
                    onClick={() => setDetailedSupplier(s)}
                    className="flex-1 py-1.5 bg-gray-50 hover:bg-emerald-50 text-[#166534] text-xs font-bold rounded-lg border border-gray-200 transition-colors text-center"
                  >
                    Manage records
                  </button>
                  {s.pendingAmount > 0 && (
                    <button
                      onClick={() => handleSettleDebt(s.id)}
                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg transition-all"
                      title="Settle unpaid balance dues"
                    >
                      <CreditCard className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: CREATE DISTRIBUTOR */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto border">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-sm font-bold text-[#166534] uppercase tracking-wider flex items-center gap-1.5 font-display">
                <Truck className="w-5 h-5 text-[#F59E0B]" />
                <span>Register Wholeseller B2B Account</span>
              </h2>
              <button onClick={() => setIsAddOpen(false)} className="p-1 text-gray-400 hover:text-gray-500 rounded"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-4 text-xs font-medium text-gray-500">
              <div>
                <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Company / Wholeseller Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 rounded-xl border focus:ring-1 focus:ring-[#166534] text-slate-800 font-bold"
                  placeholder="E.g. Sri Srinivasa FMCG Trading"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Office Telephone</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-xl border focus:ring-1 focus:ring-[#166534] text-slate-800 font-mono font-bold"
                    placeholder="+91 94..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">WhatsApp Broadcast No.</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-xl border focus:ring-1 focus:ring-[#166534] text-[#10B981] font-mono font-bold"
                    placeholder="+91 94..."
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Company Street Address</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-xl border focus:ring-1 focus:ring-[#166534] text-slate-800 font-semibold"
                  placeholder="D.No 44-5 Main Market, Visakhapatnam"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Draft Initial Unsettled Debt (₹)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 rounded-xl border focus:ring-1 focus:ring-[#166534] text-red-750 font-mono font-bold"
                  value={pendingAmount || ""}
                  onChange={(e) => setPendingAmount(parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-3.5">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-3.5 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancel</button>
                <button type="submit" className="px-3.5 py-2 bg-[#166534] hover:bg-[#14532D] text-white font-bold rounded-xl shadow-sm flex items-center gap-1">
                  <MailCheck className="w-3.5 h-3.5" />
                  <span>Enrol Distributor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
