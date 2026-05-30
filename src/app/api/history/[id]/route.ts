import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;

  // 校验归属：只能删自己的记录
  const entry = await prisma.analysis.findUnique({ where: { id } });
  if (!entry || entry.userId !== user.id) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  await prisma.analysis.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
