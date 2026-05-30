import { NextResponse } from "next/server";
import { clearTokenCookie } from "@/lib/auth";

export async function POST() {
  return NextResponse.json(
    { success: true },
    { headers: { "Set-Cookie": clearTokenCookie() } },
  );
}
