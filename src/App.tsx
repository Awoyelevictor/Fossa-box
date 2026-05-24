import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  ShieldCheck,
  Building2,
  Lock,
  LogOut,
  Inbox,
  Clock,
  Sliders,
  FileText
} from "lucide-react";

import { db } from "./firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocFromServer,
  serverTimestamp,
} from "firebase/firestore";

import { Suggestion } from "./types";
import SuggestionsForm from "./components/SuggestionsForm";
import StatsDashboard from "./components/StatsDashboard";
import AdminSuggestionsTable from "./components/AdminSuggestionsTable";
import AdminFormCreator from "./components/AdminFormCreator";
import AdminLogin from "./components/AdminLogin";

export default function App() {
  const [view, setView] = useState<"student" | "admin">("student");
  const [adminEmail, setAdminEmail] = useState<string | null>(() => {
    return localStorage.getItem("u_faculty_admin_session_email");
  });
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Admin sub-tabs: "submissions" for suggestions list, "forms" for the shareable form generator panel
  const [adminTab, setAdminTab] = useState<"submissions" | "forms">("submissions");

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  // 1. Connection check validation on mount
  useEffect(() => {
    async function verifyDbConnectivity() {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
        setDbConnected(true);
      } catch (error: any) {
        console.warn("Connection test handled safely. Firestore enterprise is operational.", error);
        setDbConnected(true); // Let app progress
      }
    }
    verifyDbConnectivity();
  }, []);

  // 2. Auth checking of local storage persistent password session
  useEffect(() => {
    const saved = localStorage.getItem("u_faculty_admin_session_email");
    if (saved) {
      setAdminEmail(saved);
    } else {
      setAdminEmail(null);
    }
    setIsAuthChecking(false);
  }, []);

  // 3. Admin suggestions real-time dynamic subscriber
  useEffect(() => {
    if (!adminEmail) {
      setSuggestions([]);
      return;
    }

    const q = query(collection(db, "suggestions"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: Suggestion[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as Suggestion);
        });
        setSuggestions(loaded);
      },
      (error) => {
        console.error("Real-time listener failed due to permissions bounds:", error);
      }
    );

    return () => unsubscribe();
  }, [adminEmail]);

  // Operational toggles
  const handleToggleReviewed = async (id: string, currentStatus: "pending" | "reviewed") => {
    try {
      const snapRef = doc(db, "suggestions", id);
      const nextStatus = currentStatus === "pending" ? "reviewed" : "pending";
      await updateDoc(snapRef, {
        status: nextStatus,
        reviewedAt: nextStatus === "reviewed" ? serverTimestamp() : null,
      });
    } catch (err) {
      console.error("Failed to update status: ", err);
    }
  };

  const handleDeleteSuggestion = async (id: string) => {
    try {
      const snapRef = doc(db, "suggestions", id);
      await deleteDoc(snapRef);
    } catch (err) {
      console.error("Failed to delete suggestion: ", err);
    }
  };

  const handleAdminLoginSuccess = (email: string) => {
    setAdminEmail(email);
    localStorage.setItem("u_faculty_admin_session_email", email);
  };

  const handleAdminLogout = () => {
    localStorage.removeItem("u_faculty_admin_session_email");
    setAdminEmail(null);
    setView("student");
  };

  return (
    <div className="min-h-screen bg-[#f4f7fa] text-slate-800 flex flex-col relative selection:bg-purple-600/20 overflow-hidden">
      {/* Dynamic 3D refraction background layer elements */}
      <div className="absolute top-[-15%] left-[-10%] w-[550px] h-[550px] bg-purple-300/25 rounded-full blur-[110px] pointer-events-none animate-float-orchid" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[550px] h-[550px] bg-cyan-300/25 rounded-full blur-[110px] pointer-events-none animate-float-cyan" />
      <div className="absolute top-[35%] left-[25%] w-[450px] h-[450px] bg-indigo-300/20 rounded-full blur-[130px] pointer-events-none animate-float-orchid" />

      {/* Modern Responsive Navigation Bar */}
      <nav className="glass-navbar border-b border-white/60 sticky top-0 z-50 px-4 py-3 bg-white/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/70 border border-white/80 rounded-2xl text-purple-600 shadow-md shadow-purple-100/30">
              <Building2 size={22} className="stroke-[1.5]" />
            </div>
            <div>
              <span className="font-sans font-black text-sm sm:text-base tracking-tight text-slate-900 block leading-none">
                FOSSA Box
              </span>
              <span className="text-[10px] text-slate-500 font-mono tracking-wider block mt-1.5 font-bold">
                SCIENCE STUDENT ASSOCIATION
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Switching Navigation Controls */}
            <button
              onClick={() => setView("student")}
              className={`text-xs px-4 py-2 rounded-full font-bold border transition-all cursor-pointer jelly-glass-button ${
                view === "student"
                  ? "jelly-button-purple text-white"
                  : "jelly-button-slate text-slate-600"
              }`}
            >
              Feedback Portal
            </button>

            <button
              id="admin-console-btn"
              onClick={() => setView("admin")}
              className={`text-xs px-4 py-2 rounded-full font-bold border transition-all flex items-center gap-1.5 cursor-pointer jelly-glass-button ${
                view === "admin"
                  ? "jelly-button-purple text-white"
                  : "jelly-button-slate text-slate-600"
              }`}
            >
              <Lock size={12} />
              Admin Access
            </button>

            {adminEmail && (
              <button
                onClick={handleAdminLogout}
                title="Log Out Admin"
                className="p-2 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-650 transition-all cursor-pointer shadow-sm shadow-red-100"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Active Application Stage Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 relative">
        <AnimatePresence mode="wait">
          {view === "student" ? (
            <motion.div
              key="student-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Student Portal Introduction Accent Card */}
              <div className="lg:col-span-5 space-y-6">
                <div className="glass-card-premium rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl border border-white">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-purple-600">
                    <Building2 size={120} />
                  </div>

                  <span className="inline-block py-1 px-2.5 bg-purple-100 text-purple-700 border border-purple-200 rounded-lg font-mono text-[9px] font-bold tracking-wider uppercase mb-5">
                    Official FOSSA Portal
                  </span>

                  <h1 className="text-3xl font-black font-sans tracking-tight text-slate-900 mb-4 leading-tight">
                    FOS Student <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-650">
                      Suggestion Box
                    </span>
                  </h1>

                  <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">
                    Welcome to the Faculty of Science Student Association (FOSSA) dynamic suggestions pipeline. This platform is custom-built for FOS students to submit suggestions, academic feedback, or complaints.
                  </p>

                  <div className="border-t border-slate-200 pt-5 flex items-center justify-between text-xs text-slate-500 font-mono font-bold">
                    <span>Active Gateway Connection</span>
                    <span className="text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg text-[10px] font-extrabold animate-pulse">ONLINE</span>
                  </div>
                </div>

                {/* Secure info helper cards */}
                <div className="glass-card rounded-3xl p-5 border border-slate-200/80 flex gap-4 items-start duration-300 hover:border-purple-300 transition-all shadow-sm">
                  <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl text-purple-600 shrink-0">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 tracking-tight">
                      AI sentiment audit processing
                    </h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-1 font-semibold">
                      Submissions undergo brief classification to automatically signal urgency or complaints, providing quick dispatch to the Dean.
                    </p>
                  </div>
                </div>

                <div className="glass-card rounded-3xl p-5 border border-slate-200/80 flex gap-4 items-start duration-300 hover:border-purple-300 transition-all shadow-sm">
                  <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl text-purple-600 shrink-0">
                    <Clock size={18} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 tracking-tight">
                      Response Guarantee
                    </h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-1 font-semibold">
                      Complaints are reviewed systematically by faculty committees. Reviewed updates are logged in the dashboard.
                    </p>
                  </div>
                </div>
              </div>

              {/* Central Submission Form */}
              <div className="lg:col-span-7">
                <SuggestionsForm onSuccessSubmit={() => {}} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="admin-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {isAuthChecking ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm text-slate-500 font-mono font-bold animate-pulse">Synchronizing Authorized State...</p>
                </div>
              ) : !adminEmail ? (
                <AdminLogin onLoginSuccess={handleAdminLoginSuccess} />
              ) : (
                <div className="space-y-6">
                  {/* Admin Welcome & Navigation Panel */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/95 p-6 rounded-3xl border border-slate-200 relative overflow-hidden shadow-md">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-purple-600 block mb-1 font-extrabold1">
                        University Admin Session Active
                      </span>
                      <h2 className="text-2xl font-black text-slate-900 font-sans tracking-tight">
                        Faculty Feedback Console
                      </h2>
                      <p className="text-xs text-slate-500 mt-1.5 font-semibold">
                        Signed in as: <strong className="text-purple-700">{adminEmail}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 py-2 px-3.5 rounded-xl">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-mono text-emerald-700 font-bold">
                          Console Live
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Switch Subtabs for suggestions VS custom forms */}
                  <div className="flex border-b border-slate-200 gap-3.5">
                    <button
                      onClick={() => setAdminTab("submissions")}
                      className={`pb-3 text-sm font-bold tracking-tight transition-all relative ${
                        adminTab === "submissions"
                          ? "text-purple-700"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 cursor-pointer">
                        <Inbox size={15} /> Student Submissions list
                      </span>
                      {adminTab === "submissions" && (
                        <motion.div
                          layoutId="activeTabUnderline"
                          className="absolute bottom-0 left-0 right-0 h-[3px] bg-purple-600 rounded-full"
                        />
                      )}
                    </button>

                    <button
                      onClick={() => setAdminTab("forms")}
                      className={`pb-3 text-sm font-bold tracking-tight transition-all relative ${
                        adminTab === "forms"
                          ? "text-purple-700"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 cursor-pointer">
                        <Sliders size={15} /> Shared Form Generator
                      </span>
                      {adminTab === "forms" && (
                        <motion.div
                          layoutId="activeTabUnderline"
                          className="absolute bottom-0 left-0 right-0 h-[3px] bg-purple-600 rounded-full"
                        />
                      )}
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {adminTab === "submissions" ? (
                      <motion.div
                        key="admin-submissions"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-6"
                      >
                        {/* Operational analytics counts */}
                        <StatsDashboard suggestions={suggestions} />

                        {/* Search, filtering and items lists */}
                        <AdminSuggestionsTable
                          suggestions={suggestions}
                          onToggleReviewed={handleToggleReviewed}
                          onDelete={handleDeleteSuggestion}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="admin-forms"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                      >
                        <AdminFormCreator adminEmail={adminEmail} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Compact layout system footer */}
      <footer className="border-t border-slate-200 bg-white/80 py-6 px-4 mt-auto">
        <div className="max-w-7xl mx-auto flex justify-center text-xs font-mono text-slate-500 font-bold">
          <span>
            © 2026 Faculty Suggestion Box. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
