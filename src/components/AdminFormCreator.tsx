import { useState, useEffect, FormEvent } from "react";
import { Copy, Plus, ClipboardCheck, Trash2, Calendar, Layout, ToggleLeft, ShieldAlert, Sparkles, Sliders } from "lucide-react";
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const FACULTIES_LIST = [
  "Computing Sciences",
  "Biological, Chemical & Food Sciences",
  "Physical & Mathematical Sciences"
];

const CATEGORIES_LIST = ["Suggestion", "Complaint", "Feedback", "Idea"];

interface CustomForm {
  id: string;
  title: string;
  description: string;
  allowedFaculty: string[];
  allowedCategories: string[];
  allowAnonymity: boolean;
  createdAt: any;
}

interface AdminFormCreatorProps {
  adminEmail: string;
}

export default function AdminFormCreator({ adminEmail }: AdminFormCreatorProps) {
  // Creator states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [allowedFaculty, setAllowedFaculty] = useState<string[]>(FACULTIES_LIST);
  const [allowedCategories, setAllowedCategories] = useState<string[]>(CATEGORIES_LIST);
  const [allowAnonymity, setAllowAnonymity] = useState(true);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [latestLinkId, setLatestLinkId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Active form list states
  const [savedForms, setSavedForms] = useState<CustomForm[]>([]);
  const [fetchingForms, setFetchingForms] = useState(false);

  // Load created forms from cloud
  const loadSavedForms = async () => {
    setFetchingForms(true);
    try {
      const q = query(collection(db, "forms"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const loaded: CustomForm[] = [];
      snap.forEach((docSnap) => {
        loaded.push({ id: docSnap.id, ...docSnap.data() } as CustomForm);
      });
      setSavedForms(loaded);
    } catch (err) {
      console.error("Failed to fetch custom forms history: ", err);
    } finally {
      setFetchingForms(false);
    }
  };

  useEffect(() => {
    loadSavedForms();
  }, []);

  // Checkbox toggles
  const handleFacultyToggle = (fac: string) => {
    if (allowedFaculty.includes(fac)) {
      setAllowedFaculty(allowedFaculty.filter((item) => item !== fac));
    } else {
      setAllowedFaculty([...allowedFaculty, fac]);
    }
  };

  const handleCategoryToggle = (cat: string) => {
    if (allowedCategories.includes(cat)) {
      setAllowedCategories(allowedCategories.filter((item) => item !== cat));
    } else {
      setAllowedCategories([...allowedCategories, cat]);
    }
  };

  const handleCreateForm = async (e: FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setSuccessMsg(null);
    setLatestLinkId(null);

    if (!title.trim() || !description.trim()) {
      setErrorText("Please state a form title and guiding statement/description.");
      return;
    }
    if (allowedFaculty.length === 0) {
      setErrorText("Please grant permission to at least one faculty department.");
      return;
    }
    if (allowedCategories.length === 0) {
      setErrorText("Please check at least one allowed category.");
      return;
    }

    setLoading(true);
    try {
      const formSlug = `box_${Math.random().toString(36).substring(2, 11)}`;
      const docRef = doc(db, "forms", formSlug);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        allowedFaculty,
        allowedCategories,
        allowAnonymity,
        createdBy: adminEmail,
        createdAt: serverTimestamp(),
      };

      await setDoc(docRef, payload);

      setSuccessMsg(`Format profile registered securely under ID: ${formSlug}`);
      setLatestLinkId(formSlug);
      setTitle("");
      setDescription("");
      setAllowedFaculty(FACULTIES_LIST);
      setAllowedCategories(CATEGORIES_LIST);
      setAllowAnonymity(true);

      // Refresh list
      await loadSavedForms();
    } catch (err: any) {
      console.error(err);
      setErrorText("Could not write record profile back to cloud Firestore.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteForm = async (id: string) => {
    if (!confirm("Are you sure you want to permanently disable this custom form shared link? Users with the link will no longer be able to open it.")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "forms", id));
      loadSavedForms();
    } catch (err) {
      console.error("Failed to remove: ", err);
    }
  };

  const copyToClipboard = (id: string) => {
    const origin = window.location.origin;
    const shareableLink = `${origin}/?formId=${id}`;

    navigator.clipboard.writeText(shareableLink).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 3000);
    }).catch(err => {
      console.error("Could not write to hardware clipboard: ", err);
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Creation workspace section */}
      <div className="lg:col-span-5 space-y-6">
        <div className="glass-card-premium rounded-3xl p-6 border border-white relative overflow-hidden shadow-xl">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500" />

          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
              <Sliders size={18} />
            </div>
            <h3 className="text-lg font-extrabold text-slate-800">Dynamic Form Creator</h3>
          </div>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed font-semibold">
            Define dynamic feedback scopes, restrict departments, alter allowed feedback tags, and generate instant URLs for students to fill out anonymously or named.
          </p>

          {errorText && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-semibold">
              {errorText}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-4 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-2xl text-xs space-y-2">
              <div className="font-bold">Form Generated Successfully!</div>
              {latestLinkId && (
                <div className="space-y-2">
                  <p className="font-mono text-[11px] bg-white p-2 rounded-xl border border-emerald-100 break-all select-all font-bold">
                    {window.location.origin}/?formId={latestLinkId}
                  </p>
                  <button
                    onClick={() => copyToClipboard(latestLinkId)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    {copiedId === latestLinkId ? (
                      <>
                        <ClipboardCheck size={14} className="animate-pulse" />
                        Copied Link!
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy Shareable Link
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleCreateForm} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-400 font-extrabold mb-1.5">
                Custom Form Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. FOS Special Lab Evaluation"
                className="w-full glass-input text-slate-800 border-slate-350 rounded-xl py-2 px-3 text-xs outline-none font-bold placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-400 font-extrabold mb-1.5">
                Guiding Statement / Description *
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instruct students what feedback/complaints to submit..."
                className="w-full glass-input text-slate-800 border-slate-350 rounded-xl py-2 px-3 text-xs outline-none font-medium placeholder:text-slate-400"
              />
            </div>

            {/* Faculty filter list checkboxes */}
            <div className="space-y-2 bg-[#f8fafc] p-3.5 rounded-2xl border border-slate-200">
              <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold">
                Permitted Department Clusters *
              </label>
              <div className="space-y-1.5">
                {FACULTIES_LIST.map((fac) => {
                  const isChecked = allowedFaculty.includes(fac);
                  return (
                    <label key={fac} className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-medium text-slate-650">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleFacultyToggle(fac)}
                        className="rounded text-purple-600 border-slate-300 focus:ring-purple-500"
                      />
                      <span>{fac}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Allowed tags checkboxes */}
            <div className="space-y-2 bg-[#f8fafc] p-3.5 rounded-2xl border border-slate-200">
              <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold">
                Permitted Submission Tags *
              </label>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {CATEGORIES_LIST.map((cat) => {
                  const isChecked = allowedCategories.includes(cat);
                  return (
                    <label key={cat} className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-medium text-slate-650">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleCategoryToggle(cat)}
                        className="rounded text-purple-600 border-slate-300 focus:ring-purple-500"
                      />
                      <span>{cat}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Active anonymity toggle */}
            <div className="flex items-center justify-between p-3.5 bg-purple-50/40 rounded-2xl border border-purple-100">
              <div>
                <span className="text-xs font-bold text-slate-755 block">Allow Student Anonymity</span>
                <span className="text-[10px] text-slate-450 mt-0.5 block">Permit anonymous submissions</span>
              </div>
              <input
                type="checkbox"
                checked={allowAnonymity}
                onChange={(e) => setAllowAnonymity(e.target.checked)}
                className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 jelly-glass-button jelly-button-purple text-white font-extrabold text-xs rounded-full flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {loading ? (
                <div className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Plus size={14} />
                  Compile & Save Channel Link
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Generated links history logs section */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-widest font-mono">
            Active Shareable Links ({savedForms.length})
          </h4>
          <button
            onClick={loadSavedForms}
            disabled={fetchingForms}
            className="text-[11px] font-bold text-purple-600 hover:text-purple-750 font-mono"
          >
            {fetchingForms ? "Refreshing..." : "Sync List"}
          </button>
        </div>

        {fetchingForms && savedForms.length === 0 ? (
          <div className="p-8 bg-white/50 border border-slate-200 text-center rounded-3xl">
            <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Retrieving Custom Share Logs...</p>
          </div>
        ) : savedForms.length === 0 ? (
          <div className="p-10 bg-white/70 border border-slate-200 text-center rounded-3xl">
            <p className="text-xs text-slate-400 font-medium">No custom share links generated yet.</p>
            <p className="text-[11px] text-slate-400 mt-1">Use the workspace form panel on the left to spawn your starting active share link.</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {savedForms.map((form) => {
              const shareLink = `${window.location.origin}/?formId=${form.id}`;
              const isCopied = copiedId === form.id;

              return (
                <div key={form.id} className="bg-white border border-slate-200 rounded-3xl p-5 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <span className="text-[9px] font-mono bg-purple-150 bg-purple-50 text-purple-705 border border-purple-200 px-2 py-0.5 rounded font-bold">
                        ID: {form.id}
                      </span>
                      <h5 className="font-extrabold text-sm text-slate-800 tracking-tight mt-1.5">
                        {form.title}
                      </h5>
                      <p className="text-xs text-slate-505 leading-relaxed mt-1 font-medium">
                        {form.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => copyToClipboard(form.id)}
                        title="Copy Student Link"
                        className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                          isCopied
                            ? "bg-emerald-50 border-emerald-250 text-emerald-600"
                            : "bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100"
                        }`}
                      >
                        {isCopied ? <ClipboardCheck size={14} /> : <Copy size={14} />}
                      </button>

                      <button
                        onClick={() => handleDeleteForm(form.id)}
                        title="Delete Form Link"
                        className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-650 hover:bg-red-100 cursor-pointer select-none"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Metadata display badges */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-slate-450 font-mono mt-4 pt-3.5 border-t border-slate-100">
                    <span className="font-bold text-purple-600">Permissions:</span>
                    <span className="text-slate-500 font-medium bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-[9px]">
                      {form.allowedFaculty.length} Clusters
                    </span>
                    <span className="text-slate-505 font-medium bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-[9px]">
                      {form.allowedCategories.join(", ")}
                    </span>
                    <span className="text-slate-505 font-medium bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-[9px]">
                      {form.allowAnonymity ? "Anonymity Allowed" : "Enforce Name Identification"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
