import { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Layout, 
  Trash2, 
  Copy, 
  Link as LinkIcon, 
  Inbox, 
  Clock, 
  ArrowRight,
  MoreVertical,
  CheckCircle2,
  FileText
} from "lucide-react";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { FeedbackForm } from "../types";
import { motion } from "motion/react";

interface AdminFormsLibraryProps {
  adminEmail: string;
  onEditForm: (form: FeedbackForm) => void;
  onCreateNew: () => void;
}

export default function AdminFormsLibrary({ adminEmail, onEditForm, onCreateNew }: AdminFormsLibraryProps) {
  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "forms"),
      where("createdBy", "==", adminEmail),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const loaded: FeedbackForm[] = [];
      snap.forEach(d => loaded.push({ id: d.id, ...d.data() } as FeedbackForm));
      setForms(loaded);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [adminEmail]);

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this form? All associated responses will remain but the form link will die.")) return;
    try {
      await deleteDoc(doc(db, "forms", id));
    } catch (err) {
      console.error(err);
    }
  };

  const copyLink = (id: string) => {
    const link = `${window.location.origin}/?formId=${id}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const filtered = forms.filter(f => 
    (f.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Accessing Form Library...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Search and Quick Action */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
          <input 
            className="app-input pl-12 h-14"
            placeholder="Search your forms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={onCreateNew}
          className="app-button-primary h-14 px-8 flex items-center gap-2 font-black uppercase tracking-widest text-xs"
        >
          <Plus size={18} />
          Create New Form
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="app-card p-20 text-center space-y-6">
           <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
             <FileText size={40} />
           </div>
           <div className="space-y-2">
             <h3 className="text-xl font-black text-slate-900 uppercase">Your Library is Empty</h3>
             <p className="text-slate-400 font-medium">Get started by creating your first academic form or survey.</p>
           </div>
           <button onClick={onCreateNew} className="app-button-outline mx-auto">Create First Form</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((form) => (
            <motion.div 
              key={form.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="app-card group hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden"
              onClick={() => onEditForm(form)}
            >
              <div className={`h-2 w-full ${
                form.type === 'test' ? 'bg-red-500' : 
                form.type === 'assignment' ? 'bg-amber-500' : 
                'bg-blue-600'
              }`} />
              
              <div className="p-6 space-y-4">
                 <div className="flex justify-between items-start">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-widest">
                      {form.type}
                    </span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button 
                        onClick={(e) => { e.stopPropagation(); copyLink(form.id); }}
                        className="p-1.5 bg-white shadow-sm border border-slate-100 rounded text-slate-400 hover:text-blue-600"
                       >
                         {copiedId === form.id ? <CheckCircle2 size={14} /> : <LinkIcon size={14} />}
                       </button>
                       <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(form.id); }}
                        className="p-1.5 bg-white shadow-sm border border-slate-100 rounded text-slate-400 hover:text-red-500"
                       >
                         <Trash2 size={14} />
                       </button>
                    </div>
                 </div>

                 <div className="space-y-1">
                    <h4 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {form.title}
                    </h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <Inbox size={10} /> {form.responseCount || 0} Responses
                    </p>
                 </div>

                 <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex -space-x-2">
                       {form.allowedFaculty.slice(0, 2).map((_, i) => (
                         <div key={i} className={`w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-black`}>
                           {i + 1}
                         </div>
                       ))}
                    </div>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-bold">
                       <Clock size={12} />
                       {form.createdAt ? (form.createdAt.toDate ? form.createdAt.toDate().toLocaleDateString() : 'Recent') : 'Just now'}
                    </span>
                 </div>
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors pointer-events-none" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
