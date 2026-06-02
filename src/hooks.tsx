import { useEffect, useState } from "react";
import { 
  onSnapshot, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  writeBatch,
  Timestamp,
  getDoc
} from "firebase/firestore";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { db, auth, handleFirestoreError, OperationType } from "./firebase";
import { UserProfile, Product, Transaction, Supplier, Notification, StoreSettings } from "./types";

// Custom hook: Auth
export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch User Profile Document in real-time
        const profileRef = doc(db, "users", firebaseUser.uid);
        const unsubProfile = onSnapshot(profileRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (err) => {
          console.error("Error reading profile:", err);
          setLoading(false);
        });
        return () => unsubProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, passwordStr: string, role: "owner" | "manager" | "staff" = "owner") => {
    setLoading(true);
    const password = passwordStr;
    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (signInErr: any) {
        // Fallback: If user does not exist in Auth, create them!
        if (signInErr.code === "auth/user-not-found" || signInErr.code === "auth/invalid-credential") {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
        } else {
          throw signInErr;
        }
      }

      const uid = userCredential.user.uid;
      // Ensure profile doc exists in Firebase
      const profileRef = doc(db, "users", uid);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        await setDoc(profileRef, {
          id: uid,
          name: email.split('@')[0] || "Store User",
          email: email,
          phone: "+91 0000000000",
          role: "owner",
          storeId: "store_main",
          createdAt: new Date().toISOString()
        });
      } else {
        // Force upgrade all profiles to owner to merge roles
        const currentData = profileSnap.data();
        if (currentData && currentData.role !== "owner") {
          await setDoc(profileRef, { role: "owner" }, { merge: true });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "users");
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const uid = userCredential.user.uid;
      const email = userCredential.user.email || "";
      
      const profileRef = doc(db, "users", uid);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        await setDoc(profileRef, {
          id: uid,
          name: userCredential.user.displayName || "Ramesh Kumar (Owner)",
          email: email,
          phone: userCredential.user.phoneNumber || "+91 9876543210",
          role: "owner",
          storeId: "store_main",
          createdAt: new Date().toISOString()
        });
      } else {
        const currentData = profileSnap.data();
        if (currentData && currentData.role !== "owner") {
          await setDoc(profileRef, { role: "owner" }, { merge: true });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "users");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return { user, profile, loading, login, loginWithGoogle, logout };
}

// Custom hook: Products
export function useProducts(enabled: boolean = false) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, "products"), orderBy("productName", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "products");
    });

    return () => unsubscribe();
  }, [enabled]);

  return { products, loading };
}

// Custom hook: Transactions
export function useTransactions(enabled: boolean = false, limitCount?: number) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = collection(db, "transactions");
    const q = limitCount 
      ? query(ref, orderBy("timestamp", "desc"), limit(limitCount))
      : query(ref, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Transaction[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      setTransactions(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "transactions");
    });

    return () => unsubscribe();
  }, [enabled, limitCount]);

  return { transactions, loading };
}

// Custom hook: Suppliers
export function useSuppliers(enabled: boolean = false) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setSuppliers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, "suppliers"), orderBy("supplierName", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Supplier[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Supplier);
      });
      setSuppliers(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "suppliers");
    });

    return () => unsubscribe();
  }, [enabled]);

  return { suppliers, loading };
}

// Custom hook: Notifications
export function useNotifications(enabled: boolean = false) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, "notifications"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Notification[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Notification);
      });
      setNotifications(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "notifications");
    });

    return () => unsubscribe();
  }, [enabled]);

  return { notifications, loading };
}

