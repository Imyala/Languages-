import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "gl_uid";
const ONE_YEAR = 60 * 60 * 24 * 365;

// Issue an anonymous user id cookie on first visit. Pages and route handlers
// can then read it via cookies(). DB row gets created lazily on first read.
export function proxy(req: NextRequest) {
  const has = req.cookies.get(COOKIE_NAME);
  if (has) return NextResponse.next();

  const newId = crypto.randomUUID();
  const res = NextResponse.next();
  res.cookies.set(COOKIE_NAME, newId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
  return res;
}

export const config = {
  // Run on every page + api route, skip static assets.
  matcher: ["/((?!_next/|favicon.ico|manifest.webmanifest|icon.svg).*)"],
};
