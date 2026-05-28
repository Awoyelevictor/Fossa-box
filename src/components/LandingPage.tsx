import { useState } from "react";
import { 
  LogIn, 
  UserPlus, 
  ArrowRight, 
  Layout, 
  ShieldCheck, 
  Sparkles, 
  Globe, 
  CheckCircle2,
  Lock
} from "lucide-react";
import Auth from "./Auth";

interface LandingPageProps {
  onStart: () => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  const [showAuth, setShowAuth] = useState(false);

  if (showAuth) {
    return (
      <div className="py-12">
        <Auth onBack={() => setShowAuth(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center -mt-20">
      <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 max-w-2xl px-4">
        <div className="inline-flex items-center justify-center p-4 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-200 mb-4">
          <Layout size={40} strokeWidth={2} />
        </div>
        
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Welcome to <span className="text-blue-600">FOSSA</span>
        </h1>
        
        <p className="text-slate-600 text-xl leading-relaxed">
          The ultimate form builder for academic institutions. Sign in with your university Google account to get started.
        </p>
        
        <div className="pt-8 w-full max-w-sm mx-auto">
          <Auth onBack={() => setShowAuth(false)} hideBack={true} />
        </div>
      </div>
    </div>
  );
}
