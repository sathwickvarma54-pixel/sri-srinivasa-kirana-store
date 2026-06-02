import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Trash2, 
  Edit3, 
  History, 
  PackageCheck, 
  ArrowLeft,
  X,
  PlusCircle,
  TrendingUp,
  XCircle,
  Truck,
  Sparkles
} from "lucide-react";
import { Product, Transaction, Supplier } from "../types";

const CATEGORY_COLORS = {
  Grocery: "#0F4C81",
  Dairy: "#2A9D8F",
  Beverage: "#F4A261",
  FMCG: "#E63946",
  Stationery: "#9C27B0",
  Snacks: "#F5A623",
  Other: "#718096"
};

interface ProductsViewProps {
  products: Product[];
  transactions: Transaction[];
  suppliers: Supplier[];
  onAddProduct: (prod: Omit<Product, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onEditProduct: (productId: string, prod: Partial<Product>) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  role: "owner" | "manager" | "staff";
}

export function ProductsView({ 
  products, 
  transactions, 
  suppliers, 
  onAddProduct, 
  onEditProduct, 
  onDeleteProduct, 
  role 
}: ProductsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [expiringSoonOnly, setExpiringSoonOnly] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [detailedProduct, setDetailedProduct] = useState<Product | null>(null);
  const [quickStockProduct, setQuickStockProduct] = useState<Product | null>(null);
  const [quickStockValue, setQuickStockValue] = useState(0);

  // Form states and simple manual validation errors
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [prodForm, setProdForm] = useState({
    productName: "",
    localName: "",
    category: "Grocery" as any,
    sku: "",
    barcode: "",
    unit: "piece" as any,
    purchasePrice: 0,
    sellingPrice: 0,
    currentStock: 0,
    minStockLevel: 5,
    expiryDate: "",
    supplierId: "",
    storageLocation: "",
    status: "active" as any
  });

  const categories = ["All", "Grocery", "Dairy", "Beverage", "FMCG", "Stationery", "Snacks", "Other"];

  // 1. FILTER PRODUCTS
  const filteredProducts = useMemo(() => {
    const todayNum = new Date("2026-06-01").getTime();
    return products.filter(p => {
      // Search
      const matchesSearch = 
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.localName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchTerm));

      // Category
      const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;

      // Low stock bounds check
      const matchesLowStock = !lowStockOnly || (p.currentStock <= p.minStockLevel);

      // Expiry within 30 days
      let matchesExpiry = true;
      if (expiringSoonOnly) {
        if (!p.expiryDate) {
          matchesExpiry = false;
        } else {
          const expNum = new Date(p.expiryDate).getTime();
          const diffDays = (expNum - todayNum) / (1000 * 60 * 60 * 24);
          matchesExpiry = diffDays >= 0 && diffDays <= 30;
        }
      }

      return matchesSearch && matchesCategory && matchesLowStock && matchesExpiry;
    });
  }, [products, searchTerm, selectedCategory, lowStockOnly, expiringSoonOnly]);

  // Form handlers
  const handleOpenAddModal = () => {
    setProdForm({
      productName: "",
      localName: "",
      category: "Grocery",
      sku: `SKU-${Date.now().toString().substring(7)}`,
      barcode: "",
      unit: "piece",
      purchasePrice: 0,
      sellingPrice: 0,
      currentStock: 0,
      minStockLevel: 5,
      expiryDate: "",
      supplierId: suppliers[0]?.id || "",
      storageLocation: "",
      status: "active"
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setProdForm({
      productName: p.productName,
      localName: p.localName || "",
      category: p.category,
      sku: p.sku,
      barcode: p.barcode || "",
      unit: p.unit,
      purchasePrice: p.purchasePrice,
      sellingPrice: p.sellingPrice,
      currentStock: p.currentStock,
      minStockLevel: p.minStockLevel,
      expiryDate: p.expiryDate || "",
      supplierId: p.supplierId || "",
      storageLocation: p.storageLocation || "",
      status: p.status
    });
    setFormErrors({});
  };

  const handleValidateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    if (!prodForm.productName.trim()) {
      errors.productName = "Product name is required.";
    }
    if (prodForm.purchasePrice <= 0) {
      errors.purchasePrice = "Purchase price must be greater than 0.";
    }
    if (prodForm.sellingPrice < prodForm.purchasePrice) {
      errors.sellingPrice = "Selling price must be greater than or equal to purchase price.";
    }
    if (prodForm.currentStock < 0) {
      errors.currentStock = "Stock cannot be negative.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      if (editingProduct) {
        await onEditProduct(editingProduct.id, {
          ...prodForm,
          expiryDate: prodForm.expiryDate || null,
          updatedAt: new Date().toISOString()
        } as any);
        setEditingProduct(null);
      } else {
        await onAddProduct({
          ...prodForm,
          expiryDate: prodForm.expiryDate || null
        });
        setIsAddModalOpen(false);
      }
    } catch (err: any) {
      alert("Error saving item: " + err.message);
    }
  };

  const handleQuickStockSave = async () => {
    if (!quickStockProduct) return;
    try {
      await onEditProduct(quickStockProduct.id, {
        currentStock: quickStockValue,
        updatedAt: new Date().toISOString()
      });
      setQuickStockProduct(null);
    } catch (err: any) {
      alert("Error updating quick stock: " + err.message);
    }
  };

  // Detailed Product view trace data
  const detailedProductHistory = useMemo(() => {
    if (!detailedProduct) return [];
    return transactions.filter(t => t.productId === detailedProduct.id);
  }, [detailedProduct, transactions]);

  // Mini stock movement aggregates
  const stockMovementAggregates = useMemo(() => {
    if (!detailedProduct) return { inward: 0, outward: 0 };
    const prodTxs = transactions.filter(t => t.productId === detailedProduct.id);
    const inward = prodTxs.filter(t => t.type === "inward").reduce((sum, t) => sum + t.quantity, 0);
    const outward = prodTxs.filter(t => t.type === "outward").reduce((sum, t) => sum + t.quantity, 0);
    return { inward, outward };
  }, [detailedProduct, transactions]);

  const canEdit = role === "owner" || role === "manager";

  // Render Product detail screen overlay/container if selected
  if (detailedProduct) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setDetailedProduct(null)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#0F4C81] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Product Database</span>
        </button>

        <div className="bg-white p-6 border border-gray-100 shadow-sm rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase bg-[#0F4C81] text-white px-2 py-0.5 rounded-lg">
                {detailedProduct.category}
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 mt-2 font-display">
                {detailedProduct.productName}
              </h2>
              <p className="text-xs text-gray-500 italic mt-0.5">Local Name: {detailedProduct.localName || "None"}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block uppercase tracking-wider text-[9px] font-bold">SKU ID</span>
                <span className="font-mono font-bold text-gray-800">{detailedProduct.sku}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block uppercase tracking-wider text-[9px] font-bold">Barcode ID</span>
                <span className="font-mono font-bold text-gray-800">{detailedProduct.barcode || "N/A"}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block uppercase tracking-wider text-[9px] font-bold">Storage Location</span>
                <span className="font-bold text-gray-800">{detailedProduct.storageLocation || "Stockroom"}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block uppercase tracking-wider text-[9px] font-bold">Current Stock</span>
                <span className="font-mono font-bold text-[#0F4C81] text-base">{detailedProduct.currentStock} {detailedProduct.unit}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block uppercase tracking-wider text-[9px] font-bold">Purchase Rate</span>
                <span className="font-mono font-bold text-gray-800">₹{detailedProduct.purchasePrice}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block uppercase tracking-wider text-[9px] font-bold">Selling Rate</span>
                <span className="font-mono font-bold text-gray-800">₹{detailedProduct.sellingPrice}</span>
              </div>
            </div>
          </div>

          <div className="p-5 border border-gray-100 rounded-xl bg-slate-50 flex flex-col justify-between">
            <h3 className="text-sm font-bold text-[#0F4C81] uppercase tracking-wider border-b border-gray-200 pb-2">30D Movement Aggregates</h3>
            <div className="space-y-4 my-4 font-sans text-xs">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-gray-500 font-medium">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>Total Gross Inwards</span>
                </span>
                <span className="font-mono font-bold text-emerald-800">+{stockMovementAggregates.inward} {detailedProduct.unit}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-gray-500 font-medium">
                  <TrendingUp className="w-4 h-4 text-blue-500 rotate-90" />
                  <span>Total Sales (Outward)</span>
                </span>
                <span className="font-mono font-bold text-blue-800">-{stockMovementAggregates.outward} {detailedProduct.unit}</span>
              </div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-gray-150 text-[11px] text-gray-500 leading-relaxed italic">
              *Real-time movement metrics updated continuously on counter transactions.
            </div>
          </div>
        </div>

        {/* Detailed history table */}
        <div className="bg-white p-5 border border-gray-100 shadow-sm rounded-2xl">
          <h3 className="text-sm font-bold text-[#0F4C81] uppercase tracking-wider mb-3 flex items-center gap-1.5 font-display">
            <History className="w-4 h-4" />
            <span>Product Transaction Ledger (Last 20)</span>
          </h3>

          {detailedProductHistory.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              No previous ledger transactions recorded for this specific product.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600 border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5">Timestamp</th>
                    <th className="py-2.5">Category Type</th>
                    <th className="py-2.5 text-right">Quantity Change</th>
                    <th className="py-2.5 text-right font-bold">Fitted Price</th>
                    <th className="py-2.5 text-right">Operator Name</th>
                    <th className="py-2.5 text-right">Reference Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detailedProductHistory.map(h => (
                    <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 font-mono text-[11px] text-gray-500">
                        {new Date(h.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase ${
                          h.type === "inward" ? "bg-emerald-100 text-emerald-800" :
                          h.type === "outward" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"
                        }`}>
                          {h.type}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-gray-800">
                        {h.type === "inward" ? "+" : "-"}{h.quantity}
                      </td>
                      <td className="py-2.5 text-right font-mono font-semibold text-gray-700">₹{h.price}</td>
                      <td className="py-2.5 text-right font-medium text-gray-400">{h.staffName}</td>
                      <td className="py-2.5 text-right italic text-gray-400 text-[11px]">{h.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-display">Products Master Catalog</h1>
          <p className="text-xs text-gray-500">Trace, update, and manage grocery and FMCG SKU stock parameters</p>
        </div>
        {canEdit && (
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-[#0F4C81] hover:bg-[#1A6DB5] text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center gap-1.5 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product SKU</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 border border-gray-150 rounded-2xl flex flex-col sm:flex-row items-center gap-4 text-xs shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0F4C81]"
            placeholder="Search name, SKU, or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <SlidersHorizontal className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            className="border border-[#E2E8F0] rounded-xl px-2.5 py-1.5 bg-white text-gray-700 font-semibold"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === "All" ? "All Categories" : cat}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <label className="flex items-center gap-1.5 text-gray-600 font-medium cursor-pointer">
            <input
              type="checkbox"
              className="rounded text-[#0F4C81] focus:ring-[#0F4C81] w-4 h-4"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
            />
            <span>Critical Low Stocks Only</span>
          </label>

          <label className="flex items-center gap-1.5 text-gray-600 font-medium cursor-pointer">
            <input
              type="checkbox"
              className="rounded text-[#0F4C81] focus:ring-[#0F4C81] w-4 h-4"
              checked={expiringSoonOnly}
              onChange={(e) => setExpiringSoonOnly(e.target.checked)}
            />
            <span>Expiring Soon (&lt;30d)</span>
          </label>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-xs">
            No products found matching active filters. Try resetting terms.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">SKU Code</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Stock Parameters</th>
                  <th className="py-3 px-4 text-right">Purchase Price</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4">Expiry date</th>
                  <th className="py-3 px-4">Shelf location</th>
                  <th className="py-3 px-4 text-right">Catalog Interactions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans">
                {filteredProducts.map(p => {
                  const isLow = p.currentStock <= p.minStockLevel;
                  const isOutOfStock = p.currentStock === 0;
                  // stock index calculations
                  const stockRatio = p.currentStock / (p.minStockLevel || 1);
                  const barColorClass = isOutOfStock ? "bg-red-600" : isLow ? "bg-amber-500" : "bg-emerald-500";

                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-gray-800 text-[11px] shrink-0">{p.sku}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-gray-900 block">{p.productName}</span>
                        <span className="text-[10px] text-gray-400 italic font-medium">{p.localName || "No Local alias"}</span>
                      </td>
                      <td className="py-3 px-4 shrink-0">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider" style={{ backgroundColor: CATEGORY_COLORS[p.category as keyof typeof CATEGORY_COLORS] }}>
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 min-w-[120px]">
                        <div className="flex items-center justify-between text-[11px] font-bold font-mono text-gray-700">
                          <span className={isLow ? "text-red-655" : "text-gray-900"}>{p.currentStock} / {p.minStockLevel} {p.unit}</span>
                          {isOutOfStock ? (
                            <span className="text-[9px] bg-red-100 text-red-700 px-1 py-0.5 rounded uppercase tracking-wider font-sans font-extrabold shrink-0">Depleted</span>
                          ) : isLow ? (
                            <span className="text-[9px] bg-amber-50 text-amber-700 px-1 py-0.5 rounded uppercase tracking-wider font-sans font-extrabold shrink-0">Low</span>
                          ) : null}
                        </div>
                        {/* Custom Stock volume indicator bar */}
                        <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                          <div 
                            id={`stock-volume-indicator-${p.id}`}
                            className={`h-full ${barColorClass} stock-volume-indicator ${isLow ? "pulse-critical" : ""}`} 
                            style={{ width: `${Math.min(stockRatio * 40, 100)}%` }} 
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-gray-700">₹{p.purchasePrice}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900 font-semibold">₹{p.sellingPrice}</td>
                      <td className="py-3 px-4 font-mono text-gray-500 font-bold shrink-0">{p.expiryDate || <span className="text-gray-300 font-normal">No Expiry</span>}</td>
                      <td className="py-3 px-4 font-medium text-gray-400">{p.storageLocation || "Stockroom"}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setDetailedProduct(p)}
                            className="p-1.5 hover:bg-[#0F4C81]/10 text-[#0F4C81] rounded-lg transition-colors"
                            title="Trace Movement History"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => {
                              setQuickStockProduct(p);
                              setQuickStockValue(p.currentStock);
                            }}
                            className="p-1.5 hover:bg-emerald-50 text-emerald-800 rounded-lg transition-colors"
                            title="Quick Adjust Stock Volume"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>

                          {canEdit && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(p)}
                                className="p-1.5 hover:bg-amber-100 text-[#F5A623] rounded-lg transition-colors"
                                title="Edit Product Metrics"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Remove product "${p.productName}" from parameters?`)) {
                                    onDeleteProduct(p.id);
                                  }
                                }}
                                className="p-1.5 hover:bg-red-50 text-[#E63946] rounded-lg transition-colors"
                                title="Delete Catalog SKU"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD / EDIT PRODUCT */}
      {(isAddModalOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl border w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-[#0F4C81] uppercase tracking-wider flex items-center gap-1.5 font-display">
                <PackageCheck className="w-5 h-5 text-[#F5A623]" />
                <span>{editingProduct ? `Edit Product: ${editingProduct.productName}` : "Add New Catalog Product"}</span>
              </h2>
              <button 
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingProduct(null);
                }} 
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleValidateAndSubmit} className="space-y-4 text-xs font-medium text-gray-500">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 uppercase tracking-wider text-[10px] font-bold mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0F4C81]"
                    placeholder="Amul Butter 500g"
                    value={prodForm.productName}
                    onChange={(e) => setProdForm({ ...prodForm, productName: e.target.value })}
                  />
                  {formErrors.productName && <p className="text-red-550 text-[10px] mt-1 font-bold">{formErrors.productName}</p>}
                </div>

                <div>
                  <label className="block text-gray-400 uppercase tracking-wider text-[10px] font-bold mb-1">Local / Regional Alias</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0F4C81]"
                    placeholder="Kaju Makkhan / Chai Patti"
                    value={prodForm.localName}
                    onChange={(e) => setProdForm({ ...prodForm, localName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 uppercase tracking-wider text-[10px] font-bold mb-1">Stock Category *</label>
                  <select
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-slate-800 font-bold bg-white"
                    value={prodForm.category}
                    onChange={(e) => setProdForm({ ...prodForm, category: e.target.value as any })}
                  >
                    <option value="Grocery">Grocery</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Beverage">Beverage</option>
                    <option value="FMCG">FMCG</option>
                    <option value="Stationery">Stationery</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 uppercase tracking-wider text-[10px] font-bold mb-1">Billing Unit *</label>
                  <select
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-slate-800 font-bold bg-white"
                    value={prodForm.unit}
                    onChange={(e) => setProdForm({ ...prodForm, unit: e.target.value as any })}
                  >
                    <option value="kg">kg (Kilogram)</option>
                    <option value="litre">litre (Litre)</option>
                    <option value="piece">piece (Individual)</option>
                    <option value="packet">packet (Sachet/Roll)</option>
                    <option value="dozen">dozen (Twelve pack)</option>
                    <option value="box">box (Crate)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-400 uppercase tracking-wider text-[10px] font-bold mb-1">SKU identifier</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-slate-800 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#0F4C81]"
                    value={prodForm.sku}
                    onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-gray-400 uppercase tracking-wider text-[10px] font-bold mb-1">EAN/Barcode</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-slate-800 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#0F4C81]"
                    placeholder="8901..."
                    value={prodForm.barcode}
                    onChange={(e) => setProdForm({ ...prodForm, barcode: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-gray-400 uppercase tracking-wider text-[10px] font-bold mb-1">Store Shelf Location</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0F4C81]"
                    placeholder="Rack B-1"
                    value={prodForm.storageLocation}
                    onChange={(e) => setProdForm({ ...prodForm, storageLocation: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 uppercase tracking-wider text-[10px] font-bold mb-1">Purchase Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-slate-800 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#0F4C81]"
                    value={prodForm.purchasePrice || ""}
                    onChange={(e) => setProdForm({ ...prodForm, purchasePrice: parseFloat(e.target.value) || 0 })}
                  />
                  {formErrors.purchasePrice && <p className="text-red-550 text-[10px] mt-1 font-bold">{formErrors.purchasePrice}</p>}
                </div>

                <div>
                  <label className="block text-gray-400 uppercase tracking-wider text-[10px] font-bold mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-slate-800 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#0F4C81]"
                    value={prodForm.sellingPrice || ""}
                    onChange={(e) => setProdForm({ ...prodForm, sellingPrice: parseFloat(e.target.value) || 0 })}
                  />
                  {formErrors.sellingPrice && <p className="text-red-550 text-[10px] mt-1 font-bold">{formErrors.sellingPrice}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 uppercase tracking-wider text-[10px] font-bold mb-1 font-mono">Current Quantity *</label>
                  <input
                    type="number"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-slate-800 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#0F4C81]"
                    value={prodForm.currentStock || ""}
                    onChange={(e) => setProdForm({ ...prodForm, currentStock: parseInt(e.target.value) || 0 })}
                  />
                  {formErrors.currentStock && <p className="text-red-550 text-[10px] mt-1 font-bold">{formErrors.currentStock}</p>}
                </div>

                <div>
                  <label className="block text-gray-400 uppercase tracking-wider text-[10px] font-bold mb-1 font-mono">Min Stock Alert Threshold</label>
                  <input
                    type="number"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-slate-800 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#0F4C81]"
                    value={prodForm.minStockLevel || ""}
                    onChange={(e) => setProdForm({ ...prodForm, minStockLevel: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Show Expiry Picker ONLY if specific perishable category chosen */}
              {["Dairy", "FMCG", "Beverage", "Snacks"].includes(prodForm.category) && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <label className="block text-slate-700 uppercase tracking-wider text-[10px] font-extrabold mb-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#F5A623]" />
                    <span>Perishable Category Expiry Tracker</span>
                  </label>
                  <input
                    type="date"
                    className="w-full mt-1.5 px-3 py-2 rounded-lg border border-gray-200 text-slate-800 font-mono font-bold bg-white"
                    value={prodForm.expiryDate}
                    onChange={(e) => setProdForm({ ...prodForm, expiryDate: e.target.value })}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 uppercase tracking-wider text-[10px] font-bold mb-1">Selected Primary Supplier</label>
                  <select
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-slate-800 font-bold bg-white"
                    value={prodForm.supplierId}
                    onChange={(e) => setProdForm({ ...prodForm, supplierId: e.target.value })}
                  >
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.supplierName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 uppercase tracking-wider text-[10px] font-bold mb-1">Active Status</label>
                  <select
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-slate-800 font-bold bg-white"
                    value={prodForm.status}
                    onChange={(e) => setProdForm({ ...prodForm, status: e.target.value as any })}
                  >
                    <option value="active">Active (On Counter)</option>
                    <option value="seasonal">Seasonal Stock</option>
                    <option value="discontinued">Discontinued (Archived)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0F4C81] hover:bg-[#1A6DB5] text-white font-bold rounded-xl flex items-center gap-1"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>{editingProduct ? "Update Catalog Item" : "Register Product"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: QUICK STOCK INCREMENT */}
      {quickStockProduct && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4 font-sans backdrop-blur-xs">
          <div className="bg-white rounded-2xl border w-full max-w-sm p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-[#0F4C81] uppercase tracking-wider font-display">Quick SKU Stock Volume</h3>
              <button onClick={() => setQuickStockProduct(null)} className="p-1 text-gray-400 hover:text-gray-500 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 text-xs">
              <p className="text-gray-500 font-semibold">{quickStockProduct.productName}</p>
              <div className="flex items-center gap-5 my-4">
                <div className="text-center w-1/2 p-3 bg-gray-50 rounded-xl">
                  <span className="text-[9px] text-gray-400 block font-bold uppercase tracking-widest">Active Stock</span>
                  <span className="font-mono font-bold text-gray-800 text-base">{quickStockProduct.currentStock}</span>
                </div>
                <div className="w-1/2">
                  <label className="text-[9px] text-gray-400 block font-bold uppercase tracking-widest mb-1.5 font-mono">Target Count</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-xl text-center text-sm font-mono font-bold focus:ring-1 focus:ring-[#0F4C81]"
                    value={quickStockValue}
                    onChange={(e) => setQuickStockValue(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button onClick={() => setQuickStockProduct(null)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-150 text-gray-600 rounded-lg">Cancel</button>
              <button onClick={handleQuickStockSave} className="px-3 py-1.5 bg-[#0F4C81] hover:bg-[#1A6DB5] text-white font-bold rounded-lg shadow-sm">Save Adjustments</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
