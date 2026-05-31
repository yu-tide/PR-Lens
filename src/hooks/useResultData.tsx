"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ShieldIcon, MessageIcon, FileIcon, BeakerIcon, SparkIcon,
} from "@/components/icons";
import type {
  AnalyzePrResponse, AppError, DashboardData, DraftComment,
  OverviewDisplay, ReviewDraftComment, ReviewFindingDisplay,
  RuleCheckResult, TabKey, TestGapDisplay, ReviewerPersona,
} from "@/types";
import {
  SESSION_KEY, FALLBACK,
} from "@/utils/result-fallbacks";
import type {
  RiskDisplay, SuggestionDisplay, PrInfoDisplay,
} from "@/utils/result-fallbacks";
import {
  extractPrNumber, mapRiskLevel, mapCategoryToIcon, getRiskLabel,
  getRiskScoreLevel, calculateAnchoredRiskScore,
  parseSignedDisplayNumber, readNumberField, normalizePercent,
  readChangedFilesFromResponse,
  getConfidenceByLevel, buildTestGaps,
  normalizeDraftBody, normalizeRiskLevel,
} from "@/utils/review-helpers";

// ============================================================
// Hook Return Type
// ============================================================

export interface UseResultDataReturn {
  // State
  analysisData: AnalyzePrResponse | null;
  setAnalysisData: (data: AnalyzePrResponse | null) => void;
  inputUrl: string;
  setInputUrl: (url: string) => void;
  showChangedFilesModal: boolean;
  setShowChangedFilesModal: (v: boolean) => void;
  retrying: boolean;
  setRetrying: (v: boolean) => void;
  retryError: string;
  setRetryError: (v: string) => void;
  copyStatus: "idle" | "success" | "error";
  setCopyStatus: (v: "idle" | "success" | "error") => void;
  draftCopyStatus: "idle" | "success" | "error";
  setDraftCopyStatus: (v: "idle" | "success" | "error") => void;
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  draftComments: DraftComment[];
  setDraftComments: React.Dispatch<React.SetStateAction<DraftComment[]>>;
  // Derived
  isMock: boolean;
  displayChangedFiles: string[];
  displayPrInfo: PrInfoDisplay;
  displaySummary: string[];
  displayRisks: RiskDisplay[];
  displayReviewFindings: ReviewFindingDisplay[];
  displaySuggestions: SuggestionDisplay[];
  displayRuleCheckResults: RuleCheckResult[];
  displayTestGaps: TestGapDisplay[];
  selectedDraftText: string;
  displayMarkdownLines: string[];
  markdownReport: string;
  displayWarnings: AppError[];
  displayOverview: OverviewDisplay;
  displayDashboard: DashboardData;
  tabs: Array<{ key: TabKey; label: string; icon: ReactNode; description: string }>;
  reviewerPersona: ReviewerPersona | undefined;
}

// ============================================================
// Helper: normalize AI draft comments
// ============================================================

function normalizeAiDraftComments(
  items: unknown,
): DraftComment[] {
  if (!Array.isArray(items)) return [];

  const result: DraftComment[] = [];

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    if (!item || typeof item !== "object") continue;

    const record = item as Record<string, unknown>;
    const title =
      typeof record.title === "string" && record.title.trim()
        ? record.title.trim()
        : `AI 评论草稿 ${index + 1}`;

    const body =
      typeof record.body === "string" && record.body.trim()
        ? normalizeDraftBody(record.body)
        : "";

    if (!body) continue;

    const severityStr = String(record.severity ?? "medium");
    const severity = normalizeRiskLevel(severityStr);

    result.push({
      id: `ai-draft-${index}`,
      sourceFindingId:
        typeof record.sourceFindingId === "string"
          ? record.sourceFindingId
          : undefined,
      title,
      body,
      severity,
      selected: true,
      edited: false,
    });
  }

  return result;
}

// ============================================================
// Hook
// ============================================================

