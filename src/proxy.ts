import { NextResponse, type NextRequest } from "next/server";
import { isSupportedRoute } from "@/config/navigation/routes";
// Validate route shapes before App Router starts streaming its response.
// This is navigation validation, not authentication or authorisation.
export function proxy(request: NextRequest) {
  if (!isSupportedRoute(request.nextUrl.pathname))
    return NextResponse.rewrite(new URL("/unsupported-route", request.url), {
      status: 404,
    });
  return NextResponse.next();
}
export const config = {
  matcher: ["/owner/:path*", "/coach/:path*", "/parent/:path*"],
};