// Custom hook: Gemini AI calls with loading/error state
export function useGemini(storeSettings?: StoreSettings | null) {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async (cardType: "forecast" | "expiry" | "slow-stock" | "health-summary", payload: any) => {
    setAnalyzing(true);
    setError(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (storeSettings?.openRouterApiKey) {
        headers["x-openrouter-api-key"] = storeSettings.openRouterApiKey;
      }
      if (storeSettings?.nvidiaApiKey) {
        headers["x-nvidia-api-key"] = storeSettings.nvidiaApiKey;
      }

      const response = await fetch(`/api/insights/${cardType}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "AI service temporarily unavailable. Please try again.");
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      console.error(`Gemini integration error on ${cardType}:`, err);
      setError(err?.message || "AI service temporarily unavailable. Please try again.");
      throw err;
    } finally {
      setAnalyzing(false);
    }
  };

  return { analyzing, error, runAnalysis };
}

// --- DB SEEDING FUNCTION ---
export async function seedDatabaseIfEmpty() {
  try {
    const productsRef = collection(db, "products");
    const querySnapshot = await getDocs(productsRef);
    if (!querySnapshot.empty) {
      console.log("Database already contains data. Skipping seed.");
      return;
    }

    console.log("Seeding Database...");
    const batch = writeBatch(db);

    // 1. Seed Suppliers
    const suppliersData = [
      {
        id: "sup_1",
        supplierName: "Srinivas FMCG Distributors",
        phone: "+91 9440156789",
        whatsapp: "+91 9440156789",
        address: "D.No 4-50, Main Bazaar, Visakhapatnam, AP",
        products: ["Amul Butter", "Aashirvaad Atta", "Fortune Oil", "Dairy Milk", "Maggi 70g"],
        pendingAmount: 18500,
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "sup_2",
        supplierName: "Vizag Wholesale Traders",
        phone: "+91 9885012345",
        whatsapp: "+91 9885012345",
        address: "Sector 3, Gajuwaka Market, Visakhapatnam",
        products: ["Tata Salt", "Colgate Premium", "Vim Bar", "Lays Classic", "Parle-G"],
        pendingAmount: 7200,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "sup_3",
        supplierName: "Laxmi General Stores & Co.",
        phone: "+91 8123456789",
        whatsapp: "+91 8123456789",
        address: "Subhash Road, Koti, Hyderabad",
        products: ["Good Day Cookies", "Bournvita", "Red Label Tea", "Dettol Liquid", "Classmate Book"],
        pendingAmount: 0,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    suppliersData.forEach((sup) => {
      batch.set(doc(db, "suppliers", sup.id), sup);
    });

    // 2. Seed realistic Products (25 items)
    // Helper to calculate relative date (days offset)
    const getFutureDate = (daysOffset: number) => {
      const d = new Date();
      d.setDate(d.getDate() + daysOffset);
      return d.toISOString().split("T")[0];
    };

    const productsData: Partial<Product>[] = [
      { id: "p1", productName: "Amul Butter 500g", localName: "Amul Makkhan", category: "Dairy", sku: "DAI-AMUL-500", barcode: "8901262010115", unit: "piece", purchasePrice: 245, sellingPrice: 275, currentStock: 35, minStockLevel: 10, expiryDate: getFutureDate(10), supplierId: "sup_1", storageLocation: "Refrigerator Shelf A", status: "active" },
      { id: "p2", productName: "Parle-G 800g Superpack", localName: "Parle-G Biscuit", category: "Snacks", sku: "FMCG-PARLE-800", barcode: "8901109113221", unit: "packet", purchasePrice: 72, sellingPrice: 85, currentStock: 120, minStockLevel: 25, expiryDate: getFutureDate(120), supplierId: "sup_2", storageLocation: "Rack B-3", status: "active" },
      { id: "p3", productName: "Tata Salt 1kg", localName: "Tata Namak", category: "Grocery", sku: "GRO-TATA-1KG", barcode: "8901058002315", unit: "packet", purchasePrice: 22, sellingPrice: 28, currentStock: 60, minStockLevel: 15, expiryDate: null, supplierId: "sup_2", storageLocation: "Rack A-1", status: "active" },
      { id: "p4", productName: "Maggi 2-Min Noodles 70g", localName: "Maggi", category: "Snacks", sku: "FMCG-NEST-70G", barcode: "8901058895627", unit: "packet", purchasePrice: 11.5, sellingPrice: 14, currentStock: 4, minStockLevel: 30, expiryDate: getFutureDate(180), supplierId: "sup_1", storageLocation: "Rack B-1", status: "active" }, // trigger low stock
      { id: "p5", productName: "Aashirvaad Atta 5kg", localName: "Aashirvaad Gehu Atta", category: "Grocery", sku: "GRO-ITC-5KG", barcode: "8901725181222", unit: "packet", purchasePrice: 215, sellingPrice: 240, currentStock: 45, minStockLevel: 15, expiryDate: getFutureDate(90), supplierId: "sup_1", storageLocation: "Floor Rack A", status: "active" },
      { id: "p6", productName: "Fortune Mustard Oil 1L", localName: "Sarso ka tel", category: "Grocery", sku: "GRO-FOR-1L", barcode: "8906007282215", unit: "packet", purchasePrice: 145, sellingPrice: 165, currentStock: 22, minStockLevel: 12, expiryDate: getFutureDate(240), supplierId: "sup_1", storageLocation: "Floor Rack B", status: "active" },
      { id: "p7", productName: "Cadbury Dairy Milk 50g", localName: "Dairy Milk Chocolate", category: "Snacks", sku: "SNA-CAD-50G", barcode: "8901058002444", unit: "piece", purchasePrice: 34, sellingPrice: 40, currentStock: 50, minStockLevel: 15, expiryDate: getFutureDate(180), supplierId: "sup_1", storageLocation: "Checkout Counter Shelf", status: "active" },
      { id: "p8", productName: "Lays Classic Salted 26g", localName: "Lays Chips", category: "Snacks", sku: "SNA-PEPS-26G", barcode: "8901491101822", unit: "packet", purchasePrice: 8, sellingPrice: 10, currentStock: 80, minStockLevel: 20, expiryDate: getFutureDate(45), supplierId: "sup_2", storageLocation: "Hanging Grid C", status: "active" },
      { id: "p9", productName: "Colgate Strong Teeth 200g", localName: "Colgate Paste", category: "FMCG", sku: "FMCG-COL-200", barcode: "8901123004121", unit: "packet", purchasePrice: 94, sellingPrice: 108, currentStock: 25, minStockLevel: 8, expiryDate: getFutureDate(360), supplierId: "sup_2", storageLocation: "Toiletries Rack C-1", status: "active" },
      { id: "p10", productName: "Vim Dishwash Bar 200g", localName: "Vim Tikki", category: "FMCG", sku: "FMCG-VIM-200", barcode: "8901030752535", unit: "piece", purchasePrice: 17, sellingPrice: 20, currentStock: 5, minStockLevel: 20, expiryDate: null, supplierId: "sup_2", storageLocation: "Soap Rack D-2", status: "active" }, // trigger low stock
      
      { id: "p11", productName: "Good Day Cashew Cookies 100g", localName: "Good Day Kaju Biscuits", category: "Snacks", sku: "SNA-BRIT-100", barcode: "8901063142235", unit: "packet", purchasePrice: 16, sellingPrice: 20, currentStock: 44, minStockLevel: 15, expiryDate: getFutureDate(4), supplierId: "sup_3", storageLocation: "Rack B-2", status: "active" }, // trigger expiry soon (4 days)
      { id: "p12", productName: "Amul Taaza Milk 1L", localName: "Milk Packet", category: "Dairy", sku: "DAI-AMUL-TAAZA", barcode: "8901262010156", unit: "piece", purchasePrice: 62, sellingPrice: 68, currentStock: 30, minStockLevel: 12, expiryDate: getFutureDate(1), supplierId: "sup_1", storageLocation: "Refrigerator Row 1", status: "active" }, // trigger expiry tomorrow!
      { id: "p13", productName: "Thumbs Up Cola 250ml", localName: "Thumbs Up Cold Drink", category: "Beverage", sku: "BEV-COKE-250", barcode: "8901764042881", unit: "piece", purchasePrice: 16, sellingPrice: 20, currentStock: 110, minStockLevel: 24, expiryDate: getFutureDate(180), supplierId: "sup_1", storageLocation: "Drink Cooler Front", status: "active" },
      { id: "p14", productName: "Classmate Notebook Soft Cover", localName: "Classmate Notebook", category: "Stationery", sku: "STA-ITC-CLASS", barcode: "8901725121303", unit: "piece", purchasePrice: 48, sellingPrice: 60, currentStock: 30, minStockLevel: 10, expiryDate: null, supplierId: "sup_3", storageLocation: "Stationery Rack F", status: "active" },
      { id: "p15", productName: "Dettol Antiseptic Liquid 250ml", localName: "Dettol Dholan", category: "FMCG", sku: "FMCG-RB-250", barcode: "8901396348124", unit: "piece", purchasePrice: 124, sellingPrice: 140, currentStock: 18, minStockLevel: 5, expiryDate: getFutureDate(500), supplierId: "sup_3", storageLocation: "Toiletries Rack C-2", status: "active" },
      { id: "p16", productName: "Saffola Gold Blended Oil 1L", localName: "Saffola Oil", category: "Grocery", sku: "GRO-SAF-1L", barcode: "8901088062112", unit: "packet", purchasePrice: 165, sellingPrice: 185, currentStock: 25, minStockLevel: 8, expiryDate: getFutureDate(300), supplierId: "sup_1", storageLocation: "Floor Rack B", status: "active" },
      { id: "p17", productName: "Red Label Tea 250g", localName: "Chai Patti", category: "Beverage", sku: "BEV-HUL-RED", barcode: "8901030232449", unit: "packet", purchasePrice: 95, sellingPrice: 110, currentStock: 15, minStockLevel: 10, expiryDate: getFutureDate(270), supplierId: "sup_3", storageLocation: "Rack B-4", status: "active" },
      { id: "p18", productName: "Bournvita Health Drink 500g", localName: "Bournvita", category: "Beverage", sku: "BEV-MDZ-500", barcode: "8901058006124", unit: "packet", purchasePrice: 205, sellingPrice: 235, currentStock: 8, minStockLevel: 10, expiryDate: getFutureDate(150), supplierId: "sup_3", storageLocation: "Rack B-4", status: "active" }, // low stock
      { id: "p19", productName: "Dettol Liquid Handwash Hand Refill", localName: "Dettol Sabun Refill", category: "FMCG", sku: "FMCG-RB-REFILL", barcode: "8901396388414", unit: "packet", purchasePrice: 85, sellingPrice: 99, currentStock: 30, minStockLevel: 8, expiryDate: getFutureDate(360), supplierId: "sup_3", storageLocation: "Toiletries Rack C-1", status: "active" },
      { id: "p20", productName: "Vessel Clean Scrubber (Vim)", localName: "Vim Scrub", category: "FMCG", sku: "FMCG-SCRUB-1", barcode: "8901030800113", unit: "piece", purchasePrice: 12, sellingPrice: 15, currentStock: 60, minStockLevel: 15, expiryDate: null, supplierId: "sup_2", storageLocation: "Soap Rack D-3", status: "active" },

      { id: "p21", productName: "MTR Rava Idli Mix 500g", localName: "Idli Mix", category: "Grocery", sku: "GRO-MTR-RAVA", barcode: "8905204481123", unit: "packet", purchasePrice: 105, sellingPrice: 125, currentStock: 14, minStockLevel: 5, expiryDate: getFutureDate(30), supplierId: "sup_3", storageLocation: "Rack A-2", status: "active" },
      { id: "p22", productName: "Clinic Plus Shampoo 175ml", localName: "Shampoo Bottle", category: "FMCG", sku: "FMCG-HUL-CLIN", barcode: "8901030722135", unit: "piece", purchasePrice: 88, sellingPrice: 100, currentStock: 25, minStockLevel: 10, expiryDate: null, supplierId: "sup_2", storageLocation: "Toiletries Rack C-3", status: "active" },
      { id: "p23", productName: "Reynolds Fast Writer Blue Pen", localName: "Reynolds Pen", category: "Stationery", sku: "STA-REYN-BLUE", barcode: "8901452200115", unit: "piece", purchasePrice: 8, sellingPrice: 10, currentStock: 150, minStockLevel: 30, expiryDate: null, supplierId: "sup_3", storageLocation: "Stationery Rack F", status: "active" },
      { id: "p24", productName: "Haldiram Bhujia Sev 150g", localName: "Namkeen Sev", category: "Snacks", sku: "SNA-HALD-SEV", barcode: "8904063200115", unit: "packet", purchasePrice: 42, sellingPrice: 50, currentStock: 48, minStockLevel: 15, expiryDate: getFutureDate(40), supplierId: "sup_1", storageLocation: "Snack Counter Grid", status: "active" },
      { id: "p25", productName: "Brooke Bond Taj Mahal Tea 250g", localName: "Taj Chai Patti", category: "Beverage", sku: "BEV-HUL-TAJ", barcode: "8901030232450", unit: "packet", purchasePrice: 175, sellingPrice: 195, currentStock: 12, minStockLevel: 6, expiryDate: getFutureDate(100), supplierId: "sup_3", storageLocation: "Rack B-4", status: "active" }
    ];

    productsData.forEach((prod) => {
      const pFull: Product = {
        id: prod.id!,
        productName: prod.productName!,
        localName: prod.localName || "",
        category: prod.category as any,
        sku: prod.sku!,
        barcode: prod.barcode || "",
        unit: prod.unit as any,
        purchasePrice: prod.purchasePrice!,
        sellingPrice: prod.sellingPrice!,
        currentStock: prod.currentStock!,
        minStockLevel: prod.minStockLevel!,
        expiryDate: prod.expiryDate || null,
        supplierId: prod.supplierId!,
        storageLocation: prod.storageLocation || "Stockroom",
        status: prod.status as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      batch.set(doc(db, "products", pFull.id), pFull);
    });

    // 3. Seed 40 random transactions over last 30 days
    // A mix of inward (supplying stock) and outward (selling stock)
    const types: ("inward" | "outward" | "adjustment" | "damage" | "return")[] = [
      "outward", "outward", "outward", "inward", "outward", "outward", "damage"
    ];
    const notesPool = {
      outward: "Counter Sale - Customer paid cash/UPI",
      inward: "Bulk restocking from distributor",
      adjustment: "Store count reconciliation",
      damage: "Packet damaged in stockroom",
      return: "Customer return due to packing issue"
    };

    for (let i = 1; i <= 40; i++) {
      // Pick a random product from first 10
      const pIndex = Math.floor(Math.random() * 10);
      const pr = productsData[pIndex];
      const transType = i <= 25 ? "outward" : i <= 35 ? "inward" : types[i % types.length];
      const qty = transType === "inward" ? 20 + (i % 5) * 5 : 1 + (i % 5);
      const priceVal = transType === "inward" ? pr.purchasePrice! : pr.sellingPrice!;
      const daysAgo = 30 - Math.ceil((i * 28) / 40); // spread across 0 to 30 days ago
      
      const trans: Transaction = {
        id: `t_${i}`,
        type: transType,
        productId: pr.id!,
        productName: pr.productName!,
        quantity: qty,
        price: priceVal,
        supplierId: transType === "inward" ? pr.supplierId! : null,
        staffId: i % 2 === 0 ? "staff_user_id" : "manager_user_id",
        staffName: i % 2 === 0 ? "Amit Sharma" : "Suresh Patel",
        timestamp: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
        notes: notesPool[transType]
      };
      batch.set(doc(db, "transactions", trans.id), trans);
    }

    // 4. Seed 5 Notifications (2 low stock, 2 expiry, 1 system)
    const notificationsData: Notification[] = [
      {
        id: "not_1",
        type: "low_stock",
        message: "Inventory Alert: Maggi 2-Min Noodles 70g is running low (Current: 4, Reorder level: 30).",
        productId: "p4",
        isRead: false,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        severity: "warning"
      },
      {
        id: "not_2",
        type: "low_stock",
        message: "Inventory Alert: Vim Dishwash Bar 200g is critically low (Current: 5, Reorder level: 20).",
        productId: "p10",
        isRead: false,
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        severity: "critical"
      },
      {
        id: "not_3",
        type: "expiry",
        message: "Expiry Warning: Good Day Cashew Cookies 100g will expire in 4 days (Expiry: " + getFutureDate(4) + ").",
        productId: "p11",
        isRead: false,
        timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        severity: "critical"
      },
      {
        id: "not_4",
        type: "expiry",
        message: "Expiry Warning: Amul Taaza Milk 1L expires tomorrow (" + getFutureDate(1) + "). Recommend clearance discount.",
        productId: "p12",
        isRead: false,
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        severity: "critical"
      },
      {
        id: "not_5",
        type: "system",
        message: "System Setup: Welcome to Uma Maheshwara Kirana & General Stores — Complete offline-first prototype database bootstrapped successfully.",
        productId: null,
        isRead: false,
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        severity: "info"
      }
    ];

    notificationsData.forEach((not) => {
      batch.set(doc(db, "notifications", not.id), not);
    });

    // 5. Seed Store Settings
    const settingsObj: StoreSettings = {
      storeName: "Uma Maheshwara Kirana & General Stores",
      address: "12-34, Main Road, Near Clock Tower, Anantapur, AP, India",
      gstNumber: "37ABCDE1234F1Z5"
    };
    batch.set(doc(db, "settings", "store_config"), settingsObj);

    await batch.commit();
    console.log("Database seeded successfully with 25 products, 3 suppliers, 40 transactions, and 5 alerts.");
  } catch (error) {
    console.error("Failed to seed database:", error);
  }
}
