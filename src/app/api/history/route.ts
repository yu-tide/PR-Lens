import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// GET — 获取当前用户的历史记录列表
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const entries = await prisma.analysis.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      repo: e.repo,
      prNumber: e.prNumber,
      prTitle: e.prTitle,
      author: e.author,
      riskScore: e.riskScore,
      riskLevel: e.riskLevel,
      data: JSON.parse(e.data),
      createdAt: e.createdAt.toISOString(),
    })),
  });
}

// POST — 保存一条分析记录
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const { prUrl, response } = (await request.json()) as {
      prUrl: string;
      response: Record<string, unknown>;
    };

    const pr = response.pullRequest as Record<string, unknown> | undefined;
    const review = response.reviewResult as Record<string, unknown> | undefined;
    const risks = (review?.risks as Array<Record<string, string>>) ?? [];

    const highCount = risks.filter((r) => r.level === "HIGH").length;
    const riskScore = risks.length > 0
      ? Math.round((highCount * 100 + (risks.length - highCount) * 40) / risks.length)
      : 0;
    const riskLevel = riskScore >= 70 ? "high" : riskScore >= 40 ? "medium" : "low";

    const prMatch = prUrl.match(/github\.com\/[^/]+\/[^/]+\/pull\/(\d+)/);

    await prisma.analysis.create({
      data: {
        userId: user.id,
        repo: (pr?.repository as string) ?? "未知仓库",
        prNumber: prMatch ? `#${prMatch[1]}` : "N/A",
        prTitle: (pr?.title as string) ?? "未知 PR",
        author: (pr?.author as string) ?? "unknown",
        riskScore,
        riskLevel,
        data: JSON.stringify(response),
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}

// DELETE — 清空当前用户全部历史
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  await prisma.analysis.deleteMany({ where: { userId: user.id } });

  return NextResponse.json({ success: true });
}
