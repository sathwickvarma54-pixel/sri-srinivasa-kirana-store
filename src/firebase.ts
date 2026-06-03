// Mock Firebase implementation using localStorage to support offline usage
// and remove external dependencies.

// Strict Error Handling Types
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export const db = { type: "database" };
export const auth = { currentUser: { uid: "owner_uid", email: "owner@srisrinivasa.com" } };

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  console.error("Firestore Mock Error: ", error);
  throw error instanceof Error ? error : new Error(String(error));
}

export async function testConnection() {
  console.log("Firebase connection tested successfully (Mock mode).");
}

// --- AUTOMATED DEMO PURGE MIGRATION ---
const runPurgeMigration = () => {
  if (typeof window === "undefined" || !window.localStorage) return;
  const migrationKey = "kirana_demo_purge_migration_v5";
  if (localStorage.getItem(migrationKey)) return;

  console.log("Running automated migration to purge all demo/mock/sample records...");

  const wipeCollection = (key: string) => {
    let removedCount = 0;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const items = JSON.parse(raw);
        if (Array.isArray(items)) {
          removedCount = items.length;
        }
      } catch (e) {}
    }
    localStorage.setItem(key, "[]");
    return removedCount;
  };

  const productsRemoved = wipeCollection("kirana_db_products");
  const suppliersRemoved = wipeCollection("kirana_db_suppliers");
  const transactionsRemoved = wipeCollection("kirana_db_transactions");
  const notificationsRemoved = wipeCollection("kirana_db_notifications");

  // Clean settings if they have demo values
  const settingsRaw = localStorage.getItem("kirana_db_settings");
  if (settingsRaw) {
    try {
      const settings = JSON.parse(settingsRaw);
      if (Array.isArray(settings)) {
        let modified = false;
        const cleanedSettings = settings.map(item => {
          if (item.id === "store_config") {
            const cleanItem = { ...item };
            if (cleanItem.storeName === "Uma Maheshwara Kirana & General Stores" || cleanItem.storeName === "Uma Maheshwara Kirana") {
              cleanItem.storeName = "";
              modified = true;
            }
            if (cleanItem.address === "12-34, Main Road, Near Clock Tower, Anantapur, AP, India" || cleanItem.address === "12-34, Main Road, Near Clock Tower, Anantapur, AP") {
              cleanItem.address = "";
              modified = true;
            }
            if (cleanItem.gstNumber === "37ABCDE1234F1Z5") {
              cleanItem.gstNumber = "";
              modified = true;
            }
            return cleanItem;
          }
          return item;
        });
        if (modified) {
          localStorage.setItem("kirana_db_settings", JSON.stringify(cleanedSettings));
        }
      }
    } catch (e) {
      console.error("Failed to clean settings:", e);
    }
  }

  const summary = {
    productsRemoved,
    suppliersRemoved,
    transactionsRemoved,
    notificationsRemoved,
    timestamp: new Date().toISOString()
  };
  localStorage.setItem(migrationKey, JSON.stringify(summary));
  console.log("Automated purge migration completed successfully. Summary:", summary);
};

runPurgeMigration();

// --- LOCAL STORAGE HELPERS ---
function loadCollection(name: string): any[] {
  const val = localStorage.getItem(`kirana_db_${name}`);
  return val ? JSON.parse(val) : [];
}

function saveCollection(name: string, data: any[]) {
  localStorage.setItem(`kirana_db_${name}`, JSON.stringify(data));
}

