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
    <div className="max-w-md mx-auto my-16 app-card p-10">
      <div className="text-center mb-10">
        <div className="mx-auto w-16 h-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
          <KeyRound size={32} strokeWidth={2} />
        </div>
        <h3 className="section-title mb-2">
          Admin Login
        </h3>
        <p className="text-slate-600">
          Enter your administrator password to manage student feedback and suggestions.
        </p>
      </div>

      {errorText && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
          <p className="text-sm font-semibold text-red-800">{errorText}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700">
            Administrator Password
          </label>
          <div className="relative">
            <span className="absolute left-4 top-3 text-slate-400">
              <Lock size={18} />
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="app-input pl-12"
            />
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
          <ShieldCheck size={20} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-800 block mb-1">Authorized Access Only</span>
            Only FOSSA committee members or authorized faculty staff should attempt to login.
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="app-button-primary w-full py-4 text-lg"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <LogIn size={20} />
              Login to Dashboard
            </>
          )}
        </button>
      </form>
    </div>
  );
}
