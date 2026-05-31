"use client";

import type { ReactNode } from "react";
import { CodeContextProvider } from "@/hooks/useCodeContext";
import { CodeContextModal } from "@/components/CodeContextModal";

/**
 * 包裹 CodeContextProvider 并渲染 CodeContextModal。
 * 必须在客户端组件中渲染，因此提取为独立文件。
 */
export function CodeContextLayout({ children }: { children: ReactNode }) {
  return (
    <CodeContextProvider>
      {children}
      <CodeContextModal />
    </CodeContextProvider>
  );
}
