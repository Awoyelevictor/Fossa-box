import { useState, FormEvent } from "react";
import { LogIn, ShieldCheck, Lock, AlertCircle, KeyRound } from "lucide-react";

interface AdminLoginProps {
  onLoginSuccess: (userEmail: string) => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorText(null);

    // Short timeout to simulate secure cryptographic hash transit
    setTimeout(() => {
      try {
        if (!password.trim()) {
          setErrorText("Please fill out the password field before submitting verification.");
          setLoading(false);
          return;
        }

        // Validate the admin password
        if (password === "admin123") {
          onLoginSuccess("admin@university.edu");
        } else {
          setErrorText("Access Denied: Invalid administrator password. Please check your credentials.");
        }
      } catch (err) {
        setErrorText("Authentication system encountered an internal fault.");
      } finally {
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="max-w-md mx-auto my-12 glass-card-premium rounded-3xl p-8 border border-white shadow-2xl relative overflow-hidden bg-white/80">
      {/* Decorative Neon Glimmer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[3px] bg-gradient-to-r from-transparent via-purple-600 to-transparent" />

      {/* Subtle background glow */}
      <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="text-center mb-8">
        <div className="mx-auto w-14 h-14 bg-purple-100 border border-purple-200 rounded-2xl flex items-center justify-center text-purple-600 mb-4 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
          <KeyRound size={26} strokeWidth={1.5} className="animate-pulse" />
        </div>
        <h3 className="text-2.5xl font-black font-sans text-slate-800 tracking-tight mb-2">
          Administrative Gateway
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          Access the authorized university feedback matrix dashboard with your system passcode.
        </p>
      </div>

      {errorText && (
        <div className="mb-6 p-4 bg-red-50 border border-red-250 rounded-2xl flex items-start gap-3 backdrop-blur-md">
          <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
          <p className="text-xs leading-relaxed text-red-800 font-semibold">{errorText}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-2 font-bold">
            Admin Password
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-3.5 text-slate-400">
              <Lock size={16} />
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter administrator password..."
              className="w-full glass-input text-slate-800 border-slate-300 rounded-2xl py-3 pl-11 pr-4 outline-none text-sm font-sans placeholder:text-slate-400 font-medium"
            />
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-[#f8fafc] rounded-2xl border border-slate-200 text-xs text-slate-600 leading-relaxed backdrop-blur-md">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
            <ShieldCheck size={14} className="text-purple-600" />
            Verification Guard
          </div>
          Only authorized FOSSA administrative committee or faculty staff members should attempt to gain platform clearance.
        </div>

        {/* Dynamic trigger buttons */}
        <button
          type="submit"
          disabled={loading}
          className="w-full jelly-glass-button jelly-button-purple text-white py-3.5 rounded-full text-sm font-extrabold flex items-center justify-center gap-3 cursor-pointer select-none transition-all duration-300 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <LogIn size={16} />
              Authenticate Console
            </>
          )}
        </button>
      </form>
    </div>
  );
}
