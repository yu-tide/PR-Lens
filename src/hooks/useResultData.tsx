"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ShieldIcon, MessageIcon, FileIcon, BeakerIcon, SparkIcon,
} from "@/components/icons";
import type {
  AnalyzePrResponse, AppError, DashboardData, DraftComment,
  OverviewDisplay, ReviewFindingDisplay, RuleCheckResult,
  TabKey, TestGapDisplay,
} from "@/types";
import {
  SESSION_KEY, FALLBACK, fallbackReviewOrder,
} from "@/utils/result-fallbacks";
import type {
  RiskDisplay, ReviewOrderItem, SuggestionDisplay, PrInfoDisplay,
} from "@/utils/result-fallbacks";
import {
  extractPrNumber, mapRiskLevel, mapCategoryToIcon, getRiskLabel,
  getRiskScoreLevel, normalizeRiskLevel, calculateRiskScore,
  parseSignedDisplayNumber, readNumberField, normalizePercent,
  readChangedFilesFromResponse, buildFallbackEvidence,
  getConfidenceByLevel, buildTestGaps,
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
  displayReviewOrder: ReviewOrderItem[];
  selectedDraftText: string;
  displayMarkdownLines: string[];
  markdownReport: string;
  displayWarnings: AppError[];
  displayOverview: OverviewDisplay;
  displayDashboard: DashboardData;
  tabs: Array<{ key: TabKey; label: string; icon: ReactNode; description: string }>;
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
      };
    });
  }, [analysisData]);

  // ── Derived: review findings ───────────────────────────
  const displayReviewFindings: ReviewFindingDisplay[] = useMemo(() => {
    return displayRisks.map((risk, index) => ({
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
      confidence: getConfidenceByLevel(risk.level, index),
      needsHumanCheck: risk.level !== "low",
      evidence: buildFallbackEvidence(index),
    }));
  }, [displayRisks]);

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
  const displayTestGaps = useMemo(() => {
    return buildTestGaps(displayChangedFiles);
  }, [displayChangedFiles]);

  // ── Derived: review order ──────────────────────────────
  const displayReviewOrder: ReviewOrderItem[] = useMemo(() => {
    if (displayRuleCheckResults.length === 0) return fallbackReviewOrder;
    return displayRuleCheckResults.map((rule) => ({
      file: rule.file
        ? `${rule.file}${rule.line ? ` · 第 ${rule.line} 行` : ""}`
        : "规则预检查",
      title: rule.title,
      severity: normalizeRiskLevel(rule.severity),
      description: rule.message,
    }));
  }, [displayRuleCheckResults]);

  // ── Draft init ─────────────────────────────────────────
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setDraftComments((prev) => {
        if (prev.length > 0) return prev;
        return displayReviewFindings.slice(0, 2).map((finding) => ({
          id: `draft-${finding.id}`,
          sourceFindingId: finding.id,
          title: finding.title,
          severity: finding.level,
          selected: true,
          edited: false,
          body: `**${finding.title}**\n\n${finding.description}\n\n建议：${finding.suggestion}\n\n证据：${finding.evidence[0]?.file ?? "暂无"}${finding.evidence[0]?.line ? ` · 第 ${finding.evidence[0].line} 行` : ""}\n\n置信度：${finding.confidence}%`,
        }));
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [displayReviewFindings]);

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
      : calculateRiskScore(displayRisks);

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
    { key: "suggestion", label: "审查建议", icon: <MessageIcon className="h-4 w-4" />,
      description: "AI 建议先进入草稿，由人工确认后再复制使用。" },
    { key: "testGap", label: "测试缺口", icon: <BeakerIcon className="h-4 w-4" />,
      description: "根据变更文件识别潜在测试覆盖缺口。" },
    { key: "draft", label: "评论草稿箱", icon: <FileIcon className="h-4 w-4" />,
      description: "将风险发现整理成可编辑、可筛选、可复制的 Review 评论草稿。" },
    { key: "order", label: "智能审查顺序", icon: <SparkIcon className="h-4 w-4" />,
      description: "根据风险等级、审查依据与潜在影响面生成优先级。" },
    { key: "markdown", label: "Markdown 报告", icon: <FileIcon className="h-4 w-4" />,
      description: "预览可复制、可下载的 Markdown 审查报告。" },
  ];

  return {
    analysisData, setAnalysisData, inputUrl, setInputUrl,
    showChangedFilesModal, setShowChangedFilesModal,
    retrying, setRetrying, retryError, setRetryError,
    copyStatus, setCopyStatus, draftCopyStatus, setDraftCopyStatus,
    activeTab, setActiveTab, draftComments, setDraftComments,
    isMock, displayChangedFiles, displayPrInfo, displaySummary,
    displayRisks, displayReviewFindings, displaySuggestions,
    displayRuleCheckResults, displayTestGaps, displayReviewOrder,
    selectedDraftText, displayMarkdownLines, markdownReport,
    displayWarnings, displayOverview, displayDashboard, tabs,
  };
}
