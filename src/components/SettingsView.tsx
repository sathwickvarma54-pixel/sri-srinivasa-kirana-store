import React, { useState } from "react";
import { 
  Settings, 
  Store, 
  User, 
  Key, 
  CreditCard, 
  Check, 
  UserCheck, 
  Building, 
  Lock 
} from "lucide-react";
import { UserProfile, StoreSettings } from "../types";

interface SettingsViewProps {
  profile: UserProfile | null;
  storeSettings: StoreSettings | null;
  onUpdateStoreSettings: (settings: StoreSettings) => Promise<void>;
  role: "owner" | "manager" | "staff";
}

export function SettingsView({ 
  profile, 
  storeSettings, 
  onUpdateStoreSettings,
  role 
}: SettingsViewProps) {
  // Store form states
  const [storeName, setStoreName] = useState(storeSettings?.storeName || "Uma Maheshwara Kirana & General Stores");
  const [address, setAddress] = useState(storeSettings?.address || "12-34, Main Road, Near Clock Tower, Anantapur, AP");
  const [gst, setGst] = useState(storeSettings?.gstNumber || "37ABCDE1234F1Z5");
  const [nvidiaApiKey, setNvidiaApiKey] = useState(storeSettings?.nvidiaApiKey || "");
  const [openRouterApiKey, setOpenRouterApiKey] = useState(storeSettings?.openRouterApiKey || "");
  const [saving, setSaving] = useState(false);

  const canEditStore = role === "owner";

  const handleStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditStore) return;

    setSaving(true);
    try {
      await onUpdateStoreSettings({
        storeName,
        address,
        gstNumber: gst,
        nvidiaApiKey: nvidiaApiKey,
        openRouterApiKey: openRouterApiKey
      });
      alert("Settings saved successfully.");
    } catch (err: any) {
      alert("Failed to save store settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans text-xs">
      {/* Search Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-display">System Configuration</h1>
        <p className="text-xs text-gray-500 font-sans">Manage corporate GST invoices, update B2B accounts, and review security levels</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-medium text-gray-500">
        <div className="md:col-span-2 space-y-6">
          {/* Section 1: Store Properties Form (Only Owner can edit) */}
          <div className="bg-white p-5 border border-gray-150 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#0F4C81] uppercase tracking-wider flex items-center gap-1 font-display border-b pb-2">
              <Store className="w-4.5 h-4.5 text-[#F5A623]" />
              <span>Uma Maheshwara Kirana settings</span>
            </h3>

            {!canEditStore && (
              <div className="p-2.5 bg-amber-50 text-amber-705 rounded-xl border border-amber-100 flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                <span><b>Action Blocked:</b> Store profile configurations are restricted to Owner roles. Managers/Staff hold read-only parameters view.</span>
              </div>
            )}

            <form onSubmit={handleStoreSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Store / Wholeseller Corporate Title</label>
                <input
                  type="text"
                  disabled={!canEditStore}
                  className="w-full px-3 py-2 rounded-xl border font-bold text-slate-800 focus:ring-1 focus:ring-[#0F4C81] disabled:bg-gray-50 disabled:text-gray-400"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 font-sans">GST Billing Address</label>
                <input
                  type="text"
                  disabled={!canEditStore}
                  className="w-full px-3 py-2 rounded-xl border font-semibold text-slate-800 focus:ring-1 focus:ring-[#0F4C81] disabled:bg-gray-50 disabled:text-gray-400"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 font-mono">GSTIN / Corporate Tax PIN</label>
                <input
                  type="text"
                  disabled={!canEditStore}
                  className="w-full px-3 py-2 rounded-xl border font-mono font-bold text-slate-800 focus:ring-1 focus:ring-[#0F4C81] disabled:bg-gray-50 disabled:text-gray-400"
                  placeholder="37ABCDE1234F1Z5"
                  value={gst}
                  onChange={(e) => setGst(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 font-mono">OpenRouter API Key</label>
                <input
                  type="password"
                  disabled={!canEditStore}
                  className="w-full px-3 py-2 rounded-xl border font-mono font-semibold text-slate-800 focus:ring-1 focus:ring-[#0F4C81] disabled:bg-gray-50 disabled:text-gray-400 font-sans"
                  placeholder="sk-or-••••••••••••••••••••••••"
                  value={openRouterApiKey}
                  onChange={(e) => setOpenRouterApiKey(e.target.value)}
                />
                <p className="text-[10px] text-gray-400 mt-1 font-normal select-none">Enter your OpenRouter API Key to power the diagnostics engine. Leave blank to use system environments.</p>
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 font-mono">NVIDIA NIM API Key (Legacy/Alternative)</label>
                <input
                  type="password"
                  disabled={!canEditStore}
                  className="w-full px-3 py-2 rounded-xl border font-mono font-semibold text-slate-800 focus:ring-1 focus:ring-[#0F4C81] disabled:bg-gray-50 disabled:text-gray-400 font-sans"
                  placeholder="nvapi-••••••••••••••••••••••••"
                  value={nvidiaApiKey}
                  onChange={(e) => setNvidiaApiKey(e.target.value)}
                />
                <p className="text-[10px] text-gray-400 mt-1 font-normal select-none">Provides an alternate NVIDIA fallback key if preferred.</p>
              </div>

              {canEditStore && (
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#0F4C81] hover:bg-[#1A6DB5] text-white font-bold rounded-xl shadow-sm flex items-center gap-1 transition-transform uppercase tracking-wider text-[10px]"
                >
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{saving ? "Writing..." : "Save parameters"}</span>
                </button>
              )}
            </form>
          </div>

          {/* Section 2: Active User Session */}
          <div className="bg-white p-5 border border-gray-150 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#0F4C81] uppercase tracking-wider flex items-center gap-1 font-display border-b pb-2">
              <UserCheck className="w-5 h-5 text-[#2A9D8F]" />
              <span>Operator Session Diagnostics</span>
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold leading-relaxed text-gray-500">
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block text-[9px] uppercase tracking-wide mb-0.5">Active session username</span>
                <span className="font-bold text-slate-900">{profile?.name || "Store staff member"}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block text-[9px] uppercase tracking-wide mb-0.5 font-mono">Assigned role security level</span>
                <span className="font-extrabold text-[#0F4C81] uppercase tracking-wider">{profile?.role || "sales staff"}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block text-[9px] uppercase tracking-wide mb-0.5">Corporate email id</span>
                <span className="font-mono text-gray-700">{profile?.email || "Not specified"}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block text-[9px] uppercase tracking-wide mb-0.5">Primary telecom contact</span>
                <span className="font-mono text-gray-700">{profile?.phone || "+91 98765 43210"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reference Log parameters sidebar */}
        <div className="space-y-6">


          <div className="bg-[#FFFFFF] p-5 border border-gray-150 rounded-2xl flex items-center gap-3">
            <Building className="w-8 h-8 text-[#0F4C81]" />
            <div>
              <span className="text-gray-400 font-mono text-[9px] block uppercase tracking-wide">AI Engine deployment</span>
              <span className="text-xs text-slate-800 font-extrabold block mt-0.5">Google Cloud Run • Port 3000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
