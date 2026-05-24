import { useState } from "react";
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
    const matchesSearch =
      item.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.fullName && item.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.sentimentReasoning && item.sentimentReasoning.toLowerCase().includes(searchTerm.toLowerCase()));

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

    // Headings matching university records
    const headers = [
      "Suggestion ID",
      "Created Date",
      "Category",
      "Submitter Name",
      "Department",
      "Level",
      "Message Content",
      "AI Sentiment",
      "AI Analysis Reason",
      "Status",
    ];

    const escape = (val: string) => `"${(val || "").toString().replace(/"/g, '""')}"`;

    const rows = filteredSuggestions.map((s) => {
      // Parse dates cleanly
      let dateString = "N/A";
      if (s.createdAt) {
        const d = s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
        dateString = d.toISOString();
      }

      return [
        s.id,
        dateString,
        s.category,
        s.isAnonymous ? "Anonymous" : s.fullName || "Named Submitter",
        s.department,
        s.level,
        s.message,
        s.sentiment.toUpperCase(),
        s.sentimentReasoning || "",
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
    link.setAttribute("download", `university_faculty_feedback_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case "urgent":
        return (
          <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-mono font-bold bg-red-100 text-red-800 border border-red-200 shadow-xs uppercase tracking-wide">
            <ShieldAlert size={12} /> Urgent Action
          </span>
        );
      case "complaint":
        return (
          <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-xs uppercase tracking-wide">
            Complaint
          </span>
        );
      case "positive":
        return (
          <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs uppercase tracking-wide">
            Positive Idea
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wide">
            Neutral
          </span>
        );
    }
  };

  const parseItemDate = (createdAt: any) => {
    if (!createdAt) return "Parsing...";
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Search & Export Command Unit */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white/70 p-5 rounded-3xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            id="admin-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to page 1 on active search
            }}
            placeholder="Search suggestions content, reasoning notes, or names..."
            className="w-full glass-input text-slate-800 rounded-2xl py-2.5 pl-11 pr-4 outline-none text-sm placeholder:text-slate-400 font-medium"
          />
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filteredSuggestions.length === 0}
          className="jelly-glass-button jelly-button-slate py-2.5 px-4 rounded-full text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
        >
          <Download size={16} />
          Download CSV List ({filteredSuggestions.length})
        </button>
      </div>

      {/* Grid Controls: Multidimensional Filtering */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white/50 p-4 rounded-3xl border border-slate-200 text-xs">
        {/* Status Filter */}
        <div>
          <label className="block text-slate-500 mb-1.5 font-mono uppercase tracking-wider text-[10px] font-bold">
            Review Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setCurrentPage(1);
            }}
            className="w-full bg-white border border-slate-300 text-slate-700 rounded-xl py-2 px-3 outline-none"
          >
            <option value="all">All States</option>
            <option value="pending">Pending Review</option>
            <option value="reviewed">Reviewed Entries</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-slate-500 mb-1.5 font-mono uppercase tracking-wider text-[10px] font-bold">
            Faculty Category
          </label>
          <select
            value={catFilter}
            onChange={(e) => {
              setCatFilter(e.target.value as CategoryFilter);
              setCurrentPage(1);
            }}
            className="w-full bg-white border border-slate-300 text-slate-700 rounded-xl py-2 px-3 outline-none"
          >
            <option value="all">All Categories</option>
            <option value="Suggestion">Suggestions</option>
            <option value="Complaint">Complaints</option>
            <option value="Feedback">Feedback</option>
            <option value="Idea">Ideas</option>
          </select>
        </div>

        {/* Sentiment Filter */}
        <div>
          <label className="block text-slate-500 mb-1.5 font-mono uppercase tracking-wider text-[10px] font-bold">
            AI Sentiment Badges
          </label>
          <select
            value={sentimentFilter}
            onChange={(e) => {
              setSentimentFilter(e.target.value as SentimentFilter);
              setCurrentPage(1);
            }}
            className="w-full bg-white border border-slate-300 text-slate-700 rounded-xl py-2 px-3 outline-none"
          >
            <option value="all">All Sentiments</option>
            <option value="positive">Positive Comments</option>
            <option value="complaint">Routine Complaints</option>
            <option value="urgent">Urgent Interventions</option>
          </select>
        </div>

        {/* Department Filter */}
        <div>
          <label className="block text-slate-500 mb-1.5 font-mono uppercase tracking-wider text-[10px] font-bold">
            Department Layer
          </label>
          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-white border border-slate-300 text-slate-700 rounded-xl py-2 px-3 outline-none"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Suggestion list rendering */}
      {paginatedItems.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-slate-200">
          <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4 border border-slate-250">
            <Inbox size={20} />
          </div>
          <h4 className="text-base font-bold text-slate-800">No Suggestions Match Filters</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto font-medium">
            Try resetting your active category selectors, search query, or check back later for live synchronization loops.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedItems.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                id={`suggestion-card-${item.id}`}
                key={item.id}
                className={`glass-card rounded-2xl border transition-all duration-300 overflow-hidden ${
                  item.status === "reviewed" ? "opacity-75 border-slate-200/50" : "border-slate-200/90 hover:border-purple-300 shadow-sm"
                }`}
              >
                {/* Visual Header */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="py-0.5 px-2 bg-purple-100 text-purple-700 border border-purple-200 rounded font-mono text-[10px] tracking-wide font-bold uppercase">
                        {item.category}
                      </span>
                      {getSentimentBadge(item.sentiment)}
                      {item.status === "reviewed" ? (
                        <span className="py-0.5 px-2 bg-slate-100 text-slate-600 rounded-md font-mono text-[10px] font-bold border border-slate-200">
                          Reviewed
                        </span>
                      ) : (
                        <span className="py-0.5 px-2 bg-blue-50 text-blue-700 rounded-md font-mono text-[10px] font-bold border border-blue-200 animate-pulse">
                          Pending Action
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-850 font-sans mt-2">
                      {item.isAnonymous ? "🔒 Anonymous Student" : `👤 ${item.fullName || "Named Submitter"}`}
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 pt-1">
                      <span className="font-bold text-slate-700">{item.department}</span>
                      <span className="text-slate-300">•</span>
                      <span className="font-medium text-slate-600">{item.level}</span>
                      <span className="text-slate-300">•</span>
                      <span className="font-mono text-[11px] flex items-center gap-1 text-slate-500 font-bold">
                        <Clock size={12} className="text-slate-400" />
                        {parseItemDate(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Operational Action Unit */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="text-xs bg-white border border-slate-350 text-slate-600 hover:text-slate-800 hover:bg-slate-50 py-1.5 px-3 rounded-lg duration-200 cursor-pointer select-none font-bold"
                    >
                      {isExpanded ? "Collapse Text" : "Expand Message"}
                    </button>

                    <button
                      onClick={() => onToggleReviewed(item.id, item.status)}
                      title={item.status === "reviewed" ? "Mark back to Pending" : "Mark as Reviewed"}
                      className={`p-2 rounded-lg border cursor-pointer select-none duration-250 ${
                        item.status === "reviewed"
                          ? "bg-slate-100 border-slate-200 text-slate-500 hover:text-purple-600"
                          : "bg-emerald-550/10 bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
                      }`}
                    >
                      <CheckCircle size={15} />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to permanently delete this suggestion from university records?")) {
                          onDelete(item.id);
                        }
                      }}
                      title="Delete Suggestion"
                      className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-650 hover:bg-red-100 cursor-pointer select-none"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Expanded Box (Glass Drawer) */}
                {isExpanded && (
                  <div className="bg-slate-50 border-t border-slate-200 p-5 space-y-4">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase font-bold">
                        Submission Transcript
                      </span>
                      <p className="text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans bg-white border border-slate-200 rounded-2xl p-4 font-medium">
                        {item.message}
                      </p>
                    </div>

                    {/* AI Sentiment analysis segment */}
                    {item.sentimentReasoning && (
                      <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl flex items-start gap-2.5">
                        <Sparkles size={15} className="text-purple-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-slate-800 text-xs font-bold leading-none flex items-center gap-1.5">
                            Gemini AI System Assessment Context
                          </p>
                          <p className="text-[11px] text-purple-900 mt-1.5 leading-relaxed font-mono font-medium">
                            {item.sentimentReasoning}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination Navigation Elements */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 mt-6">
              <span className="text-xs font-mono text-slate-500 font-semibold">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} entries
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 border border-slate-300 text-slate-500 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>

                <span className="text-xs font-mono font-bold text-slate-700 px-2 select-none">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-slate-300 text-slate-500 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
