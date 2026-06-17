import React, { useState, useEffect } from "react";
import { 
  useAuth, 
  useProducts, 
  useTransactions, 
  useSuppliers, 
  useNotifications, 
  useGemini, 
  seedDatabaseIfEmpty 
} from "./hooks";
import { AuthPage } from "./components/AuthPage";
import { DashboardView } from "./components/DashboardView";
import { ProductsView } from "./components/ProductsView";
import { TransactionsView } from "./components/TransactionsView";
import { SuppliersView } from "./components/SuppliersView";
import { AIInsightsView } from "./components/AIInsightsView";
import { ReportsView } from "./components/ReportsView";
import { NotificationsView } from "./components/NotificationsView";
import { SettingsView } from "./components/SettingsView";
import { Product, Transaction, Supplier, Notification, StoreSettings } from "./types";
import { 
  db, 
  handleFirestoreError, 
  OperationType,
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  onSnapshot 
} from "./firebase";
import toast, { Toaster } from "react-hot-toast";

// Icons for navigation
import { 
  LayoutDashboard, 
  Store, 
  ShoppingCart, 
  Truck, 
  Sparkles, 
  FileText, 
  Bell, 
  Settings, 
  LogOut,
  Building,
  Menu,
  X
} from "lucide-react";

export default function App() {
  const { user, profile, loading: authLoading, login, logout } = useAuth();

  const isAuthenticated = !!user && !!profile;
  const isOwnerOrManager = profile ? (profile.role === "owner" || profile.role === "manager") : false;

  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  const { products, loading: prodsLoading } = useProducts(isAuthenticated);
  const { transactions, loading: txsLoading } = useTransactions(isAuthenticated);
  const { suppliers, loading: supsLoading } = useSuppliers(isAuthenticated && isOwnerOrManager);
  const { notifications, loading: notifsLoading } = useNotifications(isAuthenticated);
  const { runAnalysis } = useGemini(storeSettings);

  // Auto-seed and real-time settings configurations on loading
  useEffect(() => {
    if (!isAuthenticated) {
      setStoreSettings(null);
      return;
    }

    if (isOwnerOrManager) {
      const checkAndSeed = async () => {
        await seedDatabaseIfEmpty();
      };
      checkAndSeed();
    }

    // Listen to real-time store settings
    const unsubSettings = onSnapshot(
      doc(db, "settings", "store_config"), 
      (snap) => {
        if (snap.exists()) {
          setStoreSettings(snap.data() as StoreSettings);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "settings/store_config");
      }
    );

    return () => unsubSettings();
  }, [isAuthenticated, isOwnerOrManager]);

  // Proactive Perishables expiry scan checker on products load
  useEffect(() => {
    if (products.length > 0 && notifications.length >= 0) {
      const todayStr = "2026-06-01";
      const todayNum = new Date(todayStr).getTime();
      
      const scanExpiry = async () => {
        for (const p of products) {
          if (!p.expiryDate) continue;
          const expNum = new Date(p.expiryDate).getTime();
          const diffDays = Math.ceil((expNum - todayNum) / (1000 * 60 * 60 * 24));
          
          if (diffDays >= 0 && diffDays <= 30) {
            const todayRealDateStr = new Date().toISOString().split("T")[0];
            const alreadyCreatedToday = notifications.some(n => 
              n.type === "expiry" && 
              n.productId === p.id && 
              n.timestamp.startsWith(todayRealDateStr)
            );

            if (!alreadyCreatedToday) {
              const severity = diffDays <= 7 ? "critical" : "warning";
              const message = `Expiry Alert: Perishable stock item ${p.productName} is expiring in ${diffDays} days (${p.expiryDate}). Organize clearance discounts.`;
              try {
                await addDoc(collection(db, "notifications"), {
                  type: "expiry",
                  message,
                  productId: p.id,
                  isRead: false,
                  timestamp: new Date().toISOString(),
                  severity
                });
              } catch (e) {
                console.error("Proactive alert generation failed:", e);
              }
            }
          }
        }
      };
      scanExpiry();
    }
  }, [products, notifications]);

  // Operational Database Callbacks
  const handleAddProduct = async (prod: Omit<Product, "id" | "createdAt" | "updatedAt">) => {
    try {
      await addDoc(collection(db, "products"), {
        ...prod,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      toast.success(`Successfully added product ${prod.productName}`);
    } catch (err: any) {
      toast.error(`Add product error: ${err.message}`);
    }
  };

  const handleEditProduct = async (productId: string, prod: Partial<Product>) => {
    try {
      const docRef = doc(db, "products", productId);
      await updateDoc(docRef, {
        ...prod,
        updatedAt: new Date().toISOString()
      });
      toast.success("Catalog stock updated successfully.");
    } catch (err: any) {
      toast.error(`Edit product error: ${err.message}`);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteDoc(doc(db, "products", productId));
      toast.success("Successfully removed item from database catalog.");
    } catch (err: any) {
      toast.error(`Delete product error: ${err.message}`);
    }
  };

  const handleRecordTransaction = async (tx: Omit<Transaction, "id" | "timestamp" | "staffId" | "staffName">) => {
    try {
      // 1. Log transaction
      const transDoc = await addDoc(collection(db, "transactions"), {
        ...tx,
        timestamp: new Date().toISOString(),
        staffId: profile?.id || "anonymous_staff",
        staffName: profile?.name || "FMCG Associate"
      });

      // 2. Adjust Product Quantity and check if min level alert triggers
      const pRef = doc(db, "products", tx.productId);
      const pSnap = await getDoc(pRef);
      if (pSnap.exists()) {
        const pData = pSnap.data();
        let currentLevel = pData.currentStock;
        
        if (tx.type === "inward" || tx.type === "return") {
          currentLevel += tx.quantity;
        } else {
          currentLevel -= tx.quantity;
        }

        await updateDoc(pRef, {
          currentStock: currentLevel,
          updatedAt: new Date().toISOString()
        });

        // 3. Side effect: create low stock warning alerts
        if (currentLevel <= pData.minStockLevel) {
          const warningSeverity = currentLevel === 0 ? "critical" : "warning";
          const messageStr = `Inventory Alert: Stock item ${pData.productName} is critically low (Quantity: ${currentLevel}, Min threshold: ${pData.minStockLevel}). Reorder soon.`;
          await addDoc(collection(db, "notifications"), {
            type: "low_stock",
            message: messageStr,
            productId: tx.productId,
            isRead: false,
            timestamp: new Date().toISOString(),
            severity: warningSeverity
          });
        }
      }

      toast.success("Transaction committed to active ledger.");
    } catch (err: any) {
      toast.error(`Record transaction failed: ${err.message}`);
    }
  };

  const handleAddSupplier = async (sup: Omit<Supplier, "id" | "createdAt">) => {
    try {
      await addDoc(collection(db, "suppliers"), {
        ...sup,
        createdAt: new Date().toISOString()
      });
      toast.success(`Distributor ${sup.supplierName} linked.`);
    } catch (err: any) {
      toast.error(`Add supplier error: ${err.message}`);
    }
  };

  const handleSettleSupplierBalance = async (supplierId: string) => {
    try {
      const docRef = doc(db, "suppliers", supplierId);
      await updateDoc(docRef, {
        pendingAmount: 0
      });
      toast.success("Distributor billing balance cleared cleanly.");
    } catch (err: any) {
      toast.error(`Settle ledger error: ${err.message}`);
    }
  };

  const handleUpdateStoreSettings = async (settings: StoreSettings) => {
    try {
      await updateDoc(doc(db, "settings", "store_config"), {
        ...settings
      });
      toast.success("Store config parameters saved.");
    } catch (err: any) {
      toast.error(`Settings update error: ${err.message}`);
    }
  };

  const handleMarkNotificationRead = async (notifId: string) => {
    try {
      const docRef = doc(db, "notifications", notifId);
      await updateDoc(docRef, {
        isRead: true
      });
    } catch (err: any) {
      console.error("Mark read error:", err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      const unreads = notifications.filter(n => !n.isRead);
      for (const n of unreads) {
        await updateDoc(doc(db, "notifications", n.id), { isRead: true });
      }
      toast.success("All alert notifications archived.");
    } catch (err: any) {
      console.error("Bulk resolve error:", err);
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      for (const n of notifications) {
        await deleteDoc(doc(db, "notifications", n.id));
      }
      toast.success("All notifications permanently deleted.");
    } catch (err: any) {
      toast.error(`Failed to clear notifications: ${err.message}`);
    }
  };

  // Quick Action triggering from low stock dashboard buttons
  const handleTriggerQuickRestockInward = async (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    try {
      await handleRecordTransaction({
        type: "inward",
        productId,
        productName: prod.productName,
        quantity: 50,
        price: prod.purchasePrice,
        supplierId: prod.supplierId || "sup_1",
        notes: "Automated quick stock reorder tick (+50 pieces)."
      });
    } catch (err: any) {
      toast.error(`Quick restock error: ${err.message}`);
    }
  };

  // 1. Loader screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex flex-col justify-center items-center font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0F4C81] mb-4" />
        <h3 className="text-sm font-semibold text-gray-500">Retrieving system states...</h3>
      </div>
    );
  }

  // 2. Auth Page
  if (!user || !profile) {
    return (
      <>
        <Toaster position="top-right" />
        <AuthPage login={login} />
      </>
    );
  }

  // Define navigation layout based on roles
  const navItems = [
    { id: "dashboard", label: "Operations", icon: LayoutDashboard, roles: ["owner", "manager", "staff"] },
    { id: "catalog", label: "SKU Catalog", icon: Store, roles: ["owner", "manager", "staff"] },
    { id: "transactions", label: "Billing lanes", icon: ShoppingCart, roles: ["owner", "manager", "staff"] },
    { id: "suppliers", label: "B2B Wholesellers", icon: Truck, roles: ["owner", "manager"] },
    { id: "ai_insights", label: "AI Intelligence", icon: Sparkles, roles: ["owner", "manager"] },
    { id: "reports", label: "Store Reports", icon: FileText, roles: ["owner", "manager"] },
    { id: "alerts", label: "Notification logs", icon: Bell, roles: ["owner", "manager", "staff"] },
    { id: "settings", label: "Configure Store", icon: Settings, roles: ["owner", "manager", "staff"] },
  ];

  const visibleNavs = navItems.filter(item => item.roles.includes(profile.role));
  const unreadAlertsCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans text-gray-900 leading-normal">
      <Toaster position="top-right" />

      {/* DESKTOP SIDEBAR NAVIGATION */}
      <aside className="w-60 bg-[#166534] text-[#DCF2E8] hidden md:flex flex-col justify-between shrink-0 h-screen sticky top-0 border-r border-[#14532D]/60 shadow-lg">
        <div>
          <div className="p-5 flex items-center gap-3 border-b border-white/10 bg-[#14532D]/45">
            <div className="w-10 h-10 bg-[#F59E0B] rounded-xl flex items-center justify-center shadow-md text-white shrink-0">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight font-display text-white">
                {storeSettings?.storeName ?? "Sri Venkateswara Kirana & General Store"}
              </h1>
              <span className="text-[9px] uppercase tracking-widest text-[#F59E0B] font-bold block leading-none mt-0.5">India B2B Retail</span>
            </div>
          </div>
          
          <nav className="px-3 space-y-1.5 mt-6 flex-1">
            <span className="text-[9px] font-extrabold text-[#DCF2E8]/40 block uppercase tracking-widest px-3 mb-2 font-mono">Main navigation</span>
            {visibleNavs.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between text-xs font-semibold tracking-wide transition-all ${
                    isActive 
                      ? "bg-[#F59E0B]/20 border-r-4 border-[#F59E0B] rounded-r-none rounded-l-lg text-white font-extrabold" 
                      : "text-[#DCF2E8]/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0 text-[#F59E0B]" />
                    <span>{item.label}</span>
                  </div>
                  {item.id === "alerts" && unreadAlertsCount > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold ${isActive ? "bg-white text-[#166534]" : "bg-[#EF4444] text-white"}`}>
                      {unreadAlertsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 mt-auto border-t border-white/10 bg-[#14532D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center font-extrabold text-white text-[11px] uppercase shadow-inner">
              {profile.name ? profile.name.slice(0, 2).toUpperCase() : "OP"}
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-white tracking-tight leading-none mb-0.5">
                {profile.name}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-[#F59E0B] font-mono font-bold leading-none">
                {profile.role}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 hover:bg-white/10 text-[#DCF2E8]/70 hover:text-white rounded-lg transition-colors"
            title="Logout Session"
          >
            <LogOut className="w-4 h-4 text-[#F59E0B]" />
          </button>
        </div>
      </aside>

      {/* RIGHT CONTENT WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP HEADER */}
        <header className="bg-white border-b border-gray-150 sticky top-0 z-40 px-4 md:px-8 py-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl border text-gray-500 md:hidden hover:bg-gray-50 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 border-l border-gray-250 pl-3 md:border-l-0 md:pl-0">
                <div className="p-2 bg-[#166534] rounded-xl text-white md:hidden animate-bounce">
                  <Store className="w-4 h-4 text-[#F59E0B]" />
                </div>
                <div>
                  <span className="text-[9px] font-extrabold text-[#166534] block uppercase tracking-widest font-mono">India B2B Retail</span>
                  <h1 className="text-sm font-bold text-[#166534] font-display">
                    {storeSettings?.storeName ?? "Sri Venkateswara Kirana & General Store"}
                  </h1>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-[10px] text-gray-400 tracking-wider uppercase font-mono font-extrabold">Live lanes</span>
                <span className="text-[11px] text-[#2A9D8F] flex items-center justify-end gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2A9D8F] animate-ping"></span> Cloud Firestore Status
                </span>
              </div>

              {/* Alert ticker unread badge box */}
              <button
                onClick={() => setActiveTab("alerts")}
                className="relative p-2 rounded-xl bg-gray-50 hover:bg-[#F0F4F8] border transition-colors shrink-0 text-slate-700"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadAlertsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-[#E63946] text-white flex items-center justify-center rounded-full text-[9px] font-mono font-extrabold">
                    {unreadAlertsCount}
                  </span>
                )}
              </button>

              <button
                onClick={logout}
                className="p-2 bg-red-50 hover:bg-red-100 text-[#E63946] border border-red-150 rounded-xl transition-all font-display uppercase tracking-wider text-[10px] flex items-center gap-1 shrink-0"
                title="Logout Session"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* MOBILE SLIDE-OUT OVERLAY */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden bg-black/60 flex backdrop-blur-xs font-sans">
            <div className="w-64 bg-white h-full p-6 space-y-4 flex flex-col justify-between shadow-2xl relative">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#166534] font-mono">B2B Mobile Hub</span>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded text-gray-400 hover:text-gray-650">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-1">
                  {visibleNavs.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between text-xs font-bold transition-all ${
                          isActive 
                            ? "bg-[#166534] text-white" 
                            : "text-gray-500 hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4.5 h-4.5 shrink-0" />
                          <span>{item.label}</span>
                        </div>
                        {item.id === "alerts" && unreadAlertsCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#EF4444] text-white">
                            {unreadAlertsCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl font-mono text-[9px] text-gray-400 text-center leading-relaxed">
                Sri Venkateswara Kirana (v1.0.0)<br />Secured sandbox.
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* MAIN BODY AREA */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto max-w-full">
          {activeTab === "dashboard" && (
            <DashboardView 
              products={products} 
              transactions={transactions} 
              onTriggerQuickRestock={handleTriggerQuickRestockInward}
              role={profile.role}
            />
          )}

          {activeTab === "catalog" && (
            <ProductsView 
              products={products} 
              transactions={transactions} 
              suppliers={suppliers} 
              onAddProduct={handleAddProduct}
              onEditProduct={handleEditProduct}
              onDeleteProduct={handleDeleteProduct}
              role={profile.role}
            />
          )}

          {activeTab === "transactions" && (
            <TransactionsView 
              products={products} 
              transactions={transactions} 
              suppliers={suppliers} 
              profile={profile}
              onRecordTransaction={handleRecordTransaction}
            />
          )}

          {activeTab === "suppliers" && (
            <SuppliersView 
              products={products} 
              transactions={transactions} 
              suppliers={suppliers} 
              onAddSupplier={handleAddSupplier}
              onSettleSupplierBalance={handleSettleSupplierBalance}
            />
          )}

          {activeTab === "ai_insights" && (
            <AIInsightsView 
              products={products} 
              transactions={transactions} 
              onCallGemini={runAnalysis}
            />
          )}

          {activeTab === "reports" && (
            <ReportsView 
              products={products} 
              transactions={transactions} 
            />
          )}

          {activeTab === "alerts" && (
            <NotificationsView 
              notifications={notifications} 
              onMarkRead={handleMarkNotificationRead}
              onMarkAllRead={handleMarkAllNotificationsRead}
              onClearAll={handleClearAllNotifications}
            />
          )}

          {activeTab === "settings" && (
            <SettingsView 
              profile={profile} 
              storeSettings={storeSettings} 
              onUpdateStoreSettings={handleUpdateStoreSettings}
              role={profile.role}
            />
          )}
        </main>
      </div>

      {/* MOBILE LOWER FOOTER TASK NAVIGATION (Only visible on screens < 768px for touch metrics) */}
      <footer className="md:hidden bg-white border-t border-gray-150 sticky bottom-0 z-40 px-3 py-2 flex items-center justify-around shrink-0 text-[10px] font-bold shadow-md select-none">
        {visibleNavs.slice(0, 4).map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 justify-center flex-1 py-1 px-1 rounded-xl transition-all ${
                isActive ? "text-[#166534]" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              <span className="truncate max-w-[55px] text-[9px] font-sans text-center leading-none">{item.label.split(" ")[0]}</span>
            </button>
          );
        })}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 justify-center flex-1 py-1 px-1 text-gray-400"
        >
          <Menu className="w-4.5 h-4.5" />
          <span className="text-[9px] font-sans leading-none">More</span>
        </button>
      </footer>
    </div>
  );
}
