/**
 * Shared Type Definitions for Uma Maheshwara Kirana & General Stores
 */

export interface UserProfile {
  id: string; // matches auth.uid
  name: string;
  email: string;
  phone: string;
  role: "owner" | "manager" | "staff";
  storeId: string;
  createdAt: string; // ISO date or ISO string
}

export interface Product {
  id: string;
  productName: string;
  localName: string;
  category: "Grocery" | "Dairy" | "Beverage" | "FMCG" | "Stationery" | "Snacks" | "Other";
  sku: string;
  barcode: string;
  unit: "kg" | "litre" | "piece" | "packet" | "dozen" | "box";
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  minStockLevel: number;
  expiryDate: string | null; // YYYY-MM-DD
  supplierId: string;
  storageLocation: string;
  status: "active" | "discontinued" | "seasonal";
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: "inward" | "outward" | "adjustment" | "damage" | "return";
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  supplierId: string | null;
  staffId: string;
  staffName: string;
  timestamp: string; // ISO string
  notes: string;
}

export interface Supplier {
  id: string;
  supplierName: string;
  phone: string;
  whatsapp: string;
  address: string;
  products: string[]; // string array of product IDs or names
  pendingAmount: number;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: "low_stock" | "expiry" | "out_of_stock" | "payment_due" | "system";
  message: string;
  productId: string | null;
  isRead: boolean;
  timestamp: string;
  severity: "info" | "warning" | "critical";
}

export interface StoreSettings {
  storeName: string;
  address: string;
  gstNumber: string;
  nvidiaApiKey?: string;
  openRouterApiKey?: string;
}
