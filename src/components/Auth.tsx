import { useEffect, useState } from "react";
import {
  ArrowLeft,
  AlertCircle,
  Globe
} from "lucide-react";
import {
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  type AuthError
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";

interface AuthProps {
  onBack: () => void;
  hideBack?: boolean;
}

function getSignInMessage(error: unknown): string {
  const code = (error as AuthError | null)?.code || "";
  switch (code) {
    case "auth/unauthorized-domain":
      return "This website domain is not authorized in Firebase. In Firebase Console, open Authentication → Settings → Authorized domains and add fossa-box.onrender.com.";
    case "auth/popup-blocked":
    case "auth/operation-not-supported-in-this-environment":
      return "Your browser blocked the Google sign-in popup. Open FOSSA in Chrome and try again.";
    case "auth/popup-closed-by-user":
      return "The Google sign-in window was closed before sign-in finished. Please try again.";
    case "auth/cancelled-popup-request":
      return "A sign-in window is already open. Finish it or close it, then try again.";
    case "auth/network-request-failed":
      return "Network error while contacting Google. Check your internet connection and try again.";
    case "auth/invalid-api-key":
      return "FOSSA's Firebase configuration is invalid. The site administrator needs to check the Firebase web app configuration.";
    case "auth/operation-not-allowed":
      return "Google sign-in is disabled for this Firebase project. Enable Google under Firebase Authentication → Sign-in method.";
    default:
      return `Google sign-in failed (${code || "unknown error"}). Open FOSSA in Chrome and try again. If it continues, send the error code to the administrator.`;
  }
}

export default function Auth({ onBack, hideBack }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getRedirectResult(auth).catch((err: unknown) => {
      if (active) {
        console.error("Google redirect sign-in failed:", err);
        setError(getSignInMessage(err));
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code = (err as AuthError | null)?.code || "";
      console.error("Google sign-in failed:", err);
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError: unknown) {
          console.error("Google redirect sign-in failed:", redirectError);
          setError(getSignInMessage(redirectError));
        }
      } else {
        setError(getSignInMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto animate-in fade-in zoom-in-95 duration-300">
      {!hideBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      )}

      <div className="app-card p-10 shadow-xl border-slate-200">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">
            Get Started
          </h2>
          <p className="text-slate-500 max-w-xs mx-auto">
            Use your Google account to access your workspace.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex gap-3 items-start animate-in shake">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          type="button"
          className="w-full py-4 px-4 bg-blue-600 rounded-xl flex items-center justify-center gap-3 font-bold text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
          ) : (
            <>
              <Globe size={20} />
              Continue with Google
            </>
          )}
        </button>
      </div>
    </div>
  );
}