function getProcessedData(collectionName: string, queryRef?: any) {
  let items = loadCollection(collectionName);
  if (queryRef && queryRef.constraints) {
    // Apply orderBy constraints
    const orderByConstraint = queryRef.constraints.find((c: any) => c.type === "orderBy");
    if (orderByConstraint) {
      const { field, direction } = orderByConstraint;
      items.sort((a, b) => {
        const valA = a[field];
        const valB = b[field];
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (valA < valB) return direction === "asc" ? -1 : 1;
        if (valA > valB) return direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    // Apply limit constraints
    const limitConstraint = queryRef.constraints.find((c: any) => c.type === "limit");
    if (limitConstraint) {
      items = items.slice(0, limitConstraint.count);
    }
  }
  return items;
}

// --- MOCK FIRESTORE API ---
export function collection(database: any, path: string) {
  return { type: "collection", path };
}

export function doc(...args: any[]): any {
  if (args[0] && args[0].type === "collection") {
    return {
      type: "document",
      collectionPath: args[0].path,
      docId: args[1]
    };
  }
  return {
    type: "document",
    collectionPath: args[1],
    docId: args[2]
  };
}

export async function addDoc(collectionRef: any, data: any) {
  const collectionName = collectionRef.path;
  const items = loadCollection(collectionName);
  const newId = Math.random().toString(36).substring(2, 15);
  const newItem = { id: newId, ...data };
  items.push(newItem);
  saveCollection(collectionName, items);
  notifyListeners(collectionName);
  return { id: newId };
}

export async function updateDoc(docRef: any, data: any) {
  const collectionName = docRef.collectionPath;
  const docId = docRef.docId;
  const items = loadCollection(collectionName);
  const idx = items.findIndex(item => item.id === docId);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...data };
    saveCollection(collectionName, items);
    notifyListeners(collectionName, docId);
  } else {
    // If it's settings/store_config, dynamically create it
    if (collectionName === "settings" || collectionName === "notifications") {
      items.push({ id: docId, ...data });
      saveCollection(collectionName, items);
      notifyListeners(collectionName, docId);
    } else {
      throw new Error(`Document ${docId} not found in collection ${collectionName}`);
    }
  }
}

export async function setDoc(docRef: any, data: any, options?: { merge?: boolean }) {
  const collectionName = docRef.collectionPath;
  const docId = docRef.docId;
  const items = loadCollection(collectionName);
  const idx = items.findIndex(item => item.id === docId);
  if (idx !== -1) {
    if (options?.merge) {
      items[idx] = { ...items[idx], ...data };
    } else {
      items[idx] = { id: docId, ...data };
    }
  } else {
    items.push({ id: docId, ...data });
  }
  saveCollection(collectionName, items);
  notifyListeners(collectionName, docId);
}

export async function deleteDoc(docRef: any) {
  const collectionName = docRef.collectionPath;
  const docId = docRef.docId;
  let items = loadCollection(collectionName);
  items = items.filter(item => item.id !== docId);
  saveCollection(collectionName, items);
  notifyListeners(collectionName, docId);
}

export async function getDoc(docRef: any) {
  const collectionName = docRef.collectionPath;
  const docId = docRef.docId;
  const items = loadCollection(collectionName);
  const item = items.find(i => i.id === docId);
  return {
    exists: () => !!item,
    id: docId,
    data: () => item
  };
}

export async function getDocs(queryRef: any) {
  const collectionName = queryRef.path || queryRef.collectionPath;
  const items = loadCollection(collectionName);
  return {
    empty: items.length === 0,
    forEach: (callback: (doc: any) => void) => {
      items.forEach(item => {
        callback({
          id: item.id,
          data: () => item
        });
      });
    }
  };
}

export function query(collectionRef: any, ...constraints: any[]) {
  return {
    type: "query",
    path: collectionRef.path,
    constraints
  };
}

export function orderBy(field: string, direction: "asc" | "desc" = "asc") {
  return { type: "orderBy", field, direction };
}

export function limit(count: number) {
  return { type: "limit", count };
}

// --- REALTIME LISTENERS REGISTRY ---
interface Listener {
  id: string;
  ref: any;
  callback: any;
}
const listeners: Listener[] = [];

export function onSnapshot(ref: any, callback: any, errorCallback?: any) {
  const listenerId = Math.random().toString(36).substring(2);
  listeners.push({ id: listenerId, ref, callback });

  try {
    triggerListener(ref, callback);
  } catch (err) {
    if (errorCallback) errorCallback(err);
  }

  return () => {
    const idx = listeners.findIndex(l => l.id === listenerId);
    if (idx !== -1) {
      listeners.splice(idx, 1);
    }
  };
}

function triggerListener(ref: any, callback: any) {
  if (ref.type === "document") {
    const items = loadCollection(ref.collectionPath);
    const item = items.find(i => i.id === ref.docId);
    callback({
      exists: () => !!item,
      id: ref.docId,
      data: () => item
    });
  } else {
    const collectionName = ref.path;
    const items = getProcessedData(collectionName, ref);
    const snapshot = {
      forEach: (cb: any) => {
        items.forEach(item => {
          cb({
            id: item.id,
            data: () => item
          });
        });
      },
      empty: items.length === 0,
      docs: items.map(item => ({
        id: item.id,
        data: () => item
      }))
    };
    callback(snapshot);
  }
}

function notifyListeners(collectionName: string, docId?: string) {
  listeners.forEach(l => {
    if (l.ref.type === "document") {
      if (l.ref.collectionPath === collectionName && (!docId || l.ref.docId === docId)) {
        triggerListener(l.ref, l.callback);
      }
    } else {
      if (l.ref.path === collectionName) {
        triggerListener(l.ref, l.callback);
      }
    }
  });
}

// --- BATCH WRITE API ---
export function writeBatch(dbInstance: any) {
  const ops: Array<() => void> = [];
  return {
    set(docRef: any, data: any) {
      ops.push(() => {
        const collectionName = docRef.collectionPath;
        const docId = docRef.docId;
        const items = loadCollection(collectionName);
        const idx = items.findIndex(item => item.id === docId);
        if (idx !== -1) {
          items[idx] = { id: docId, ...data };
        } else {
          items.push({ id: docId, ...data });
        }
        saveCollection(collectionName, items);
      });
    },
    async commit() {
      ops.forEach(op => op());
      notifyListeners("products");
      notifyListeners("suppliers");
      notifyListeners("transactions");
      notifyListeners("notifications");
      notifyListeners("settings");
    }
  };
}

export const Timestamp = {
  now: () => ({
    toDate: () => new Date(),
    toMillis: () => Date.now(),
    toISOString: () => new Date().toISOString()
  })
};
