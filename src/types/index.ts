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
  testGaps?: AiTestGap[];
}

export interface AiTestGap {
  id: string;
  sourceFile: string;
  expectedTestFile?: string;
  severity: "high" | "medium" | "low";
  reason: string;
  suggestedTestCases: string[];
}

export interface PullRequestMeta {
  title: string;
  author: string;
  repository: string;
  changedFiles: number;
  additions: number;
  deletions: number;
  owner?: string;
  repo?: string;
  pullNumber?: number;
  description?: string;
  baseBranch?: string;
  headBranch?: string;
  url?: string;
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

// ============================================================
// API 请求/响应类型
// ============================================================

/** 解析后的 PR 链接 */
export interface ParsedPullRequestUrl {
  owner: string;
  repo: string;
  pullNumber: number;
  url: string;
}

/** 审查角色 */
export type ReviewerPersona =
  | "security"
  | "performance"
  | "testing"
  | "maintainability";

/** 分析模式 */
export type AnalyzeMode = "real" | "mock";

/** 应用层错误码 */
export type AppErrorCode =
  | "INVALID_PR_URL"
  | "EMPTY_PR_URL"
  | "REQUEST_INVALID_JSON"
  | "GITHUB_TOKEN_MISSING"
  | "GITHUB_PR_NOT_FOUND"
  | "GITHUB_RATE_LIMIT"
  | "GITHUB_API_ERROR"
  | "GITHUB_TIMEOUT"
  | "AI_TOKEN_MISSING"
  | "AI_API_ERROR"
  | "AI_RATE_LIMIT"
  | "AI_TIMEOUT"
  | "AI_INVALID_RESPONSE"
  | "REPORT_BUILD_ERROR"
  | "NETWORK_ERROR"
  | "MOCK_MODE"
  | "UNKNOWN_ERROR";

/** 错误发生阶段 */
export type AppErrorStage =
  | "request"
  | "validation"
  | "github"
  | "rule_check"
  | "ai"
  | "report"
  | "client"
  | "unknown";

/** 应用层错误 */
export interface AppError {
  code: AppErrorCode;
  message: string;
  detail?: string;
  recoverable: boolean;
  stage?: AppErrorStage;
  action?: string;
}

/** POST /api/analyze-pr 请求 */
export interface AnalyzePrRequest {
  url?: string;
  useMock?: boolean;
  reviewerPersona?: ReviewerPersona;
}

/** POST /api/analyze-pr 响应 */
export interface AnalyzePrResponse {
  success: boolean;
  mode: AnalyzeMode;
  pullRequest?: PullRequestMeta;
  reviewResult?: ReviewResult;
  error?: AppError;
  changedFiles?: ChangedFile[];
  ruleCheckResults?: RuleCheckResult[];
  source?: "github" | "mock";
  warning?: string;
  aiSource?: AiReviewSource;
  markdownReport?: string;
  mergedRisks?: MergedReviewRisk[];
  warnings?: AppError[];
  reviewerPersona?: ReviewerPersona;
}

// ============================================================
// GitHub 数据与服务类型
// ============================================================

/** 变更文件状态（兼容 GitHub API 返回值） */
export type ChangedFileStatus =
  | "added"
  | "removed"
  | "modified"
  | "renamed"
  | "copied"
  | "changed"
  | "unchanged";

/** 单个变更文件 */
export interface ChangedFile {
  filename: string;
  status: ChangedFileStatus | string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  rawUrl?: string;
  blobUrl?: string;
  isBinary?: boolean;
  isTooLarge?: boolean;
}

/** 规则检查严重程度 */
export type RuleCheckSeverity = "low" | "medium" | "high";

/** 规则预检查结果 */
export interface RuleCheckResult {
  id: string;
  title: string;
  message: string;
  severity: RuleCheckSeverity;
  file?: string;
  line?: number;
}

/** GitHub API 错误码 */
export type GitHubApiErrorCode =
  | "GITHUB_API_ERROR"
  | "GITHUB_PR_NOT_FOUND"
  | "GITHUB_RATE_LIMIT"
  | "GITHUB_TOKEN_MISSING"
  | "GITHUB_TIMEOUT";

// ============================================================
// AI 服务类型
// ============================================================

/** AI 分析来源 */
export type AiReviewSource = "bailian" | "mock";

/** AI 分析输入 */
export interface AiAnalysisInput {
  pullRequest: PullRequestMeta;
  changedFiles: ChangedFile[];
  ruleCheckResults: RuleCheckResult[];
  reviewerPersona?: ReviewerPersona;
}

/** AI 分析结果 */
export interface AiAnalysisResult {
  reviewResult: ReviewResult;
  source: AiReviewSource;
  warning?: string;
}

/** AI Client 配置 */
export interface AiClientConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/** AI Client 错误码 */
export type AiClientErrorCode =
  | "AI_TOKEN_MISSING"
  | "AI_API_ERROR"
  | "AI_RATE_LIMIT"
  | "AI_TIMEOUT"
  | "AI_INVALID_RESPONSE";

// ============================================================
// Review 合并 & Markdown 报告类型
// ============================================================

/** 风险来源 */
export type ReviewRiskSource = "ai" | "rule" | "ai_and_rule";

/** 合并后的风险（扩展 ReviewRisk） */
export interface MergedReviewRisk extends ReviewRisk {
  source: ReviewRiskSource;
  ruleIds?: string[];
  aiRiskIds?: string[];
  ruleMessages?: string[];
}

/** Markdown 报告生成输入 */
export interface ReportBuilderInput {
  pullRequest: PullRequestMeta;
  changedFiles: ChangedFile[];
  ruleCheckResults: RuleCheckResult[];
  reviewResult: ReviewResult;
  mergedRisks?: MergedReviewRisk[];
  source?: "github" | "mock";
  aiSource?: AiReviewSource;
  warning?: string;
}

// ============================================================
// 结果页 UI 类型
// ============================================================

/** 结果页 Tab */
export type TabKey = "risk" | "suggestion" | "testGap" | "draft" | "order" | "markdown";

/** Review Order 中的一条文件审查优先级 */
export interface ReviewOrderItem {
  file: string;
  title: string;
  severity: "high" | "medium" | "low";
  description: string;
}

/** 风险评分总览 */
export interface OverviewDisplay {
  riskScore: number;
  riskLevel: "high" | "medium" | "low";
  riskLabel: string;
  highRiskCount: number;
  suggestionCount: number;
  confidence: number;
  conclusion: string[];
}

/** 证据条目 */
export interface EvidenceItem {
  file: string;
  line?: number;
  code?: string;
  reason: string;
}

/** Review 发现展示 */
export interface ReviewFindingDisplay {
  id: string;
  level: "high" | "medium" | "low";
  label: string;
  title: string;
  description: string;
  suggestion: string;
  category: string;
  confidence: number;
  needsHumanCheck: boolean;
  evidence: EvidenceItem[];
}

/** 测试缺口展示 */
export interface TestGapDisplay {
  id: string;
  sourceFile: string;
  expectedTestFile: string;
  severity: "high" | "medium" | "low";
  reason: string;
  suggestedTestCases: string[];
}

/** 评论草稿 */
export interface DraftComment {
  id: string;
  sourceFindingId?: string;
  title: string;
  body: string;
  severity: "high" | "medium" | "low";
  selected: boolean;
  edited: boolean;
}

/** Dashboard 汇总数据 */
export interface DashboardData {
  riskScore: number;
  riskLevel: "high" | "medium" | "low";
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  totalRiskCount: number;
  suggestionCount: number;
  testGapCount: number;
  draftCommentCount: number;
  evidenceCount: number;
  changedFileCount: number;
  additions: number;
  deletions: number;
  totalChanges: number;
  confidence: number;
}