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
  answers?: Record<string, any>; // For dynamic form responses
  mediaAttachment?: string; // For submission-specific media (if any)
}

export interface FormField {
  id: string;
  type: "text" | "long-text" | "multiple-choice" | "rating";
  label: string;
  required: boolean;
  options?: string[]; // for multiple-choice
  mediaUrl?: string;
}

export interface FeedbackForm {
  id: string;
  title: string;
  description: string;
  allowedFaculty: string[];
  allowedCategories: string[];
  allowAnonymity: boolean;
  type: "feedback" | "assignment" | "test" | "survey";
  mediaUrl?: string;
  fields: FormField[];
  createdBy: string; // user uid
  createdAt: any;
  responseCount: number;
}

export type CategoryFilter = "all" | string;
export type DepartmentFilter = "all" | string;
export type SentimentFilter = "all" | "positive" | "complaint" | "urgent" | "neutral";
export type StatusFilter = "all" | "pending" | "reviewed";
