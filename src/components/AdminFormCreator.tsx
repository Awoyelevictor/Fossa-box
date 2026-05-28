import { useState, useEffect, FormEvent, ChangeEvent, useRef } from "react";
import { 
  Copy, 
  Plus, 
  Trash2, 
  Image as ImageIcon,
  PlaySquare,
  Equal,
  GripHorizontal,
  Wand2,
  AlertCircle,
  MoreVertical,
  CheckCircle2,
  Settings as SettingsIcon,
  MessageSquare,
  Eye,
  LogOut,
  ChevronDown,
  Clock,
  ArrowLeft,
  Inbox,
  Share2,
  QrCode,
  X
} from "lucide-react";
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy, serverTimestamp, where, updateDoc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { FormField, FeedbackForm, Suggestion } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { User, signOut } from "firebase/auth";
import { QRCodeSVG } from "qrcode.react";

const FACULTIES_LIST = [
  "Computing Sciences",
  "Biological, Chemical & Food Sciences",
  "Physical & Mathematical Sciences"
];

const CATEGORIES_LIST = ["Suggestion", "Complaint", "Feedback", "Idea"];

export default function AdminFormCreator({ 
  adminId, 
  initialFormState, 
  onClearInitial,
  editingFormId,
  user,
  onClose
}: { 
  adminId: string, 
  initialFormState?: any, 
  onClearInitial?: () => void,
  editingFormId?: string,
  user: User | null,
  onClose?: () => void
}) {
  const [currentTab, setCurrentTab] = useState<"Questions" | "Responses" | "Settings">("Questions");
  const [formId, setFormId] = useState<string | null>(editingFormId || null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [allowedFaculty, setAllowedFaculty] = useState<string[]>(FACULTIES_LIST);
  const [allowAnonymity, setAllowAnonymity] = useState(true);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string>("header");

  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [responses, setResponses] = useState<any[]>([]);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing form data if editing
  useEffect(() => {
    const loadFormData = async () => {
      if (editingFormId) {
        const docRef = doc(db, "forms", editingFormId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setTitle(data.title || "");
          setDescription(data.description || "");
          setFields(data.fields || []);
          setMediaUrl(data.mediaUrl || null);
          setAllowAnonymity(data.allowAnonymity ?? true);
          setAllowedFaculty(data.allowedFaculty || FACULTIES_LIST);
          setFormId(editingFormId);
        }
      }
    };
    loadFormData();
  }, [editingFormId]);

  // Handle AI state
  useEffect(() => {
    if (initialFormState) {
      if (initialFormState.title) setTitle(initialFormState.title);
      if (initialFormState.description) setDescription(initialFormState.description);
      if (initialFormState.fields) {
        setFields(initialFormState.fields.map((f: any) => ({
          ...f,
          id: f.id || `field_${Math.random().toString(36).substring(2, 9)}`
        })));
      }
      if (onClearInitial) onClearInitial();
    }
  }, [initialFormState, onClearInitial]);

  // Load responses if on responses tab
  useEffect(() => {
    if (currentTab === "Responses" && formId) {
      const q = query(collection(db, "suggestions"), where("formId", "==", formId), orderBy("createdAt", "desc"));
      getDocs(q).then((snap) => {
        const loaded: any[] = [];
        snap.forEach(d => loaded.push({ id: d.id, ...d.data() }));
        setResponses(loaded);
      });
    }
  }, [currentTab, formId]);

  // Auto-save logic
  useEffect(() => {
    if (!formId) return;

    const timeout = setTimeout(async () => {
      setIsSaving(true);
      try {
        const payload = {
          title: (title || "").trim(),
          description: (description || "").trim(),
          fields: fields.map(f => ({
            id: f.id,
            type: f.type,
            label: f.label || "Untitled",
            required: !!f.required,
            options: f.options || []
          })),
          mediaUrl: mediaUrl || null,
          allowAnonymity: !!allowAnonymity,
          allowedFaculty: allowedFaculty || [],
          updatedAt: serverTimestamp(),
        };
        await updateDoc(doc(db, "forms", formId), payload);
      } catch (err) {
        console.error("Auto-save failed:", err);
      } finally {
        setIsSaving(false);
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeout);
  }, [title, description, fields, mediaUrl, allowAnonymity, allowedFaculty, formId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const resp = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!resp.ok) throw new Error("Upload failed");

      const data = await resp.json();
      const url = data.url;

      if (activeId === "header") {
        setMediaUrl(url);
      } else {
        updateField(activeId, { mediaUrl: url });
      }
    } catch (err) {
      console.error("Upload error:", err);
      setErrorText("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addField = (fieldType: FormField["type"]) => {
    const newId = `field_${Math.random().toString(36).substring(2, 9)}`;
    const newField: FormField = {
      id: newId,
      type: fieldType,
      label: "",
      required: false,
      options: fieldType === "multiple-choice" ? ["Option 1"] : undefined
    };
    const activeIndex = fields.findIndex(f => f.id === activeId);
    if (activeIndex >= 0) {
      const newFields = [...fields];
      newFields.splice(activeIndex + 1, 0, newField);
      setFields(newFields);
    } else {
      setFields([...fields, newField]);
    }
    setActiveId(newId);
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleCreateForm = async () => {
    if (formId) return; // Already saved/editing

    setErrorText(null);
    setSuccessMsg(null);

    if (!title.trim()) {
      setErrorText("Please provide a form title.");
      return;
    }

    setLoading(true);
    try {
      // Use Firestore to generate a unique ID if not already present
      const formsRef = collection(db, "forms");
      const docRef = doc(formsRef);
      const docId = docRef.id;

      const payload = {
        title: (title || "").trim(),
        description: (description || "").trim(),
        allowedFaculty: allowedFaculty || [],
        allowedCategories: CATEGORIES_LIST || [],
        allowAnonymity: !!allowAnonymity,
        type: "survey",
        mediaUrl: mediaUrl || null,
        fields: fields.map(f => ({
          id: f.id,
          type: f.type,
          label: f.label || "Untitled",
          required: !!f.required,
          options: f.options || []
        })),
        responseCount: 0,
        createdBy: adminId || "anonymous",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(docRef, payload);
      setFormId(docId);
      setSuccessMsg(`Form created successfully!`);
      setShowShareModal(true);
    } catch (err: any) {
      console.error("Save Form Error:", err);
      // Fallback message showing the error for user diagnostics
      setErrorText(`Could not save form: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    if (!formId) {
      alert("Please save the form first.");
      return;
    }
    window.open(`${window.location.origin}/?formId=${formId}`, "_blank");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId("share-link");
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const FloatingToolbar = ({ active }: { active: boolean }) => {
    if (!active || currentTab !== "Questions") return null;
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white p-2 flex flex-row items-center justify-around border-t border-slate-200 z-[60] shadow-[0_-4px_10px_rgba(0,0,0,0.05)] md:absolute md:top-0 md:-right-14 md:bottom-auto md:left-auto md:w-12 md:flex-col md:gap-1 md:border md:rounded-lg md:shadow-md md:z-10 md:justify-start">
        <button onClick={() => addField("multiple-choice")} className="p-2 text-slate-600 hover:bg-slate-100 rounded text-center flex items-center justify-center" aria-label="Add question"><Plus size={20}/></button>
        <button onClick={() => addField("text")} className="p-2 text-slate-600 hover:bg-slate-100 rounded font-serif font-bold text-lg leading-none flex items-center justify-center">Tt</button>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded flex items-center justify-center"
        >
          {uploading ? <Clock size={18} className="animate-spin" /> : <ImageIcon size={18}/>}
        </button>
        <button className="p-2 text-slate-600 hover:bg-slate-100 rounded flex items-center justify-center"><PlaySquare size={18}/></button>
        <button className="p-2 text-slate-600 hover:bg-slate-100 rounded flex items-center justify-center"><Equal size={18}/></button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f0ebf8] font-sans text-slate-900 pb-20 overflow-x-hidden">
      {/* App Header Strip */}
      <div className="sticky top-0 bg-white z-50 shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div className="w-10 h-10 bg-[#673ab7] rounded-lg flex items-center justify-center text-white font-bold text-xl shrink-0">F</div>
            <div className="min-w-0">
               <h1 className="text-lg font-medium text-slate-800 truncate">{title || "Untitled form"}</h1>
               <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                 {isSaving ? (
                    <span className="flex items-center gap-1"><Clock size={10} className="animate-spin" /> Saving...</span>
                 ) : (
                    <span>All changes saved</span>
                 )}
               </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button onClick={handlePreview} className="text-slate-600 hover:text-slate-900 p-2 hover:bg-slate-50 rounded-full transition-colors" title="Preview">
              <Eye size={20}/>
            </button>
            <button className="text-slate-600 hover:text-slate-900 p-2 hover:bg-slate-50 rounded-full transition-colors hidden sm:block">
              <SettingsIcon size={20}/>
            </button>
            <button 
              className="bg-[#673ab7] hover:bg-[#5e35b1] text-white px-4 py-2 sm:px-6 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center gap-2" 
              onClick={() => formId ? setShowShareModal(true) : handleCreateForm()} 
              disabled={loading}
            >
              {formId ? <Share2 size={16} /> : null}
              {formId ? "Share" : loading ? "Sending..." : "Send"}
            </button>
            
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-1 p-1 hover:bg-slate-100 rounded-full transition-all border border-transparent hover:border-slate-200"
              >
                <img 
                  src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || user?.email}&background=673ab7&color=fff`} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                />
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showProfileDropdown && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-[60]"
                  >
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                      <img 
                        src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || user?.email}&background=673ab7&color=fff`} 
                        alt="Profile" 
                        className="w-10 h-10 rounded-full border border-slate-100"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{user?.displayName || "Admin User"}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                      </div>
                    </div>
                    <div className="px-2 py-2">
                       <button className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-3 transition-colors">
                          <SettingsIcon size={16} /> Order Settings
                       </button>
                       <button className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-3 transition-colors">
                          <ImageIcon size={16} /> Branding Options
                       </button>
                    </div>
                    <div className="px-2 pt-2 border-t border-slate-100">
                       <button 
                        onClick={() => signOut(auth)}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-3 transition-colors"
                       >
                          <LogOut size={16} /> Sign out
                       </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        
        {/* Centered Tabs */}
        <div className="flex justify-center gap-10 px-6 border-b border-slate-300">
          {[
            { id: "Questions", icon: Plus },
            { id: "Responses", icon: MessageSquare },
            { id: "Settings", icon: SettingsIcon }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as any)}
              className={`pb-3 text-sm font-medium transition-colors flex items-center gap-2 ${currentTab === tab.id ? "text-[#673ab7] border-b-[3px] border-[#673ab7]" : "text-slate-600 hover:text-slate-800"}`}
            >
              {tab.id}
              {tab.id === "Responses" && responses.length > 0 && (
                <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{responses.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[770px] w-full mx-auto py-8 px-4 space-y-3">
        
        {currentTab === "Questions" && (
          <>
            {/* Header Card */}
            <div 
              onClick={() => setActiveId("header")}
              className={`relative bg-white rounded-lg transition-all cursor-pointer ${
                activeId === "header" ? "shadow-md" : "shadow-sm border border-slate-200"
              }`}
            >
              <div className="h-[10px] bg-[#673ab7] rounded-t-lg absolute top-0 left-0 right-0" />
              {activeId === "header" && (
                <div className="absolute top-[10px] left-0 bottom-0 w-[6px] bg-[#673ab7] rounded-bl-lg" />
              )}
              
              <FloatingToolbar active={activeId === "header"} />

              {mediaUrl && (
                <div className="relative group">
                  <img src={mediaUrl} alt="Form Header" className="w-full h-48 object-cover rounded-t-lg" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); setMediaUrl(null); }}
                    className="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-white text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className="p-8 pt-10">
                <input
                  className="w-full text-4xl font-normal text-slate-900 placeholder:text-slate-400 focus:outline-none border-b border-transparent focus:border-b-2 focus:border-[#673ab7] py-1 mb-2"
                  placeholder="Untitled form"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <textarea
                  className="w-full text-base text-slate-600 placeholder:text-slate-400 focus:outline-none border-b border-transparent focus:border-b-2 focus:border-[#673ab7] py-2 mt-2 resize-none leading-relaxed"
                  placeholder="Form description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={1}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                />
              </div>
            </div>

            {/* Questions Area */}
            {fields.map((field, idx) => {
              const isActive = activeId === field.id;
              return (
                <div 
                  key={field.id} 
                  onClick={() => setActiveId(field.id)}
                  className={`relative bg-white p-6 rounded-lg transition-all cursor-pointer ${
                    isActive ? "shadow-md" : "shadow-sm border border-slate-200"
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-0 left-0 bottom-0 w-[6px] bg-[#673ab7] rounded-l-lg" />
                  )}
                  <FloatingToolbar active={isActive} />

                  <div className="flex flex-col gap-4">
                    {field.mediaUrl && (
                      <div className="relative group max-w-sm">
                        <img src={field.mediaUrl} alt="Question Media" className="w-full rounded-lg border border-slate-200" />
                        <button 
                          onClick={(e) => { e.stopPropagation(); updateField(field.id, { mediaUrl: undefined }); }}
                          className="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-white text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                    <div className="flex items-start gap-4">
                      <input 
                        className="flex-1 text-base bg-slate-50 font-medium p-4 focus:bg-slate-100 focus:outline-none border-b-2 border-slate-300 focus:border-[#673ab7] rounded-t-md transition-colors"
                        placeholder="Question"
                        value={field.label}
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                      />
                      {isActive && (
                        <select 
                          value={field.type}
                          onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                          className="p-3 border border-slate-300 rounded-md bg-white text-sm font-medium text-slate-700 outline-none focus:border-[#673ab7]"
                        >
                          <option value="text">Short answer</option>
                          <option value="long-text">Paragraph</option>
                          <option value="multiple-choice">Multiple choice</option>
                        </select>
                      )}
                    </div>

                    <div className="ml-2">
                      {field.type === "multiple-choice" && (
                        <div className="space-y-3">
                          {field.options?.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-3 group">
                               <div className="w-4 h-4 rounded-full border-2 border-slate-300 mt-1" />
                               <input 
                                className="flex-1 text-sm text-slate-700 focus:outline-none border-b border-transparent focus:border-b-2 focus:border-[#673ab7] py-1 transition-all"
                                value={opt}
                                placeholder={`Option ${oIdx + 1}`}
                                onChange={(e) => {
                                  const newOpts = [...(field.options || [])];
                                  newOpts[oIdx] = e.target.value;
                                  updateField(field.id, { options: newOpts });
                                }}
                               />
                               {isActive && field.options!.length > 1 && (
                                 <button 
                                  onClick={() => {
                                    const newOpts = (field.options || []).filter((_, i) => i !== oIdx);
                                    updateField(field.id, { options: newOpts });
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition-opacity p-2"
                                 >
                                   <Plus size={16} className="rotate-45" />
                                 </button>
                               )}
                            </div>
                          ))}
                          {isActive && (
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                              <button 
                                onClick={() => updateField(field.id, { options: [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`] })}
                                className="text-sm font-medium text-slate-500 hover:border-b hover:border-slate-300"
                              >
                                Add option
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {field.type === "text" && (
                        <div className="w-1/2 border-b-2 border-dotted border-slate-300 pb-1 pt-2">
                          <span className="text-sm text-slate-400">Short answer text</span>
                        </div>
                      )}

                      {field.type === "long-text" && (
                        <div className="w-3/4 border-b-2 border-dotted border-slate-300 pb-1 pt-2">
                          <span className="text-sm text-slate-400">Long answer text</span>
                        </div>
                      )}
                    </div>

                    {isActive && (
                      <div className="flex items-center justify-end gap-4 pt-4 mt-4 border-t border-slate-100 text-slate-500">
                        <button onClick={() => {
                          const newField = { ...field, id: `field_${Math.random().toString(36).substring(2, 9)}` };
                          const activeIndex = fields.findIndex(f => f.id === field.id);
                          const newFields = [...fields];
                          newFields.splice(activeIndex + 1, 0, newField);
                          setFields(newFields);
                          setActiveId(newField.id);
                        }} className="hover:text-slate-700 p-2 rounded-full hover:bg-slate-50" aria-label="Duplicate">
                          <Copy size={18} />
                        </button>
                        <button onClick={() => removeField(field.id)} className="hover:text-slate-700 p-2 rounded-full hover:bg-slate-50" aria-label="Delete">
                          <Trash2 size={18} />
                        </button>
                        <div className="w-px h-6 bg-slate-300 mx-2" />
                        <label className="flex items-center gap-3 cursor-pointer">
                          <span className="text-sm font-medium">Required</span>
                          <div className={`w-9 h-3.5 rounded-full relative transition-colors ${field.required ? 'bg-[#c2b0e6]' : 'bg-slate-300'}`}>
                            <div className={`absolute -top-1 w-5 h-5 rounded-full shadow transition-all duration-200 ${field.required ? 'right-0 bg-[#673ab7]' : 'left-0 bg-white'}`} />
                          </div>
                          <input 
                            type="checkbox" 
                            checked={field.required}
                            onChange={(e) => updateField(field.id, { required: e.target.checked })}
                            className="sr-only" 
                          />
                        </label>
                        <button className="hover:text-slate-700 p-2 rounded-full hover:bg-slate-50 ml-2" aria-label="More options">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {!formId && (
               <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 mt-8">
                  <h3 className="text-xl font-medium text-slate-800 mb-6">Publish Details</h3>
                  
                  <div className="space-y-6">
                    {errorText && (
                      <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-3">
                        <AlertCircle size={18} className="mt-0.5" />
                        <span>{errorText}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                       <div className="space-y-1">
                         <span className="text-sm font-medium text-slate-800">Allow Anonymity</span>
                         <p className="text-xs text-slate-500">Users can submit responses without signing in.</p>
                       </div>
                       <label className="flex items-center cursor-pointer">
                         <div className={`w-10 h-4 rounded-full relative transition-colors ${allowAnonymity ? 'bg-[#c2b0e6]' : 'bg-slate-300'}`}>
                           <div className={`absolute -top-1 w-6 h-6 rounded-full shadow transition-all duration-200 ${allowAnonymity ? 'right-0 bg-[#673ab7]' : 'left-0 bg-white'}`} />
                         </div>
                         <input 
                           type="checkbox" 
                           checked={allowAnonymity}
                           onChange={(e) => setAllowAnonymity(e.target.checked)}
                           className="sr-only" 
                         />
                       </label>
                    </div>

                    <button
                     onClick={handleCreateForm}
                     disabled={loading}
                     className="bg-[#673ab7] hover:bg-[#5e35b1] text-white w-full py-4 text-lg font-medium rounded-lg shadow transition-colors mt-4"
                    >
                       {loading ? "Saving..." : "Create Form"}
                    </button>
                  </div>
               </div>
            )}
          </>
        )}

        {currentTab === "Responses" && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-8">
                 <div>
                   <h2 className="text-2xl font-bold text-slate-800">{responses.length} responses</h2>
                   <p className="text-sm text-slate-500 mt-1">Collecting submissions</p>
                 </div>
                 <div className="flex items-center gap-2">
                   <button className="bg-green-700 text-white px-4 py-2 rounded font-medium text-sm">Download CSV</button>
                 </div>
              </div>

              {responses.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center gap-4">
                   <Inbox size={48} className="text-slate-300" />
                   <p className="text-slate-500 font-medium">Waiting for responses...</p>
                </div>
              ) : (
                <div className="space-y-4">
                   {responses.map((resp, i) => (
                     <div key={i} className="p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#673ab7]">Response #{responses.length - i}</span>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs font-medium text-slate-600">{resp.fullName || "Anonymous"}</span>
                           </div>
                           <span className="text-xs text-slate-400">{resp.createdAt?.toDate().toLocaleString()}</span>
                        </div>
                        <div className="space-y-2">
                           {Object.entries(resp.answers || {}).map(([key, val]: any, kIdx) => (
                              <div key={kIdx} className="text-sm">
                                 <span className="text-slate-500 font-medium">{key}: </span>
                                 <span className="text-slate-800">{String(val)}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                   ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentTab === "Settings" && (
           <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                 <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-slate-800">Form Settings</h3>
                 </div>
                 <div className="p-6 space-y-8">
                    <div className="flex items-center justify-between">
                       <div>
                          <p className="font-medium text-slate-900">Allow Anonymity</p>
                          <p className="text-xs text-slate-500">Enable if you don't need to track user identities</p>
                       </div>
                       <label className="flex items-center cursor-pointer">
                          <div className={`w-10 h-4 rounded-full relative transition-colors ${allowAnonymity ? 'bg-[#c2b0e6]' : 'bg-slate-300'}`}>
                            <div className={`absolute -top-1 w-6 h-6 rounded-full shadow transition-all duration-200 ${allowAnonymity ? 'right-0 bg-[#673ab7]' : 'left-0 bg-white'}`} />
                          </div>
                          <input 
                            type="checkbox" 
                            checked={allowAnonymity}
                            onChange={(e) => setAllowAnonymity(e.target.checked)}
                            className="sr-only" 
                          />
                       </label>
                    </div>

                    <div className="space-y-4">
                       <p className="font-medium text-slate-900">Restricted Faculties</p>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {FACULTIES_LIST.map(f => (
                             <label key={f} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={allowedFaculty.includes(f)}
                                  onChange={(e) => {
                                     if (e.target.checked) setAllowedFaculty([...allowedFaculty, f]);
                                     else setAllowedFaculty(allowedFaculty.filter(x => x !== f));
                                  }}
                                  className="w-4 h-4 rounded text-[#673ab7] focus:ring-[#673ab7]"
                                />
                                <span className="text-sm text-slate-700">{f}</span>
                             </label>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        )}

      </div>

      <AnimatePresence>
        {showShareModal && formId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Share Form</h2>
                <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="flex flex-col items-center gap-6">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <QRCodeSVG 
                      value={`${window.location.origin}/?formId=${formId}`}
                      size={180}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-800">Scan QR Code</p>
                    <p className="text-xs text-slate-500 mt-1">Students can scan this to open the form instantly</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-bold text-slate-700">Shareable Link</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-600 font-mono truncate">
                      {window.location.origin}/?formId={formId}
                    </div>
                    <button 
                      onClick={() => copyToClipboard(`${window.location.origin}/?formId=${formId}`)}
                      className="bg-[#673ab7] hover:bg-[#5e35b1] text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 shrink-0"
                    >
                      {copiedId === "share-link" ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                      {copiedId === "share-link" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-8 py-6 bg-slate-50 flex justify-end">
                <button 
                  onClick={() => setShowShareModal(false)}
                  className="bg-white border border-slate-200 text-slate-700 px-6 py-2.5 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        accept="image/*" 
        className="hidden" 
      />
    </div>
  );
}

