import React, { useState } from "react";
import { Store, ShieldAlert, KeyRound, UserCheck, AlertCircle } from "lucide-react";
interface AuthPageProps {
  login: (email: string, passwordStr: string, role: "owner" | "manager" | "staff") => Promise<void>;
  loginWithGoogle: () => Promise<void>;
}

export function AuthPage({ login, loginWithGoogle }: AuthPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showConfigHint, setShowConfigHint] = useState(false);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setShowConfigHint(false);
    if (!email) {
      setErrorMsg("Please enter an email address.");
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password, "owner");
    } catch (err: any) {
      const isNotAllowed = err.message?.includes("operation-not-allowed") || err.code === "auth/operation-not-allowed";
      if (isNotAllowed) {
        setShowConfigHint(true);
        setErrorMsg("Email & Password provider is not enabled in Firebase Console. Please use 'Sign In with Google' below, which is configured out-of-the-box!");
      } else {
        setErrorMsg(err.message || "Login failed. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };



  const handleGoogleLogin = async () => {
    setErrorMsg("");
    setShowConfigHint(false);
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMsg(err.message || "Google Sign-In failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 bg-[#0F4C81] rounded-2xl shadow-md text-white mb-4">
          <Store className="w-8 h-8 text-[#F5A623]" />
        </div>
        <h2 className="text-3xl font-extrabold text-[#0F4C81] tracking-tight font-display">
          Sri Srinivasa Kirana & General Store
        </h2>
        <p className="mt-2 text-sm text-gray-600 px-4">
          Supercharge your Indian retail business with AI-powered stock intelligence
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-gray-100 rounded-2xl sm:px-10">
          
          {/* Main Google Sign-In as default pre-approved method */}
          <div className="mb-6">
            <button
              onClick={handleGoogleLogin}
              disabled={submitting}
              className="w-full py-3 px-4 bg-white hover:bg-gray-50 text-[15px] font-bold text-gray-700 border border-gray-300 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" width="24" height="24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.66.66-1.59 1.09-2.54 1.37z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span className="w-full border-b border-gray-100"></span>
              <span className="px-3 shrink-0 uppercase tracking-widest font-extrabold text-[9px] text-gray-400">or use single owner credentials</span>
              <span className="w-full border-b border-gray-100"></span>
            </div>
          </div>

          {errorMsg && (
            <div className={`mb-4 p-3.5 text-xs rounded-xl border flex flex-col gap-2 ${showConfigHint ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-red-50 text-red-600 border-red-100"}`}>
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-bold">{showConfigHint ? "Authentication Note" : "Error Status"}</span>
              </div>
              <p className="leading-relaxed font-sans">{errorMsg}</p>
              {showConfigHint && (
                <div className="mt-1 p-2 bg-amber-100/60 rounded-lg text-[11px] space-y-1.5 border border-amber-200/50">
                  <div className="font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    How to enable Email & Password in Firebase:
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-amber-900 leading-normal">
                    <li>Open the <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline font-bold text-[#0F4C81]">Firebase Console</a>.</li>
                    <li>Select your project and click on <b>Authentication</b> in the sidebar.</li>
                    <li>Go to the <b>Sign-in method</b> tab, click on <b>Add new provider</b>.</li>
                    <li>Choose <b>Email/Password</b>, enable it, and click <b>Save</b>.</li>
                  </ol>
                </div>
              )}
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
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C81] transition-transform duration-100"
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
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 bg-[#0F4C81] hover:bg-[#1A6DB5] text-white text-sm font-semibold rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2 disabled:bg-gray-400 cursor-pointer"
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
