// ============================================================
// PR Lens — AI 分析编排
// ============================================================

import type { AiAnalysisInput, AiAnalysisResult } from "@/types";
import { buildAiReviewPrompt } from "./promptTemplates";
import { callAiChatCompletion } from "./aiClient";
import { parseAIOutput } from "./parseAIOutput";

/**
 * 执行完整的 AI PR Review 分析流程。
 *
 * 1. 构建 prompt
 * 2. 调用百炼 Chat Completions
 * 3. 解析并清洗 AI 输出
 *
 * @throws 如果 AI 调用或输出解析失败，直接抛出错误（由 route.ts 统一 fallback）。
 */
export async function analyzePrWithAI(
  input: AiAnalysisInput,
): Promise<AiAnalysisResult> {
  const { systemPrompt, userPrompt } = buildAiReviewPrompt(input);

  const content = await callAiChatCompletion({
    systemPrompt,
    userPrompt,
  });

  const reviewResult = parseAIOutput(content);

  return {
    reviewResult,
    source: "bailian",
  };
}
