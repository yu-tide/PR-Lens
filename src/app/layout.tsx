import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PR Lens",
  description: "AI-assisted Pull Request review tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
