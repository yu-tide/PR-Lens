// ============================================================
// PR Lens — 规则定义与常量
// ============================================================

import type { ChangedFile, RuleCheckResult } from "@/types";

// ============================================================
// 工具函数
// ============================================================

/** 规范化文本：小写 + 去首尾空白 */
export function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

/** 检查文本（已规范化）是否包含任意关键词 */
export function containsAnyKeyword(normalizedText: string, keywords: string[]): boolean {
  return keywords.some((kw) => normalizedText.includes(kw));
}

/** 从 patch 中提取新增行（以 + 开头，排除文件头 +++） */
export function getAddedPatchLines(patch: string | undefined): string[] {
  if (!patch) return [];
  return patch
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"));
}

// ============================================================
// 规则常量
// ============================================================

const DEPENDENCY_FILES = [
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "requirements.txt",
  "go.mod",
  "go.sum",
  "pom.xml",
  "build.gradle",
  "Cargo.toml",
  "Cargo.lock",
];

/**
 * 配置路径/文件名。
 * 以 "/" 结尾 → 目录前缀匹配；否则 → 精确 basename 匹配。
 */
const CONFIG_PATTERNS = [
  ".env",
  ".env.example",
  ".env.local",
  "config/",
  "configs/",
  "settings/",
  ".github/workflows/",
  "docker-compose.yml",
  "docker-compose.yaml",
  "Dockerfile",
  "vercel.json",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
];

const AUTH_KEYWORDS = [
  "auth", "token", "permission", "session", "jwt",
  "login", "role", "access", "oauth", "middleware",
];

const SECRET_KEYWORDS = [
  "api_key", "apikey", "secret", "password",
  "access_token", "private_key", "client_secret",
  "authorization", "bearer",
];

const EXTERNAL_CALL_KEYWORDS = [
  "fetch(", "axios", "request(",
  "http", "https", "database",
  "query(", "execute(",
];

// ============================================================
// 规则检查函数（每条规则一个函数，返回 null 表示未命中）
// ============================================================

/** 规则 1：依赖文件变更 */
export function checkDependencyFile(file: ChangedFile): RuleCheckResult | null {
  const fn = normalizeText(file.filename);
  const basename = fn.split("/").pop() ?? fn;
  const hit = DEPENDENCY_FILES.some((d) => basename === normalizeText(d));
  if (!hit) return null;

  return {
    id: `dependency-file-changed:${file.filename}`,
    title: "依赖文件变更",
    message: `依赖文件 "${file.filename}" 发生变更，可能引入新的依赖或版本升级，建议人工确认变更是否符合预期。`,
    severity: "medium",
    file: file.filename,
  };
}

/** 规则 2：配置文件变更 */
export function checkConfigFile(file: ChangedFile): RuleCheckResult | null {
  const fn = normalizeText(file.filename);
  const hit = CONFIG_PATTERNS.some((pattern) => {
    if (pattern.endsWith("/")) {
      return fn.startsWith(normalizeText(pattern));
    }
    const basename = fn.split("/").pop() ?? fn;
    return basename === normalizeText(pattern);
  });
  if (!hit) return null;

  return {
    id: `config-file-changed:${file.filename}`,
    title: "配置文件变更",
    message: `配置文件 "${file.filename}" 发生变更，可能影响部署或运行环境，建议人工确认变更是否正确。`,
    severity: "medium",
    file: file.filename,
  };
}

/** 规则 3：鉴权/权限相关变更（扫描 filename + patch） */
export function checkAuthPermission(file: ChangedFile): RuleCheckResult | null {
  const haystack =
    normalizeText(file.filename) + "\n" + normalizeText(file.patch ?? "");
  if (!containsAnyKeyword(haystack, AUTH_KEYWORDS)) return null;

  return {
    id: `auth-or-permission:${file.filename}`,
    title: "鉴权/权限相关变更",
    message: `文件 "${file.filename}" 包含鉴权或权限相关关键词，建议重点人工审查该变更是否会影响系统安全。`,
    severity: "high",
    file: file.filename,
  };
}

/** 规则 4：疑似硬编码敏感信息（仅扫描 patch，不输出匹配内容） */
export function checkHardcodedSecret(file: ChangedFile): RuleCheckResult | null {
  if (!file.patch) return null;

  const np = normalizeText(file.patch);
  if (!containsAnyKeyword(np, SECRET_KEYWORDS)) return null;

  return {
    id: `possible-hardcoded-secret:${file.filename}`,
    title: "疑似硬编码敏感信息",
    message: `文件 "${file.filename}" 的变更中包含疑似密钥或敏感信息的关键词，请人工确认是否为真实密钥泄露，切勿将密钥提交到仓库。`,
    severity: "high",
    file: file.filename,
  };
}

/** 规则 5：大量代码删除 */
export function checkLargeDeletion(file: ChangedFile): RuleCheckResult | null {
  if (file.deletions < 80) return null;

  return {
    id: `large-file-deletion:${file.filename}`,
    title: "大量代码删除",
    message: `文件 "${file.filename}" 删除了 ${file.deletions} 行代码，可能影响现有功能或导致未引用的死代码，建议人工确认删除逻辑是否安全。`,
    severity: "medium",
    file: file.filename,
  };
}

/** 规则 6：新增外部调用（优先扫描 patch 新增行） */
export function checkExternalCall(file: ChangedFile): RuleCheckResult | null {
  const addedLines = getAddedPatchLines(file.patch);
  if (addedLines.length === 0) return null;

  const haystack = normalizeText(addedLines.join("\n"));
  if (!containsAnyKeyword(haystack, EXTERNAL_CALL_KEYWORDS)) return null;

  return {
    id: `external-call-added:${file.filename}`,
    title: "新增外部调用",
    message: `文件 "${file.filename}" 的变更中可能新增了外部调用（如 HTTP 请求、数据库查询等），建议确认调用的安全性、错误处理和超时控制。`,
    severity: "medium",
    file: file.filename,
  };
}

/** 规则 7：Diff 不可完整获取 */
export function checkDiffAvailability(file: ChangedFile): RuleCheckResult | null {
  if (file.isBinary !== true && file.isTooLarge !== true) return null;

  const reason = file.isBinary ? "疑似二进制文件" : "diff 过大已被裁剪";
  return {
    id: `diff-not-fully-available:${file.filename}`,
    title: "Diff 不可完整获取",
    message: `文件 "${file.filename}" 的 diff 内容不可完整获取（${reason}），无法进行完整的自动化分析，建议人工审查该文件的变更。`,
    severity: "low",
    file: file.filename,
  };
}
