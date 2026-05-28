import { useState, FormEvent, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, 
  UserCheck, 
  ShieldAlert, 
  Sparkles, 
  Check, 
  RefreshCw, 
  FileText, 
  ArrowLeft, 
  Star,
  CheckCircle2,
  List
} from "lucide-react";
import { collection, doc, setDoc, getDoc, serverTimestamp, updateDoc, increment } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { FeedbackForm, FormField } from "../types";

export const FOS_CLUSTERS = [
  "Computing Sciences",
  "Biological, Chemical & Food Sciences",
  "Physical & Mathematical Sciences"
];

const LEVELS = [
  "100 Level",
  "200 Level",
  "300 Level",
  "400 Level",
  "Postgraduate",
  "Faculty Staff",
];

interface SuggestionsFormProps {
  onSuccessSubmit: () => void;
}

export default function SuggestionsForm({ onSuccessSubmit }: SuggestionsFormProps) {
  const [formId, setFormId] = useState<string | null>(null);
  const [form, setForm] = useState<FeedbackForm | null>(null);
  
  // Response states
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("formId");
    if (id) {
      setFormId(id);
      setIsLoading(true);
      const fetchForm = async () => {
        try {
          const formDoc = await getDoc(doc(db, "forms", id));
          if (formDoc.exists()) {
            const data = formDoc.data() as FeedbackForm;
            setForm({ ...data, id: formDoc.id });
          } else {
            setErrorStatus("Form not found or inactive.");
          }
        } catch (err) {
          console.error(err);
          setErrorStatus("Error loading form.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchForm();
    }
  }, []);

  const handleAnswerChange = (fieldId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;

    // Validation
    const missing = form.fields.filter(f => f.required && !answers[f.id]);
    if (missing.length > 0) {
      setErrorStatus(`Please answer all required questions: ${missing.map(m => m.label).join(", ")}`);
      return;
    }

    setIsLoading(true);
    setErrorStatus(null);

    try {
      // 1. Prepare payload
      const mainText = Object.values(answers).filter(v => typeof v === "string").join(" ");
      
      // AI Sentiment
      let sentimentResult = { sentiment: "neutral", sentimentReasoning: "Standard input." };
      try {
        const sentimentResponse = await fetch("/api/analyze-sentiment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: mainText }),
        });
        if (sentimentResponse.ok) sentimentResult = await sentimentResponse.json();
      } catch (err) {
        console.warn("AI Sentiment failed", err);
      }

      // 2. Submit response
      const subRef = doc(collection(db, "suggestions"));
      await setDoc(subRef, {
        formId: form.id,
        fullName: isAnonymous ? "Anonymous User" : fullName.trim() || "Guest",
        department,
        level,
        answers,
        sentiment: sentimentResult.sentiment,
        sentimentReasoning: sentimentResult.sentimentReasoning,
        isAnonymous,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      // 3. Increment form response count
      await updateDoc(doc(db, "forms", form.id), {
        responseCount: increment(1)
      });

      setSuccess(true);
      onSuccessSubmit();
    } catch (err: any) {
      console.error(err);
      setErrorStatus("Failed to submit. Check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-4">
        <RefreshCw className="animate-spin mx-auto text-blue-600" size={32} />
        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Fetching Form Profile...</p>
      </div>
    );
  }

  if (errorStatus && !form) {
    return (
      <div className="app-card p-12 text-center space-y-6">
        <ShieldAlert className="mx-auto text-red-500" size={48} />
        <h2 className="text-2xl font-black text-slate-900">{errorStatus}</h2>
        <button onClick={() => window.location.href = "/"} className="app-button-outline mx-auto">Return Home</button>
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Form Header */}
      <div className="app-card overflow-hidden">
        {form.mediaUrl && (
          <img src={form.mediaUrl} className="w-full h-48 object-cover border-b border-slate-100" alt="Header" />
        )}
        <div className="p-10 space-y-4">
          <div className="flex items-center gap-2">
             <div className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-black uppercase tracking-widest">
               {form.type}
             </div>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">{form.title}</h1>
          <p className="text-lg text-slate-500 font-medium leading-relaxed">{form.description}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User Identity Section */}
        <div className="app-card p-8 space-y-8">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-4">Personal Info</h3>
          
          {form.allowAnonymity && (
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
               <div className="space-y-1">
                 <span className="text-sm font-black text-slate-900">Anonymity Mode</span>
                 <p className="text-xs text-slate-500">Hide your profile from this submission</p>
               </div>
               <input 
                type="checkbox" 
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-5 h-5 rounded text-blue-600" 
               />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase">Your Name</label>
                <input 
                  disabled={isAnonymous}
                  value={isAnonymous ? "Anonymous User" : fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="app-input"
                  placeholder="Full name"
                />
             </div>
             <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase">Department</label>
                <select 
                  className="app-input"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                >
                   <option value="">Select Department</option>
                   {FOS_CLUSTERS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             </div>
          </div>
        </div>

        {/* Dynamic Fields */}
        {form.fields.map((field, idx) => (
          <div key={field.id} className="app-card p-10 space-y-6 relative group">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-l"></div>
            <div className="space-y-2">
               <label className="text-xl font-black text-slate-900 tracking-tight flex items-start gap-3">
                 <span className="text-blue-600/20">{idx + 1}.</span>
                 {field.label}
                 {field.required && <span className="text-red-500">*</span>}
               </label>
            </div>

            <div className="pt-2">
              {field.type === "text" && (
                <input 
                  type="text"
                  required={field.required}
                  value={answers[field.id] || ""}
                  onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                  className="app-input"
                  placeholder="Enter your answer"
                />
              )}
              {field.type === "long-text" && (
                <textarea 
                  required={field.required}
                  value={answers[field.id] || ""}
                  onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                  className="app-input min-h-[120px] resize-none"
                  placeholder="Type your response here..."
                />
              )}
              {field.type === "multiple-choice" && (
                <div className="space-y-3">
                   {field.options?.map(opt => (
                     <label key={opt} className="flex items-center gap-4 p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all">
                        <input 
                          type="radio" 
                          name={field.id}
                          required={field.required}
                          checked={answers[field.id] === opt}
                          onChange={() => handleAnswerChange(field.id, opt)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="font-bold text-slate-700">{opt}</span>
                     </label>
                   ))}
                </div>
              )}
              {field.type === "rating" && (
                <div className="flex justify-center gap-4">
                   {[1, 2, 3, 4, 5].map(star => (
                     <button
                      key={star}
                      type="button"
                      onClick={() => handleAnswerChange(field.id, star)}
                      className={`p-4 rounded-2xl border transition-all ${
                        answers[field.id] === star 
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                        : "bg-white border-slate-100 text-slate-300 hover:text-blue-400"
                      }`}
                     >
                       <Star size={32} fill={answers[field.id] >= star ? "currentColor" : "none"} />
                     </button>
                   ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {errorStatus && (
          <div className="p-5 bg-red-50 border border-red-100 text-red-700 rounded-2xl font-bold flex gap-3 items-center">
             <ShieldAlert size={20} />
             {errorStatus}
          </div>
        )}

        {success ? (
          <div className="app-card p-12 text-center space-y-6">
             <CheckCircle2 className="mx-auto text-emerald-500" size={64} />
             <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Response Recorded!</h2>
             <p className="text-slate-500 font-medium">Thank you for contributing to FOSSA Build.</p>
             <button 
              type="button"
              onClick={() => window.location.href = "/"}
              className="app-button-primary px-8 mx-auto"
             >
                Return to Dashboard
             </button>
          </div>
        ) : (
          <button
            type="submit"
            disabled={isLoading}
            className="app-button-primary w-full py-6 text-2xl font-black shadow-2xl shadow-blue-200"
          >
            {isLoading ? "SUBMITTING..." : "SUBMIT RESPONSE"}
          </button>
        )}
      </form>
    </div>
  );
}
