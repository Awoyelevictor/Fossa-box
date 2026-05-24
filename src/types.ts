export interface Suggestion {
  id: string;
  fullName?: string;
  department: string;
  level: string;
  category: string;
  message: string;
  isAnonymous: boolean;
  status: "pending" | "reviewed";
  sentiment: "positive" | "complaint" | "urgent" | "neutral";
  sentimentReasoning?: string;
  createdAt: any; // Firebase Timestamp or standard parsed Date string
  reviewedAt?: any;
  formId?: string; // Reference to custom created form
}

export interface FeedbackForm {
  id: string;
  title: string;
  description: string;
  allowedFaculty: string[]; // e.g. ["FOS", "FBMS", "FBSS", "FOE", "FOA"]
  allowedCategories: string[];
  allowAnonymity: boolean;
  createdAt: any;
}

export type CategoryFilter = "all" | string;
export type DepartmentFilter = "all" | string;
export type SentimentFilter = "all" | "positive" | "complaint" | "urgent" | "neutral";
export type StatusFilter = "all" | "pending" | "reviewed";