export function useResultData(): UseResultDataReturn {
  // ── State ──────────────────────────────────────────────
  const [analysisData, setAnalysisData] = useState<AnalyzePrResponse | null>(null);
  const [inputUrl, setInputUrl] = useState("");
  const [showChangedFilesModal, setShowChangedFilesModal] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");
  const [draftCopyStatus, setDraftCopyStatus] = useState<"idle" | "success" | "error">("idle");
  const [activeTab, setActiveTab] = useState<TabKey>("risk");
  const [draftComments, setDraftComments] = useState<DraftComment[]>([]);

  // ── Session restore ────────────────────────────────────
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed?.data) {
          setAnalysisData(parsed.data as AnalyzePrResponse);
          setInputUrl(parsed.inputUrl ?? "");
        }
      } catch {
        /* JSON parse failed → silent fallback */
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // ── Derived: simple passthrough ────────────────────────
  const isMock = analysisData?.mode === "mock";

  const displayChangedFiles = useMemo(() => {
    return readChangedFilesFromResponse(analysisData);
  }, [analysisData]);

  const displayRuleCheckResults = useMemo(() => {
    return analysisData?.ruleCheckResults ?? [];
  }, [analysisData]);

  const displayWarnings = useMemo(() => {
    return analysisData?.warnings ?? [];
  }, [analysisData]);

  // ── Derived: PR info ───────────────────────────────────
  const displayPrInfo = useMemo(() => {
    const pr = analysisData?.pullRequest;
    if (!pr) return FALLBACK.prInfo;
    return {
      title: pr.title,
      repo: pr.repository,
      prNumber: extractPrNumber(inputUrl),
      author: pr.author,
      changedFiles: `${displayChangedFiles.length} 个文件`,
      additions: `+${pr.additions}`,
      deletions: `-${pr.deletions}`,
    };
  }, [analysisData, inputUrl, displayChangedFiles.length]);

  // ── Derived: summary ───────────────────────────────────
  const displaySummary = useMemo(() => {
    const text = analysisData?.reviewResult?.summary;
    if (!text) return FALLBACK.summary;
    const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
    return lines.length > 0 ? lines : [text];
  }, [analysisData]);

  // ── Derived: risks ─────────────────────────────────────
  const displayRisks: RiskDisplay[] = useMemo(() => {
    const apiRisks = analysisData?.reviewResult?.risks;
    if (!apiRisks || apiRisks.length === 0) return FALLBACK.risks;
    return apiRisks.map((r) => {
      const mapped = mapRiskLevel(r.level);
      return {
        level: mapped.level,
        label: mapped.label,
        title: r.title,
        description: r.reason,
        suggestion: r.suggestion,
        file: r.file,
      };
    });
  }, [analysisData]);

  // ── Derived: review findings ───────────────────────────
  const displayReviewFindings: ReviewFindingDisplay[] = useMemo(() => {
    const apiRisks = analysisData?.reviewResult?.risks;
    return displayRisks.map((risk, index) => {
      const aiRisk = apiRisks?.[index];
      const aiConfidence = aiRisk?.confidence;
      const aiEvidence = aiRisk?.evidence;

      return {
        id: `finding-${index}`,
        level: risk.level,
        label: risk.label,
        title: risk.title,
        description: risk.description,
        suggestion: risk.suggestion,
        category:
          index === 0 ? "Performance"
          : index === 1 ? "Configuration"
          : "Compatibility",
        confidence: aiConfidence ?? getConfidenceByLevel(risk.level, index),
        needsHumanCheck: risk.level !== "low" || (aiRisk?.requiresHumanCheck === true),
        evidence: (aiEvidence && aiEvidence.length > 0)
          ? aiEvidence
          : risk.file
            ? [{ file: risk.file, reason: risk.description }]
            : [],
      };
    });
  }, [displayRisks, analysisData]);

  // ── Derived: suggestions ───────────────────────────────
  const displaySuggestions: SuggestionDisplay[] = useMemo(() => {
    const apiSuggestions = analysisData?.reviewResult?.suggestions;
    if (!apiSuggestions || apiSuggestions.length === 0) return FALLBACK.suggestions;
    return apiSuggestions.map((s) => ({
      icon: mapCategoryToIcon(s.category),
      title: s.title,
      description: s.suggestion,
    }));
  }, [analysisData]);

  // ── Derived: test gaps ─────────────────────────────────
  // 优先使用 AI 返回的测试缺口，没有则 fallback 到规则推断
  const displayTestGaps = useMemo(() => {
    const aiTestGaps = analysisData?.reviewResult?.testGaps;
    if (aiTestGaps && aiTestGaps.length > 0) {
      return aiTestGaps.map((g): TestGapDisplay => ({
        id: g.id,
        sourceFile: g.sourceFile,
        expectedTestFile: g.expectedTestFile ?? g.sourceFile
          .replace(/^src\//, "tests/")
          .replace(/\.(ts|tsx|js|jsx)$/i, ".test.ts"),
        severity: g.severity,
        reason: g.reason,
        suggestedTestCases: g.suggestedTestCases,
        source: "ai",
      }));
    }
    // Fallback: 规则推断测试缺口
    return buildTestGaps(displayChangedFiles);
  }, [analysisData, displayChangedFiles]);

  // ── Draft init ─────────────────────────────────────────
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setDraftComments((prev) => {
        if (prev.length > 0) return prev;

        // 仅使用 AI 返回的 draftComments，不生成前端兜底草稿
        return normalizeAiDraftComments(
          analysisData?.reviewResult?.draftComments,
        );
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [analysisData]);

  // ── Derived: selected draft text ───────────────────────
  const selectedDraftText = useMemo(() => {
    return draftComments
      .filter((item) => item.selected)
      .map((item) => item.body)
      .join("\n\n---\n\n");
  }, [draftComments]);

  // ── Derived: markdown lines ────────────────────────────
  const displayMarkdownLines = useMemo(() => {
    if (!analysisData?.reviewResult) return FALLBACK.markdownLines;
    const p = displayPrInfo;
    const s = displaySummary;
    const r = displayRisks;
    const sg = displaySuggestions;

    const lines: string[] = [
      `# PR 审查报告：${p.title}`,
      `**仓库**：${p.repo}`,
      `**PR 编号**：${p.prNumber}`,
      `**作者**：${p.author}`,
      "**状态**：分析完成",
      "",
      "## 摘要",
      ...s,
      "",
      "## 变更文件",
      ...displayChangedFiles.map((file) => `- ${file}`),
      "",
      "## 风险分析",
    ];

    r.forEach((risk) => {
      lines.push(`- **${risk.label}**（${risk.title}）：${risk.description}`);
      lines.push(`  建议：${risk.suggestion}`);
    });

    lines.push("", "## Evidence & Confidence");
    displayReviewFindings.forEach((finding) => {
      lines.push(`- **${finding.title}**：置信度 ${finding.confidence}%`);
      finding.evidence.forEach((evidence) => {
        lines.push(`  - ${evidence.file}${evidence.line ? ` · 第 ${evidence.line} 行` : ""}：${evidence.reason}`);
      });
    });

    lines.push("", "## 测试缺口");
    displayTestGaps.forEach((gap) => {
      lines.push(`- **${gap.sourceFile}**：${gap.reason}`);
      lines.push(`  建议测试文件：${gap.expectedTestFile}`);
    });

    if (displayRuleCheckResults.length > 0) {
      lines.push("", "## 规则预检查");
      displayRuleCheckResults.forEach((rule) => {
        lines.push(`- **${rule.title}**：${rule.message}`);
        if (rule.file || rule.line) {
          lines.push(`  位置：${rule.file ?? "未知文件"}${rule.line ? ` · 第 ${rule.line} 行` : ""}`);
        }
      });
    }

    lines.push("", "## Review 建议");
    sg.forEach((sgItem) => {
      lines.push(`- **${sgItem.title}**：${sgItem.description}`);
    });

    if (draftComments.length > 0) {
      lines.push("", "## 评论草稿箱");
      draftComments.filter((item) => item.selected).forEach((draft) => {
        lines.push(`### ${draft.title}`);
        lines.push(draft.body);
        lines.push("");
      });
    }

    return lines;
  }, [
    analysisData, displayPrInfo, displaySummary, displayRisks, displaySuggestions,
    displayRuleCheckResults, displayChangedFiles, displayReviewFindings,
    displayTestGaps, draftComments,
  ]);

  // ── Derived: markdown report ───────────────────────────
  const markdownReport = useMemo(() => {
    return analysisData?.markdownReport ?? displayMarkdownLines.join("\n");
  }, [analysisData, displayMarkdownLines]);

  // ── Derived: overview ──────────────────────────────────
  const displayOverview: OverviewDisplay = useMemo(() => {
    if (!analysisData?.reviewResult) {
      return {
        riskScore: 78,
        riskLevel: "high",
        riskLabel: "高风险",
        highRiskCount: 3,
        suggestionCount: 4,
        confidence: 82,
        conclusion: [
          "本次 PR 重点涉及 API 路由限流能力、Redis 分布式调用和错误响应策略。",
          "建议优先审查高流量场景下的 Redis 性能、限流配置边界以及测试覆盖缺口。",
        ],
      };
    }

    const reviewResult = analysisData.reviewResult as unknown as Record<string, unknown>;
    const explicitScore = readNumberField(reviewResult, [
      "riskScore", "risk_score", "overallRiskScore", "overall_risk_score", "score",
    ]);

    const rawRisks = Array.isArray(reviewResult.risks) ? reviewResult.risks : [];
    const rawSuggestions = Array.isArray(reviewResult.suggestions) ? reviewResult.suggestions : [];

    const explicitConfidence = readNumberField(reviewResult, [
      "averageConfidence", "average_confidence", "confidence", "confidenceScore",
    ]);

    const confidenceValues = [...rawRisks, ...rawSuggestions]
      .map((item) =>
        readNumberField(item, ["confidence", "confidenceScore", "confidence_score"]),
      )
      .filter((value): value is number => value !== null);

    const riskScore = explicitScore !== null
      ? normalizePercent(explicitScore)
      : calculateAnchoredRiskScore(displayRisks, displayRuleCheckResults);

    const confidence = explicitConfidence !== null
      ? normalizePercent(explicitConfidence)
      : confidenceValues.length > 0
        ? normalizePercent(
            confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length,
          )
        : 82;

    const riskLevel = getRiskScoreLevel(riskScore);

    return {
      riskScore,
      riskLevel,
      riskLabel: getRiskLabel(riskLevel),
      highRiskCount: displayRisks.filter((risk) => risk.level === "high").length,
      suggestionCount: displaySuggestions.length,
      confidence,
      conclusion: displaySummary.slice(0, 2),
    };
  }, [analysisData, displayRisks, displaySuggestions, displaySummary]);

  // ── Derived: dashboard ─────────────────────────────────
  const displayDashboard: DashboardData = useMemo(() => {
    const additions = Math.max(0, parseSignedDisplayNumber(displayPrInfo.additions));
    const deletions = Math.abs(parseSignedDisplayNumber(displayPrInfo.deletions));
    const highRiskCount = displayRisks.filter((risk) => risk.level === "high").length;
    const mediumRiskCount = displayRisks.filter((risk) => risk.level === "medium").length;
    const lowRiskCount = displayRisks.filter((risk) => risk.level === "low").length;
    const evidenceCount = displayReviewFindings.reduce(
      (total, finding) => total + finding.evidence.length, 0,
    );

    return {
      riskScore: displayOverview.riskScore,
      riskLevel: displayOverview.riskLevel,
      highRiskCount, mediumRiskCount, lowRiskCount,
      totalRiskCount: displayRisks.length,
      suggestionCount: displaySuggestions.length,
      testGapCount: displayTestGaps.length,
      draftCommentCount: draftComments.length,
      evidenceCount,
      changedFileCount: displayChangedFiles.length,
      additions, deletions,
      totalChanges: additions + deletions,
      confidence: displayOverview.confidence,
    };
  }, [
    displayPrInfo.additions, displayPrInfo.deletions, displayRisks,
    displaySuggestions.length, displayTestGaps.length, draftComments.length,
    displayReviewFindings, displayChangedFiles.length, displayOverview,
  ]);

  // ── Tabs definition ────────────────────────────────────
  const tabs: Array<{ key: TabKey; label: string; icon: ReactNode; description: string }> = [
    { key: "risk", label: "风险分析", icon: <ShieldIcon className="h-4 w-4" />,
      description: "按风险类型聚合规则与 AI 发现，并展示证据与置信度。" },
    { key: "preRule", label: "预规则分析", icon: <SparkIcon className="h-4 w-4" />,
      description: "展示确定性规则引擎命中的结果，支持逐条查看命中依据与建议。" },
    { key: "suggestion", label: "审查建议", icon: <MessageIcon className="h-4 w-4" />,
      description: "AI 建议先进入草稿，由人工确认后再复制使用。" },
    { key: "testGap", label: "测试缺口", icon: <BeakerIcon className="h-4 w-4" />,
      description: "根据变更文件识别潜在测试覆盖缺口。" },
    { key: "draft", label: "评论草稿箱", icon: <FileIcon className="h-4 w-4" />,
      description: "将风险发现整理成可编辑、可筛选、可复制的 Review 评论草稿。" },
    { key: "markdown", label: "Markdown 报告", icon: <FileIcon className="h-4 w-4" />,
      description: "预览可复制、可下载的 Markdown 审查报告。" },
  ];

  const reviewerPersona = analysisData?.reviewerPersona;

  return {
    analysisData, setAnalysisData, inputUrl, setInputUrl,
    showChangedFilesModal, setShowChangedFilesModal,
    retrying, setRetrying, retryError, setRetryError,
    copyStatus, setCopyStatus, draftCopyStatus, setDraftCopyStatus,
    activeTab, setActiveTab, draftComments, setDraftComments,
    isMock, displayChangedFiles, displayPrInfo, displaySummary,
    displayRisks, displayReviewFindings, displaySuggestions,
    displayRuleCheckResults, displayTestGaps,
    selectedDraftText, displayMarkdownLines, markdownReport,
    displayWarnings, displayOverview, displayDashboard, tabs,
    reviewerPersona,
  };
}
