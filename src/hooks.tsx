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
  getDoc,
  db,
  handleFirestoreError,
  OperationType
} from "./firebase";
import { UserProfile, Product, Transaction, Supplier, Notification, StoreSettings } from "./types";

// Custom hook: Auth
export function useAuth() {
  const [user, setUser] = useState<{ uid: string; email: string } | null>(() => {
    const saved = localStorage.getItem("kirana_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("kirana_profile");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (email: string, passwordStr: string, role: "owner" | "manager" | "staff" = "owner") => {
    setLoading(true);
    try {
      if (
        (email === "owner@srisrinivasa.com" && passwordStr === "SriSrinivasa@2026") ||
        (email === "owner@umakirana.com" && passwordStr === "UmaKirana@2026")
      ) {
        const mockUser = { uid: "owner_uid", email };
        const mockProfile: UserProfile = {
          id: "owner_uid",
          name: "Srinivasa Rao (Owner)",
          email: email,
          phone: "+91 9876543210",
          role: "owner",
          storeId: "store_main",
          createdAt: new Date().toISOString()
        };
        setUser(mockUser);
        setProfile(mockProfile);
        localStorage.setItem("kirana_user", JSON.stringify(mockUser));
        localStorage.setItem("kirana_profile", JSON.stringify(mockProfile));
      } else {
        throw new Error("Invalid email or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem("kirana_user");
    localStorage.removeItem("kirana_profile");
  };

  return { user, profile, loading, login, logout };
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
  // Seeding disabled to prevent automatic settings recreation on page load.
  console.log("Database seeding check completed.");
}
