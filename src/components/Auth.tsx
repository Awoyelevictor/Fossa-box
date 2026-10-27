import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  AlertCircle,
  Mail,
  LockKeyhole,
  LoaderCircle,
  KeyRound
} from "lucide-react";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  type AuthError
} from "firebase/auth";
import { auth } from "../firebase";

interface AuthProps {
  onBack: () => void;
  hideBack?: boolean;
}

function getAuthMessage(error: unknown): string {
  const code = (error as AuthError | null)?.code || "";
  switch (code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Email or password is incorrect.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact the FOSSA administrator.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a little and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your internet connection and try again.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled in Firebase yet. The project owner must enable it in Firebase Authentication settings.";
    case "auth/invalid-api-key":
      return "FOSSA's Firebase configuration is invalid. Contact the project administrator.";
    default:
      console.error("FOSSA email authentication error:", error);
      return `Sign-in failed (${code || "unknown error"}). Please try again or contact the administrator.`;
  }
}

export default function Auth({ onBack, hideBack }: AuthProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: unknown) {
      setError(getAuthMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Enter your email address above first, then select Forgot password.");
      return;
    }
    setResetLoading(true);
    setError(null);
    setNotice(null);
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      setNotice("If an account exists for that email, Firebase will send a password-reset link.");
    } catch (err: unknown) {
      setError(getAuthMessage(err));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto animate-in fade-in zoom-in-95 duration-300">
      {!hideBack && (
        <button
          onClick={onBack}
          type="button"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      )}

      <div className="app-card p-8 sm:p-10 shadow-xl border-slate-200">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <KeyRound size={27} />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">
            Admin sign in
          </h2>
          <p className="text-slate-500 max-w-xs mx-auto">
            Sign in with the email and password provided by your FOSSA administrator.
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-5 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex gap-3 items-start">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}
        {notice && (
          <div role="status" className="mb-5 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm font-semibold">
            {notice}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="fossa-email" className="block text-sm font-bold text-slate-700 mb-2">Email address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="fossa-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="fossa-password" className="block text-sm font-bold text-slate-700 mb-2">Password</label>
            <div className="relative">
              <LockKeyhole size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="fossa-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="text-right mt-2">
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={resetLoading || loading}
                className="text-sm font-bold text-blue-700 hover:text-blue-900 disabled:opacity-50"
              >
                {resetLoading ? "Sending reset link..." : "Forgot password?"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || resetLoading}
            className="w-full py-4 px-4 bg-blue-600 rounded-xl flex items-center justify-center gap-3 font-bold text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-60"
          >
            {loading ? (
              <>
                <LoaderCircle size={20} className="animate-spin" />
                Signing in...
              </>
            ) : "Sign in securely"}
          </button>
        </form>
        <p className="text-xs text-slate-500 text-center mt-5">
          Access is limited to approved FOSSA administrators. New accounts are created by the project owner.
        </p>
      </div>
    </div>
  );
}
