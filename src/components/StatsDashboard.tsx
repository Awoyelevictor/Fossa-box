import { Suggestion } from "../types";
import { Inbox, AlertOctagon, HelpCircle, CheckCircle } from "lucide-react";

interface StatsDashboardProps {
  suggestions: Suggestion[];
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
      color: "text-blue-650 border-blue-200 bg-blue-50",
      bgColor: "hover:border-blue-400/40",
    },
    {
      id: "stats-urgent",
      label: "Urgent Actions",
      value: urgentCount,
      icon: AlertOctagon,
      color: "text-red-650 border-red-200 bg-red-50",
      bgColor: "hover:border-red-400/40",
    },
    {
      id: "stats-pending",
      label: "Total Complaints",
      value: complaintsCount,
      icon: HelpCircle,
      color: "text-amber-650 border-amber-200 bg-amber-50",
      bgColor: "hover:border-amber-400/40",
    },
    {
      id: "stats-reviewed",
      label: "Reviewed Solutions",
      value: reviewedCount,
      icon: CheckCircle,
      color: "text-emerald-650 border-emerald-200 bg-emerald-50",
      bgColor: "hover:border-emerald-400/40",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => {
        const IconComponent = card.icon;
        return (
          <div
            id={card.id}
            key={card.label}
            className={`glass-card p-5 rounded-3xl border transition-all duration-300 flex items-center justify-between group ${card.bgColor} shadow-md border-slate-200/80 hover:shadow-xl`}
          >
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-1 font-bold">
                {card.label}
              </p>
              <h4 className="text-3xl font-black tracking-tight text-slate-850 font-sans">
                {card.value}
              </h4>
              <p className="text-[10px] text-slate-400 font-mono mt-1 font-semibold">
                {card.label === "Urgent Actions" && card.value > 0
                  ? "Requires Quick Attention"
                  : "Live Synchronized State"}
              </p>
            </div>
            <div className={`p-3 rounded-2xl border ${card.color} group-hover:scale-110 transition-transform duration-300`}>
              <IconComponent size={24} strokeWidth={1.5} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
