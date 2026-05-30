import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "pr-lens-dev-secret-key-2024",
);

const COOKIE_NAME = "pr-lens-token";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 天

export interface SessionUser {
  id: string;
  username: string;
}

// ============================================================
// JWT 签发
// ============================================================

export async function signToken(user: SessionUser): Promise<string> {
  return new SignJWT({ id: user.id, username: user.username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(SECRET);
}

// ============================================================
// 从请求 cookie 中验证 token，返回用户或 null
// ============================================================

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET);
    return { id: payload.id as string, username: payload.username as string };
  } catch {
    return null;
  }
}

// ============================================================
// 设置 / 清除 cookie 的 Response 选项
// ============================================================

export function setTokenCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function clearTokenCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}
