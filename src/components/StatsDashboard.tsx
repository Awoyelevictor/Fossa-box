import { Suggestion } from "../types";
import { Inbox, AlertOctagon, HelpCircle, CheckCircle, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import Markdown from "react-markdown";

interface StatsDashboardProps {
  suggestions: Suggestion[];
}

interface AISummaryCardProps {
  suggestions: Suggestion[];
}

function AISummaryCard({ suggestions }: AISummaryCardProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getSummary = async () => {
    if (suggestions.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/summarize-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses: suggestions })
      });
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="md:col-span-2 lg:col-span-4 app-card p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-2xl shadow-blue-200 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full group-hover:bg-white/10 transition-all duration-700" />
      
      <div className="relative space-y-6">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
                 <Sparkles size={20} className="text-blue-100" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight leading-none">AI Executive Summary</h3>
                <p className="text-[10px] uppercase font-black tracking-widest text-blue-200 mt-1">Institutional Intelligence Engine</p>
              </div>
           </div>
           
           {!summary && !loading && (
             <button 
              onClick={getSummary}
              className="bg-white text-blue-600 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-black/10 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
             >
               <Wand2 size={14} />
               Generate Analysis
             </button>
           )}
        </div>

        {loading ? (
          <div className="space-y-3 py-4 animate-pulse">
            <div className="h-4 bg-white/20 rounded-full w-3/4" />
            <div className="h-4 bg-white/20 rounded-full w-1/2" />
            <div className="h-4 bg-white/20 rounded-full w-2/3" />
          </div>
        ) : summary ? (
          <div className="markdown-body text-blue-50 text-sm leading-relaxed prose-invert prose-p:my-2 prose-strong:text-white">
            <Markdown>{summary}</Markdown>
            <button 
              onClick={() => setSummary(null)}
              className="text-[10px] font-black uppercase tracking-widest text-blue-200 hover:text-white mt-4 border-b border-blue-200/20"
            >
              Recalculate Summary
            </button>
          </div>
        ) : (
          <p className="text-blue-100/60 text-sm italic">
            {suggestions.length > 0 
              ? "Your data is ready. Click 'Generate Analysis' to unlock AI-powered faculty insights."
              : "No responses collected yet. AI summary will be available once students submit feedback."}
          </p>
        )}
      </div>
    </div>
  );
}

export default function StatsDashboard({ suggestions }: StatsDashboardProps) {
  const total = suggestions.length;
  const urgentCount = suggestions.filter((s) => s.sentiment === "urgent").length;
  const complaintsCount = suggestions.filter((s) => s.sentiment === "complaint").length;
  const reviewedCount = suggestions.filter((s) => s.status === "reviewed").length;

  const cards = [
    {
      id: "stats-total",
      label: "Total Feedback",
      value: total,
      icon: Inbox,
      color: "text-blue-600 border-blue-100 bg-blue-50",
    },
    {
      id: "stats-urgent",
      label: "Urgent Actions",
      value: urgentCount,
      icon: AlertOctagon,
      color: "text-red-600 border-red-100 bg-red-50",
    },
    {
      id: "stats-pending",
      label: "Total Complaints",
      value: complaintsCount,
      icon: HelpCircle,
      color: "text-amber-600 border-amber-100 bg-amber-50",
    },
    {
      id: "stats-reviewed",
      label: "Reviewed Solutions",
      value: reviewedCount,
      icon: CheckCircle,
      color: "text-emerald-600 border-emerald-100 bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const IconComponent = card.icon;
          return (
            <div
              id={card.id}
              key={card.label}
              className="app-card p-6 flex items-center justify-between group transition-all"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  {card.label}
                </p>
                <h4 className="text-3xl font-black tracking-tight text-slate-900 border-none lg:text-4xl">
                  {card.value}
                </h4>
              </div>
              <div className={`p-4 rounded-xl border ${card.color}`}>
                <IconComponent size={28} strokeWidth={2} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <AISummaryCard suggestions={suggestions} />
      </div>
    </div>
  );
}
