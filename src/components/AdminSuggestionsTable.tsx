import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Suggestion, CategoryFilter, DepartmentFilter, SentimentFilter, StatusFilter } from "../types";
import {
  Search,
  CheckCircle,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  Download,
  BookOpen,
  Filter,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Inbox,
  Clock,
  Star,
  FileText
} from "lucide-react";

interface AdminSuggestionsTableProps {
  suggestions: Suggestion[];
  onToggleReviewed: (id: string, currentStatus: "pending" | "reviewed") => void;
  onDelete: (id: string) => void;
}

export default function AdminSuggestionsTable({
  suggestions,
  onToggleReviewed,
  onDelete,
}: AdminSuggestionsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [catFilter, setCatFilter] = useState<CategoryFilter>("all");
  const [deptFilter, setDeptFilter] = useState<DepartmentFilter>("all");
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Extract unique departments dynamically
  const departments = Array.from(new Set(suggestions.map((s) => s.department)));

  // Filtered array
  const filteredSuggestions = suggestions.filter((item) => {
    const answerText = item.answers ? Object.values(item.answers).join(" ").toLowerCase() : "";
    const matchesSearch =
      (item.message || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      answerText.includes(searchTerm.toLowerCase()) ||
      (item.fullName && item.fullName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCat = catFilter === "all" || item.category === catFilter;
    const matchesDept = deptFilter === "all" || item.department === deptFilter;
    const matchesSentiment = sentimentFilter === "all" || item.sentiment === sentimentFilter;
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;

    return matchesSearch && matchesCat && matchesDept && matchesSentiment && matchesStatus;
  });

  // Pagination calculations
  const totalItems = filteredSuggestions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredSuggestions.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // CSV Exporter
  const handleExportCSV = () => {
    if (filteredSuggestions.length === 0) return;

    const headers = [
      "Response ID",
      "Created Date",
      "Field Options",
      "Submitter Name",
      "Department",
      "Level",
      "Answers (Flattened)",
      "AI Sentiment",
      "Status",
    ];

    const escape = (val: any) => `"${(val || "").toString().replace(/"/g, '""')}"`;

    const rows = filteredSuggestions.map((s) => {
      let dateString = "N/A";
      if (s.createdAt) {
        const d = s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
        dateString = d.toISOString();
      }

      const flatAnswers = s.answers ? Object.entries(s.answers).map(([k, v]) => `${k}: ${v}`).join("; ") : s.message;

      return [
        s.id,
        dateString,
        s.category,
        s.isAnonymous ? "Anonymous" : s.fullName || "Named Submitter",
        s.department,
        s.level,
        flatAnswers,
        s.sentiment.toUpperCase(),
        s.status.toUpperCase(),
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => escape(val as string)).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `form_responses_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case "urgent":
        return <span className="px-3 py-1 rounded text-[10px] font-black bg-red-100 text-red-600 uppercase">Urgent</span>;
      case "positive":
        return <span className="px-3 py-1 rounded text-[10px] font-black bg-blue-100 text-blue-600 uppercase">Positive</span>;
      default:
        return <span className="px-3 py-1 rounded text-[10px] font-black bg-slate-100 text-slate-500 uppercase">Neutral</span>;
    }
  };

  const parseItemDate = (createdAt: any) => {
    if (!createdAt) return "Processing...";
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    return date.toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Filter Responses..."
            className="app-input pl-12 h-14"
          />
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filteredSuggestions.length === 0}
          className="app-button-outline h-14 px-6 font-black uppercase tracking-widest text-xs"
        >
          <Download size={18} />
          Export Data ({filteredSuggestions.length})
        </button>
      </div>

      {paginatedItems.length === 0 ? (
        <div className="app-card p-20 text-center space-y-4">
          <Inbox size={48} className="mx-auto text-slate-200" />
          <h3 className="text-xl font-black text-slate-900 uppercase">No Responses Collected</h3>
        </div>
      ) : (
        <div className="grid gap-4">
          {paginatedItems.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className={`app-card overflow-hidden transition-all border-l-4 ${
                  item.status === "reviewed" ? "border-l-emerald-400 bg-slate-50/50" : "border-l-blue-600"
                }`}
              >
                <div className="p-8">
                   <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2">
                           {getSentimentBadge(item.sentiment)}
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                             {item.department} • {item.level}
                           </span>
                        </div>
                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter">
                          {item.isAnonymous ? "Anonymous User" : item.fullName}
                        </h4>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                          <Clock size={12} /> {parseItemDate(item.createdAt)}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="app-button-outline py-2 px-4 text-xs font-black uppercase tracking-widest"
                        >
                          {isExpanded ? "Collapse" : "View Details"}
                        </button>
                        <button
                          onClick={() => onToggleReviewed(item.id, item.status)}
                          className={`p-2 rounded-lg border transition-all ${
                            item.status === "reviewed" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-white text-slate-400 border-slate-200 hover:border-blue-300"
                          }`}
                        >
                          <CheckCircle size={20} />
                        </button>
                        <button
                          onClick={() => onDelete(item.id)}
                          className="p-2 rounded-lg bg-red-50 text-red-600 border border-red-100 hover:bg-red-100"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                   </div>

                   {isExpanded && (
                     <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="mt-8 pt-8 border-t border-slate-100 space-y-6"
                     >
                        {item.answers ? (
                           <div className="grid gap-6">
                              {Object.entries(item.answers).map(([key, val]: [string, any]) => (
                                <div key={key} className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{key}</label>
                                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 group">
                                     {typeof val === 'number' ? (
                                       <div className="flex gap-1 text-blue-600">
                                          {[...Array(val)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
                                       </div>
                                     ) : (
                                       <p className="text-slate-900 font-bold leading-relaxed">{val}</p>
                                     )}
                                  </div>
                                </div>
                              ))}
                           </div>
                        ) : (
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Feedback Message</label>
                            <p className="text-slate-800 font-bold leading-relaxed">{item.message}</p>
                          </div>
                        )}

                        {item.sentimentReasoning && (
                          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex gap-3 text-blue-800">
                             <Sparkles className="shrink-0" size={18} />
                             <p className="text-sm font-bold uppercase tracking-tight leading-tight">{item.sentimentReasoning}</p>
                          </div>
                        )}
                     </motion.div>
                   )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between p-6 bg-white rounded-xl border border-slate-200">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
               <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="app-button-outline p-2 disabled:opacity-20"
               >
                 <ChevronLeft size={20} />
               </button>
               <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="app-button-outline p-2 disabled:opacity-20"
               >
                 <ChevronRight size={20} />
               </button>
            </div>
        </div>
      )}
    </div>
  );
}
