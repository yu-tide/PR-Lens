"use client";

import { useRouter } from "next/navigation";
import type {
  AnalyzePrResponse, DraftComment, ReviewFindingDisplay, TabKey, ReviewerPersona,
} from "@/types";
import { requestAnalyzePr } from "@/services/client/analyzePrClient";
import { SESSION_KEY } from "@/utils/result-fallbacks";
import type { PrInfoDisplay } from "@/utils/result-fallbacks";

// ============================================================
// Hook Params
// ============================================================

interface UseResultActionsParams {
  inputUrl: string;
  setAnalysisData: (data: AnalyzePrResponse | null) => void;
  setRetrying: (v: boolean) => void;
  setRetryError: (v: string) => void;
  setCopyStatus: (v: "idle" | "success" | "error") => void;
  setDraftCopyStatus: (v: "idle" | "success" | "error") => void;
  setActiveTab: (tab: TabKey) => void;
  setDraftComments: React.Dispatch<React.SetStateAction<DraftComment[]>>;
  displayPrInfo: PrInfoDisplay;
  markdownReport: string;
  selectedDraftText: string;
  reviewerPersona?: ReviewerPersona;
}

// ============================================================
// Hook Return Type
// ============================================================

interface UseResultActionsReturn {
  handleRetryAnalysis: () => Promise<void>;
  handleCopyReport: () => Promise<void>;
  handleDownloadReport: () => void;
  handleAddFindingToDraft: (finding: ReviewFindingDisplay) => void;
  handleUpdateDraftBody: (id: string, body: string) => void;
  handleToggleDraft: (id: string) => void;
  handleDeleteDraft: (id: string) => void;
  handleCopyDraft: () => Promise<void>;
}

// ============================================================
// Hook
// ============================================================

export function useResultActions({
  inputUrl,
  setAnalysisData,
  setRetrying,
  setRetryError,
  setCopyStatus,
  setDraftCopyStatus,
  setActiveTab,
  setDraftComments,
  displayPrInfo,
  markdownReport,
  selectedDraftText,
  reviewerPersona,
}: UseResultActionsParams): UseResultActionsReturn {
  const router = useRouter();

  // ── Build report filename ──────────────────────────────
  function buildReportFilename(info: PrInfoDisplay): string {
    const repo = info.repo.replace(/[^a-zA-Z0-9_-]+/g, "-");
    const prNumber = info.prNumber.replace(/[^0-9]+/g, "") || "unknown";
    return `${repo}-pr-${prNumber}-review.md`;
  }

  // ── Retry analysis ─────────────────────────────────────
  async function handleRetryAnalysis() {
    if (!inputUrl) {
      router.push("/");
      return;
    }

    setRetrying(true);
    setRetryError("");

    try {
      const data = await requestAnalyzePr({
        url: inputUrl,
        useMock: false,
        reviewerPersona,
      });

      if (!data.success) {
        setRetryError(data.error?.message ?? "重新分析失败，请稍后重试");
        return;
      }

      try {
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ data, inputUrl, reviewerPersona }),
        );
      } catch {
        /* sessionStorage 不可用时忽略 */
      }

      setAnalysisData(data);
    } catch {
      setRetryError("网络异常，请稍后重试");
    } finally {
      setRetrying(false);
    }
  }

  // ── Copy report ────────────────────────────────────────
  async function handleCopyReport() {
    try {
      await navigator.clipboard.writeText(markdownReport);
      setCopyStatus("success");
      window.setTimeout(() => setCopyStatus("idle"), 1600);
    } catch {
      setCopyStatus("error");
      window.setTimeout(() => setCopyStatus("idle"), 1600);
    }
  }

  // ── Download report ────────────────────────────────────
  function handleDownloadReport() {
    const blob = new Blob([markdownReport], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildReportFilename(displayPrInfo);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  // ── Add finding to draft ───────────────────────────────
  function handleAddFindingToDraft(finding: ReviewFindingDisplay) {
    setDraftComments((prev) => {
      const existed = prev.some((item) => item.sourceFindingId === finding.id);
      if (existed) return prev;

      return [
        ...prev,
        {
          id: `draft-${finding.id}`,
          sourceFindingId: finding.id,
          title: finding.title,
          severity: finding.level,
          selected: true,
          edited: false,
          body: `**${finding.title}**\n\n${finding.description}\n\n建议：${finding.suggestion}\n\n证据：${finding.evidence[0]?.file ?? "暂无"}${finding.evidence[0]?.line ? ` · 第 ${finding.evidence[0].line} 行` : ""}\n\n置信度：${finding.confidence}%`,
        },
      ];
    });

    setActiveTab("draft");
  }

  // ── Update draft body ──────────────────────────────────
  function handleUpdateDraftBody(id: string, body: string) {
    setDraftComments((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, body, edited: true }
          : item,
      ),
    );
  }

  // ── Toggle draft selection ─────────────────────────────
  function handleToggleDraft(id: string) {
    setDraftComments((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, selected: !item.selected }
          : item,
      ),
    );
  }

  // ── Delete draft ───────────────────────────────────────
  function handleDeleteDraft(id: string) {
    setDraftComments((prev) => prev.filter((item) => item.id !== id));
  }

  // ── Copy draft ─────────────────────────────────────────
  async function handleCopyDraft() {
    try {
      await navigator.clipboard.writeText(selectedDraftText || "暂无选中的评论草稿");
      setDraftCopyStatus("success");
      window.setTimeout(() => setDraftCopyStatus("idle"), 1600);
    } catch {
      setDraftCopyStatus("error");
      window.setTimeout(() => setDraftCopyStatus("idle"), 1600);
    }
  }

  return {
    handleRetryAnalysis,
    handleCopyReport,
    handleDownloadReport,
    handleAddFindingToDraft,
    handleUpdateDraftBody,
    handleToggleDraft,
    handleDeleteDraft,
    handleCopyDraft,
  };
}
