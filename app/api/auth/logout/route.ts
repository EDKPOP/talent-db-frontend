import { NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';

/** 접근 게이트 로그아웃 — 서버 세션 쿠키를 만료시킨다 (COU-2114). */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(): Promise<Response> {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
