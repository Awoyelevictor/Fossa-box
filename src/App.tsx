import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Building2,
  LogOut,
  Inbox,
  Sliders,
  Plus,
  Wand2,
  Copy,
  Trash2,
  Image as ImageIcon,
  X,
  FileText,
  MoreVertical,
  Mic,
  Sparkles,
  Loader2
} from "lucide-react";

import { db, auth } from "./firebase";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  where,
  getDocs
} from "firebase/firestore";

import { Suggestion, FeedbackForm } from "./types";
import SuggestionsForm from "./components/SuggestionsForm";
import StatsDashboard from "./components/StatsDashboard";
import AdminSuggestionsTable from "./components/AdminSuggestionsTable";
import AdminFormCreator from "./components/AdminFormCreator";
import LandingPage from "./components/LandingPage";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [adminTab, setAdminTab] = useState<"dashboard" | "builder" | "responses">("dashboard");
  const [hasFormId, setHasFormId] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  
  const [savedForms, setSavedForms] = useState<FeedbackForm[]>([]);
  const [fetchingForms, setFetchingForms] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const [showTutorial, setShowTutorial] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFormInitialState, setGeneratedFormInitialState] = useState<any>(null);

  const getFallbackImage = (title: string = "") => {
    const t = (title || "").toLowerCase();
    if (t.includes("math") || t.includes("calc")) return "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=600&h=400";
    if (t.includes("science") || t.includes("bio") || t.includes("chem") || t.includes("phys")) return "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=600&h=400";
    if (t.includes("tech") || t.includes("code") || t.includes("software")) return "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=600&h=400";
    if (t.includes("event") || t.includes("party")) return "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=600&h=400";
    if (t.includes("feedback") || t.includes("survey")) return "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&q=80&w=600&h=400";
    // Default academic/form aesthetic
    return "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=600&h=400";
  };

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setHasFormId(params.has("formId"));

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthChecking(false);
      
      if (currentUser) {
        const hasSeen = localStorage.getItem("fossa_tutorial_seen");
        if (!hasSeen) {
          setShowTutorial(true);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const dismissTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem("fossa_tutorial_seen", "true");
  };

  const [editingFormId, setEditingFormId] = useState<string | null>(null);

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/generate-full-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      
      if (response.ok) {
         const data = await response.json();
         setGeneratedFormInitialState(data);
         setShowAiModal(false);
         setAiPrompt("");
         setEditingFormId(null);
         setAdminTab("builder");
      } else {
         const errData = await response.json().catch(() => ({}));
         alert(errData.error || "Failed to generate form. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate form. Please check your network and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditForm = (id: string) => {
    setEditingFormId(id);
    setAdminTab("builder");
  };

  useEffect(() => {
    if (!user) {
      setSavedForms([]);
      return;
    }

    setFetchingForms(true);
    const q = query(
      collection(db, "forms"),
      where("createdBy", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: FeedbackForm[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as FeedbackForm);
        });
        setSavedForms(loaded);
        setFetchingForms(false);
      },
      (error) => {
        console.error("Forms listener failed:", error);
        setFetchingForms(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
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
        console.error("Suggestions listener failed:", error);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

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
      await deleteDoc(doc(db, "suggestions", id));
    } catch (err) {
      console.error("Failed to delete suggestion: ", err);
    }
  };

  const handleDeleteForm = async (id: string) => {
    if (!confirm("Permanently delete this form? All responses will be lost.")) return;
    try {
      await deleteDoc(doc(db, "forms", id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const copyToClipboard = (id: string) => {
    const origin = window.location.origin;
    const shareableLink = `${origin}/?formId=${id}`;
    navigator.clipboard.writeText(shareableLink).then(() => {
      alert("Copied link to clipboard!");
    });
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#f0ebf8] flex flex-col items-center justify-center p-4 antialiased">
        <div className="w-12 h-12 border-4 border-[#673ab7] border-t-transparent rounded-full animate-spin mb-4" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0ebf8] text-slate-900 flex flex-col relative selection:bg-purple-100 antialiased font-sans">
      <nav className="sticky top-0 z-40 bg-white border-b border-slate-300 shadow-sm relative">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setAdminTab("dashboard")}
          >
            <div className="p-2 bg-[#673ab7] rounded-lg text-white shadow">
              <Building2 size={24} strokeWidth={2.5} />
            </div>
            <div className="hidden sm:block">
              <span className="font-black text-xl tracking-tighter text-slate-900 block leading-none">
                FOSSA
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest block mt-1 font-black">
                Form Builder
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3 relative z-50">
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
                   <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                   <span className="text-xs font-bold text-slate-600 max-w-[150px] truncate">
                     {user.displayName || user.email}
                   </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs flex items-center gap-2 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {hasFormId ? (
            <motion.div
              key="form-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto"
            >
              <SuggestionsForm onSuccessSubmit={() => {}} />
            </motion.div>
          ) : user ? (
            <motion.div
              key="admin-flow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8 relative"
            >
              {showTutorial && adminTab === "dashboard" && (
                <div className="fixed inset-0 z-50 pointer-events-none">
                  <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm pointer-events-auto" onClick={dismissTutorial} />
                  <div className="absolute top-48 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-10 md:right-[20%] flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-5 pointer-events-auto">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-xs text-center relative border border-purple-100">
                      <button onClick={dismissTutorial} className="absolute top-3 right-3 text-slate-400 hover:text-slate-700">
                         <X size={16} />
                      </button>
                      <Wand2 size={32} className="mx-auto mb-4 text-[#673ab7]" />
                      <h3 className="font-bold text-lg mb-2 text-slate-900">Try AI Form Generation!</h3>
                      <p className="text-sm text-slate-600 mb-4">Click here to generate a full form instantly using a single prompt.</p>
                      <button onClick={dismissTutorial} className="bg-[#673ab7] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#5e35b1]">Got it</button>
                    </div>
                    <svg width="60" height="80" viewBox="0 0 60 80" fill="none" className="text-white hidden sm:block" style={{ transform: "rotate(30deg) scaleX(-1)" }}>
                      <path d="M5 5Q60 40 10 75" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none"/>
                      <path d="M10 75L25 65M10 75L5 60" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none"/>
                    </svg>
                  </div>
                </div>
              )}

              {showAiModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
                  <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAiModal(false)} />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-slate-200"
                  >
                     <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-[#673ab7]/10 flex items-center justify-center">
                              <Sparkles size={20} className="text-[#673ab7]" />
                           </div>
                           <div>
                              <h3 className="font-bold text-slate-800 text-lg">Generate with AI</h3>
                              <p className="text-xs text-slate-500">Describe the form you want to create</p>
                           </div>
                        </div>
                        <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-slate-700 bg-white shadow-sm border border-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                           <X size={16} />
                        </button>
                     </div>
                     <div className="p-6 space-y-4">
                        <textarea 
                           className="w-full h-32 p-4 rounded-xl border border-slate-200 focus:border-[#673ab7] focus:ring-2 focus:ring-[#673ab7]/20 outline-none resize-none text-slate-700 placeholder:text-slate-400 text-lg"
                           placeholder="e.g. Create a feedback form for the Introduction to Computer Science course with questions about curriculum, instructor effectiveness, and overall experience..."
                           value={aiPrompt}
                           onChange={(e) => setAiPrompt(e.target.value)}
                           disabled={isGenerating}
                        />
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              <button type="button" className="p-2 text-slate-500 hover:text-[#673ab7] hover:bg-purple-50 rounded-lg transition-colors border border-transparent flex items-center gap-2">
                                <Mic size={18} />
                                <span className="text-sm font-medium hidden sm:inline">Voice</span>
                              </button>
                              <button type="button" className="p-2 text-slate-500 hover:text-[#673ab7] hover:bg-purple-50 rounded-lg transition-colors border border-transparent flex items-center gap-2">
                                <ImageIcon size={18} />
                                <span className="text-sm font-medium hidden sm:inline">Add Media</span>
                              </button>
                           </div>
                           <button 
                             onClick={handleAiGenerate}
                             disabled={isGenerating || !aiPrompt.trim()}
                             className="bg-[#673ab7] hover:bg-[#5e35b1] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-200"
                           >
                             {isGenerating ? (
                                <>
                                  <Loader2 size={18} className="animate-spin" />
                                  Generating...
                                </>
                             ) : (
                                <>
                                  <Sparkles size={18} />
                                  Generate Form
                                </>
                             )}
                           </button>
                        </div>
                     </div>
                  </motion.div>
                </div>
              )}

              {adminTab !== "builder" && (
                <div className="flex gap-4 p-1 w-fit mb-6 pb-2 w-full relative z-40">
                  <div className="flex gap-4">
                    <button
                      onClick={() => setAdminTab("dashboard")}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        adminTab === "dashboard"
                          ? "bg-white text-[#673ab7] shadow-lg shadow-purple-100/50"
                          : "text-slate-600 hover:bg-white/50"
                      }`}
                    >
                      <Sliders size={16} />
                      Dashboard
                    </button>
                    <button
                      onClick={() => setAdminTab("responses")}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        adminTab === "responses"
                          ? "bg-white text-[#673ab7] shadow-lg shadow-purple-100/50"
                          : "text-slate-600 hover:bg-white/50"
                      }`}
                    >
                      <Inbox size={16} />
                      Responses
                    </button>
                  </div>
                </div>
              )}

              <AnimatePresence mode="wait">
                {adminTab === "dashboard" ? (
                  <motion.div
                    key="dashboard-tab"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-12"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-[51]">
                       <button 
                         onClick={() => setAdminTab("builder")}
                         className="bg-white border text-left border-slate-300 p-8 rounded-xl hover:border-[#673ab7] hover:shadow-lg transition-all flex flex-col items-center justify-center gap-4 group h-48"
                       >
                         <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#673ab7]/10 transition-colors">
                           <Plus size={32} className="text-slate-400 group-hover:text-[#673ab7]" />
                         </div>
                         <div className="text-center">
                           <span className="block font-bold text-lg text-slate-800">Blank Form</span>
                           <span className="text-sm text-slate-500">Create a new form from scratch</span>
                         </div>
                       </button>

                       <button 
                         onClick={() => {
                            if (showTutorial) dismissTutorial();
                            setShowAiModal(true);
                         }}
                         className={`bg-gradient-to-br from-[#673ab7] to-[#4527a0] text-center p-8 rounded-xl hover:shadow-xl transition-all flex flex-col items-center justify-center gap-4 group h-48 ${showTutorial ? 'ring-4 ring-white shadow-2xl scale-[1.02] z-50' : ''}`}
                       >
                         <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                           <Wand2 size={32} className="text-white" />
                         </div>
                         <div className="text-center">
                           <span className="block font-bold text-lg text-white">Create with AI</span>
                           <span className="text-sm text-purple-200">Automatically generate form fields</span>
                         </div>
                       </button>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-6 font-sans flex items-center gap-2">
                        <FileText size={20} className="text-slate-500" /> Recent Forms
                      </h2>
                      {fetchingForms ? (
                        <div className="py-20 text-center text-slate-500">Loading forms...</div>
                      ) : savedForms.length === 0 ? (
                        <div className="py-20 text-center bg-white border border-slate-200 rounded-xl">
                          <p className="text-slate-500">No forms created yet. Start building!</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                           {savedForms.map(form => (
                             <div 
                               key={form.id} 
                               onClick={() => handleEditForm(form.id)}
                               className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full cursor-pointer relative"
                             >
                                <div className="h-32 bg-slate-100 relative border-b border-slate-100 overflow-hidden flex items-center justify-center">
                                  <img 
                                    src={form.mediaUrl || getFallbackImage(form.title)} 
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" 
                                    alt="Banner" 
                                  />
                                </div>
                                <div className="p-4 flex flex-col flex-1">
                                   <div className="flex items-start justify-between">
                                     <div className="flex-1 pr-2">
                                        <h3 className="font-bold text-slate-800 truncate mb-1" title={form.title || "Untitled form"}>{form.title || "Untitled form"}</h3>
                                        <p className="text-xs text-slate-500 line-clamp-2">{form.description || "No description provided."}</p>
                                     </div>
                                     <div className="relative">
                                       <button 
                                         onClick={(e) => { 
                                           e.stopPropagation(); 
                                           setActiveMenuId(activeMenuId === form.id ? null : form.id); 
                                         }}
                                         className="p-1 -mr-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded"
                                       >
                                         <MoreVertical size={16} />
                                       </button>
                                       {activeMenuId === form.id && (
                                         <div className="absolute top-full right-0 mt-1 w-36 bg-white border border-slate-200 shadow-xl rounded-lg overflow-hidden z-50">
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); copyToClipboard(form.id); setActiveMenuId(null); }}
                                              className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex items-center gap-2 text-slate-700 font-medium"
                                            >
                                              <Copy size={14} /> Copy Link
                                            </button>
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); handleDeleteForm(form.id); setActiveMenuId(null); }}
                                              className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm flex items-center gap-2 text-red-600 font-medium border-t border-slate-100"
                                            >
                                              <Trash2 size={14} /> Delete
                                            </button>
                                         </div>
                                       )}
                                     </div>
                                   </div>
                                </div>
                             </div>
                           ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : adminTab === "builder" ? (
                  <motion.div
                    key="builder-tab"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="-mx-4 sm:mx-0 shadow-lg rounded-xl overflow-hidden bg-white"
                  >
                    <AdminFormCreator 
                       adminId={user.uid} 
                       user={user}
                       initialFormState={generatedFormInitialState}
                       editingFormId={editingFormId || undefined}
                       onClearInitial={() => setGeneratedFormInitialState(null)}
                       onClose={() => {
                         setAdminTab("dashboard");
                         setEditingFormId(null);
                         setGeneratedFormInitialState(null);
                       }}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="responses-tab"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-8"
                  >
                    <StatsDashboard suggestions={suggestions} />
                    <AdminSuggestionsTable
                      suggestions={suggestions}
                      onToggleReviewed={handleToggleReviewed}
                      onDelete={handleDeleteSuggestion}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="landing-page"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LandingPage onStart={() => {/* auto start logic */}} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="py-12 border-t border-slate-300 mt-20">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12 text-slate-500">
           <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-black">
                <Building2 size={24} className="text-[#673ab7]" />
                <span>FOSSA</span>
              </div>
              <p className="max-w-xs text-sm leading-relaxed">
                The official academic form and feedback platform for the Faculty of Science Student Association.
              </p>
           </div>
        </div>
      </footer>
    </div>
  );
}
