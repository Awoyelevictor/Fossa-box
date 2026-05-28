import { useState } from "react";
import { 
  ArrowLeft, 
  AlertCircle, 
  Globe 
} from "lucide-react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

interface AuthProps {
  onBack: () => void;
  hideBack?: boolean;
}

export default function Auth({ onBack, hideBack }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError("Google Sign-In failed.");
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
