import React, { useState } from "react";
import { Store, ShieldAlert, KeyRound } from "lucide-react";

interface AuthPageProps {
  login: (email: string, passwordStr: string, role: "owner" | "manager" | "staff") => Promise<void>;
}

export function AuthPage({ login }: AuthPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!email) {
      setErrorMsg("Please enter an email address.");
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password, "owner");
    } catch (err: any) {
      setErrorMsg(err.message || "Login failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 bg-[#166534] rounded-2xl shadow-md text-white mb-4">
          <Store className="w-8 h-8 text-[#F59E0B]" />
        </div>
        <h2 className="text-3xl font-extrabold text-[#166534] tracking-tight font-display">
          Sri Srinivasa Kirana & General Store
        </h2>
        <p className="mt-2 text-sm text-gray-600 px-4">
          Smart Inventory Management for Modern Retail Stores
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-gray-100 rounded-2xl sm:px-10">
          
          {errorMsg && (
            <div className="mb-4 p-3.5 text-xs rounded-xl border flex flex-col gap-2 bg-red-50 text-red-600 border-red-100">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-bold">Error Status</span>
              </div>
              <p className="leading-relaxed font-sans">{errorMsg}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleManualLogin}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                Store Email Address
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#166534] transition-transform duration-100"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#166534]"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 bg-[#166534] hover:bg-[#10B981] text-white text-sm font-semibold rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2 disabled:bg-gray-400 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              {submitting ? "Authenticating Owner..." : "Sign In to Owner Dashboard"}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
