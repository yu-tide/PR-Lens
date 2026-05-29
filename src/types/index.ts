export type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

export interface ReviewRisk {
  id: string;
  level: RiskLevel;
  title: string;
  file: string;
  reason: string;
  suggestion: string;
  requiresHumanCheck: boolean;
}

export interface ReviewSuggestion {
  id: string;
  title: string;
  category:
    | "Correctness"
    | "Security"
    | "Maintainability"
    | "Testing"
    | "Documentation";
  suggestion: string;
}

export interface ReviewResult {
  summary: string;
  risks: ReviewRisk[];
  suggestions: ReviewSuggestion[];
}

export interface PullRequestMeta {
  title: string;
  author: string;
  repository: string;
  changedFiles: number;
  additions: number;
  deletions: number;
}

export type AnalysisStatus = "idle" | "analyzing" | "success" | "error";

export interface AnalysisStep {
  id: string;
  title: string;
  description: string;
}

export interface ExamplePR {
  id: string;
  repo: string;
  prNumber: string;
  title: string;
  url: string;
}

export interface FeatureCard {
  id: string;
  title: string;
  description: string;
  icon: "flash" | "shield" | "message";
  tone: "blue" | "green" | "purple";
}