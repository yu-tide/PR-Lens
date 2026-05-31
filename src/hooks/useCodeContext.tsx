"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";

// ============================================================
// Types
// ============================================================

export interface CodeContextOpenParams {
  filePath: string;
  lineNumber?: number;
}

export interface PrContext {
  owner: string;
  repo: string;
  ref: string;
}

interface CodeContextState {
  open: boolean;
  filePath: string;
  lineNumber: number;
  /** 当前 PR 的 GitHub 仓库上下文，mock 模式或未设置时为 null */
  prContext: PrContext | null;
  openCodeContext: (params: CodeContextOpenParams) => void;
  closeCodeContext: () => void;
  /** 设置 PR 上下文，在结果页加载分析数据时调用 */
  setPrContext: (ctx: PrContext | null) => void;
}

// ============================================================
// Context
// ============================================================

const CodeContextCtx = createContext<CodeContextState | null>(null);

// ============================================================
// Hook
// ============================================================

export function useCodeContext(): CodeContextState {
  const ctx = useContext(CodeContextCtx);
  if (!ctx) {
    // 未包裹 Provider 时返回空操作，避免报错（降级行为）
    return {
      open: false,
      filePath: "",
      lineNumber: 0,
      prContext: null,
      openCodeContext: () => {},
      closeCodeContext: () => {},
      setPrContext: () => {},
    };
  }
  return ctx;
}

// ============================================================
// Provider
// ============================================================

export function CodeContextProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [filePath, setFilePath] = useState("");
  const [lineNumber, setLineNumber] = useState(0);
  const [prContext, setPrContext] = useState<PrContext | null>(null);

  const openCodeContext = useCallback(
    (params: CodeContextOpenParams) => {
      setFilePath(params.filePath);
      setLineNumber(params.lineNumber ?? 0);
      setOpen(true);
    },
    [],
  );

  const closeCodeContext = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <CodeContextCtx.Provider
      value={{
        open,
        filePath,
        lineNumber,
        prContext,
        openCodeContext,
        closeCodeContext,
        setPrContext,
      }}
    >
      {children}
    </CodeContextCtx.Provider>
  );
}
