import { NextResponse, type NextRequest } from "next/server";

const TOKEN_COOKIE = "worksphere_token";

// Route groups don't add a URL segment, so these are the real paths for
// src/app/(dashboard)/* pages.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/advisor",
  "/employees",
  "/departments",
  "/attendance",
  "/leave",
  "/admin",
];

const AUTH_PATHS = ["/login", "/register-company"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const { pathname } = request.nextUrl;

  if (matchesPrefix(pathname, PROTECTED_PREFIXES) && !token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (matchesPrefix(pathname, AUTH_PATHS) && token) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/advisor/:path*",
    "/employees/:path*",
    "/departments/:path*",
    "/attendance/:path*",
    "/leave/:path*",
    "/admin/:path*",
    "/login",
    "/register-company",
  ],
};
