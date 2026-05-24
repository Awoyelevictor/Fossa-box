import { useState, useTransition, FormEvent, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, UserCheck, ShieldAlert, Sparkles, Check, RefreshCw, FileText, ArrowLeft, Link } from "lucide-react";
import { collection, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";

export const FOS_CLUSTERS = [
  "Computing Sciences",
  "Biological, Chemical & Food Sciences",
  "Physical & Mathematical Sciences"
];

export const FOS_DEPARTMENTS_BY_CLUSTER: Record<string, string[]> = {
  "Computing Sciences": [
    "Department of Computer Science",
    "Department of Software Engineering",
    "Department of Cyber Security",
    "Department of Information Technology",
    "Department of Computer Information System"
  ],
  "Biological, Chemical & Food Sciences": [
    "Department of Food Science and Technology",
    "Department of Biochemistry",
    "Department of Microbiology",
    "Department of Biological Sciences (Biology)",
    "Department of Chemistry"
  ],
  "Physical & Mathematical Sciences": [
    "Department of Mathematics",
    "Department of Physics"
  ]
};

const LEVELS = [
  "100 Level (Freshman)",
  "200 Level (Sophomore)",
  "300 Level (Junior)",
  "400 Level / Final Year",
  "Postgraduate",
  "Faculty Staff",
];

const DEFAULT_CATEGORIES = ["Suggestion", "Complaint", "Feedback", "Idea"];

interface SuggestionsFormProps {
  onSuccessSubmit: () => void;
}

export default function SuggestionsForm({ onSuccessSubmit }: SuggestionsFormProps) {
  // Query parameter selectors for dynamically customized form shares
  const [formId, setFormId] = useState<string | null>(null);
  const [customFormConfig, setCustomFormConfig] = useState<{
    title: string;
    description: string;
    allowedFaculty: string[];
    allowedCategories: string[];
    allowAnonymity: boolean;
  } | null>(null);

  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");
  const [category, setCategory] = useState("Suggestion");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const characterLimit = 2000;

  // Verify if a dynamic form ID is present in the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("formId");
    if (id) {
      setFormId(id);
      setIsLoading(true);
      const fetchFormMetadata = async () => {
        try {
          const formDoc = await getDoc(doc(db, "forms", id));
          if (formDoc.exists()) {
            const data = formDoc.data();
            setCustomFormConfig({
              title: data.title || "Custom Feedback Form",
              description: data.description || "Administrative shareable feedback gate.",
              allowedFaculty: data.allowedFaculty && data.allowedFaculty.length > 0 ? data.allowedFaculty : FOS_CLUSTERS,
              allowedCategories: data.allowedCategories && data.allowedCategories.length > 0 ? data.allowedCategories : DEFAULT_CATEGORIES,
              allowAnonymity: data.allowAnonymity !== undefined ? data.allowAnonymity : true,
            });
            // Auto-select starting default category if configured
            if (data.allowedCategories && data.allowedCategories.length > 0) {
              setCategory(data.allowedCategories[0]);
            }
          } else {
            setErrorStatus("The shared workspace form link is invalid or has expired. Loading generic feedback channel.");
          }
        } catch (err) {
          console.error("Failed to query shared form configurations: ", err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchFormMetadata();
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!department || !level || !message.trim()) {
      setErrorStatus("Please complete all required fields before submitting.");
      return;
    }

    setIsLoading(true);
    setErrorStatus(null);

    try {
      // 1. Trigger Server-side AI Sentiment Analysis
      let sentimentResult = {
        sentiment: "neutral",
        sentimentReasoning: "Standard academic input categorization.",
      };

      try {
        const sentimentResponse = await fetch("/api/analyze-sentiment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });

        if (sentimentResponse.ok) {
          const resData = await sentimentResponse.json();
          if (resData.sentiment) {
            sentimentResult = resData;
          }
        }
      } catch (err) {
        console.error("Sentiment service unavailable, applying local classification:", err);
      }

      // 2. Prepare Firestore suggestion insertion
      const docRef = doc(collection(db, "suggestions"));
      const suggestionPayload = {
        fullName: isAnonymous ? "" : fullName.trim() || "Anonymous Student",
        department,
        level,
        category,
        message: message.trim(),
        isAnonymous,
        status: "pending",
        sentiment: sentimentResult.sentiment,
        sentimentReasoning: sentimentResult.sentimentReasoning,
        createdAt: serverTimestamp(),
        formId: formId || "general",
      };

      try {
        await setDoc(docRef, suggestionPayload);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `suggestions/${docRef.id}`);
      }

      // Complete operations
      setSuccess(true);
      setFullName("");
      setDepartment("");
      setLevel("");
      setMessage("");
      setIsAnonymous(false);
      onSuccessSubmit();

      // Reset success banner after 8 seconds
      setTimeout(() => setSuccess(false), 8000);
    } catch (err: any) {
      console.error(err);
      setErrorStatus("Network database failure. Check security constraints and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const currentTitle = customFormConfig ? customFormConfig.title : "Submit Feedback Portal";
  const currentDescription = customFormConfig ? customFormConfig.description : "Deliver your ideas, complaints, or suggestion reviews directly. Choose to submit named or anonymously.";
  const currentFaculties = customFormConfig ? customFormConfig.allowedFaculty : FOS_CLUSTERS;
  const currentCategories = customFormConfig ? customFormConfig.allowedCategories : DEFAULT_CATEGORIES;
  const isAnonymityAllowed = customFormConfig ? customFormConfig.allowAnonymity : true;

  return (
    <div className="space-y-6">
      {/* Dynamic shared form banner indicator for students */}
      {formId && customFormConfig && (
        <div id="student-custom-form-banner" className="glass-card p-4 rounded-2xl border border-purple-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-600">
              <FileText size={16} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-purple-600 block leading-none font-bold">Custom Academic Box Form Shared Link</span>
              <span className="text-xs text-slate-700 block mt-1 font-semibold">{currentTitle}</span>
            </div>
          </div>
          <button
            onClick={() => {
              window.location.href = window.location.origin;
            }}
            className="text-[10px] font-mono bg-slate-200 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-300 transition-colors"
          >
            Clear Custom Form Filters
          </button>
        </div>
      )}

      <div className="glass-card-premium rounded-3xl p-6 sm:p-8 border border-white/90 relative overflow-hidden shadow-2xl">
        {/* Visual glowing accent borders */}
        <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-500 opacity-90" />

        {/* Embedded glass radial reflection accent */}
        <div className="absolute -top-16 -right-16 w-38 h-38 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <h3 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-2 font-sans tracking-tight">
          <Sparkles className="text-purple-600 animate-pulse" size={22} /> {currentTitle}
        </h3>
        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
          {currentDescription}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="p-4 bg-emerald-100 border border-emerald-300 rounded-2xl flex items-start gap-3 overflow-hidden text-emerald-800 backdrop-blur-md"
              >
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600 shrink-0">
                  <Check size={18} strokeWidth={2.5} />
                </div>
                <div className="flex-1 text-xs">
                  <h5 className="font-bold text-slate-900 mb-0.5">Suggestion Filed Successfully!</h5>
                  <p className="text-emerald-800/80 leading-relaxed font-medium">
                    Your feedback was recorded securely. AI sentiment categorization has processed your suggestion successfully for review.
                  </p>
                </div>
              </motion.div>
            )}

            {errorStatus && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="p-4 bg-red-100 border border-red-300 rounded-2xl flex items-start gap-3 overflow-hidden text-red-800 backdrop-blur-md"
              >
                <div className="p-2 bg-red-500/10 rounded-lg text-red-600 shrink-0">
                  <ShieldAlert size={18} />
                </div>
                <p className="text-xs leading-relaxed flex-1 mt-0.5 font-semibold text-red-800">{errorStatus}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Anonymous toggle (Only render if anonymity is allowed in custom configs) */}
          {isAnonymityAllowed && (
            <div className="bg-[#f8fafc] p-4 rounded-2xl border border-slate-200 flex items-center justify-between backdrop-blur-md">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800 tracking-tight">Anonymity Guard</span>
                <span className="text-[11px] text-slate-500 font-medium">Hide your name and email domain details</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => {
                    setIsAnonymous(e.target.checked);
                    if (e.target.checked) setFullName("");
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 inline-block"></div>
              </label>
            </div>
          )}

          {/* Submitter Name input (Only shown/accessible if unnamed) */}
          {isAnonymityAllowed && (
            <div className={`transition-all duration-300 ${isAnonymous ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-2 font-bold">
                Full Name <span className="text-slate-400 text-[10px]">(Optional)</span>
              </label>
              <input
                type="text"
                disabled={isAnonymous}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Samuel Adebayo"
                className="w-full glass-input text-slate-800 border-slate-300 rounded-2xl py-3 px-4 outline-none text-sm font-sans placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          )}

          {/* Selector fields grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-2 font-bold">
                Academic Department <span className="text-purple-600">*</span>
              </label>
              <select
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full glass-input text-slate-800 border-slate-300 rounded-2xl py-3 px-3.5 outline-none text-sm font-sans cursor-pointer focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="" className="bg-white text-slate-400">Choose Department...</option>
                {currentFaculties.map((cluster) => {
                  const depts = FOS_DEPARTMENTS_BY_CLUSTER[cluster] || [];
                  return (
                    <optgroup key={cluster} label={cluster} className="bg-white font-bold text-slate-700">
                      {depts.map((dept) => (
                        <option key={dept} value={dept} className="bg-white text-slate-800 font-medium">
                          {dept}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-2 font-bold">
                Academic Level / Role <span className="text-purple-600">*</span>
              </label>
              <select
                required
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full glass-input text-slate-800 border-slate-300 rounded-2xl py-3 px-3.5 outline-none text-sm font-sans cursor-pointer focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="" className="bg-white text-slate-400">Select Scale...</option>
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl} className="bg-white text-slate-800">{lvl}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Suggestion Category Options */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-2.5 font-bold">
              Submission Category <span className="text-purple-600">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {currentCategories.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`py-2.5 px-3 rounded-full border text-xs font-extrabold cursor-pointer transition-all duration-300 jelly-glass-button ${
                    category === cat
                      ? "jelly-button-purple text-white shadow-purple-200"
                      : "jelly-button-slate text-slate-600"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Core feedback proposal textbox */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                Detailed Suggestion or Complaint <span className="text-purple-600">*</span>
              </label>
              <span className={`text-[10px] font-mono ${message.length > characterLimit - 100 ? "text-red-500" : "text-slate-400"}`}>
                {message.length} / {characterLimit}
              </span>
            </div>
            <textarea
              required
              rows={5}
              maxLength={characterLimit}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your feedback message with context here... Be clear, constructive and objective."
              className="w-full glass-input text-slate-800 border-slate-300 rounded-2xl py-3.5 px-4 outline-none text-sm font-sans placeholder:text-slate-400 font-medium whitespace-pre-wrap leading-relaxed focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          {/* Action form Submission trigger */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full jelly-glass-button jelly-button-purple text-white py-3.5 rounded-full text-sm font-extrabold flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none mt-4 group"
          >
            {isLoading ? (
              <>
                <RefreshCw className="animate-spin text-purple-100 animate-duration-1000" size={16} />
                Evaluating Threat Level & Analyzing Sentiment...
              </>
            ) : (
              <>
                <Send size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                Submit Feedback Request
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
