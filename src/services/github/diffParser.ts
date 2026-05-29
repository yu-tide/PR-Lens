// ============================================================
// PR Lens — 轻量 Diff 处理工具
// ============================================================

/** 单次 patch 最多保留行数 */
export const MAX_PATCH_LINES = 300;

/** 超大 patch 裁剪后的尾部提示 */
const TRUNCATION_NOTE = "... Diff truncated by PR Lens because it is too large.";

/** normalizePatch 返回值 */
export type NormalizedPatch = {
  patch?: string;
  isBinary: boolean;
  isTooLarge: boolean;
};

/**
 * 对 GitHub API 返回的 patch 做轻量规范化处理。
 *
 * - 如果 patch 为空，标记为疑似二进制文件
 * - 如果 patch 行数超过 MAX_PATCH_LINES，保留前 300 行并追加裁剪说明
 * - 否则原样返回
 */
export function normalizePatch(patch: string | undefined): NormalizedPatch {
  /* 无 patch → 视为二进制或 GitHub 未返回 */
  if (!patch) {
    return { patch: undefined, isBinary: true, isTooLarge: false };
  }

  const lines = patch.split("\n");

  /* 行数在限制内 → 原样返回 */
  if (lines.length <= MAX_PATCH_LINES) {
    return { patch, isBinary: false, isTooLarge: false };
  }

  /* 超限 → 裁切前 MAX_PATCH_LINES 行并追加说明 */
  const truncated = lines.slice(0, MAX_PATCH_LINES).join("\n") + "\n" + TRUNCATION_NOTE;

  return { patch: truncated, isBinary: false, isTooLarge: true };
}
