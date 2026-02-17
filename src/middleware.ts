import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Allow tests to bypass auth when PLAYWRIGHT=1
    if (process.env.PLAYWRIGHT === '1' || process.env.NODE_ENV === 'test') {
      return NextResponse.next();
    }

    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // 🚫 MEKANIK tidak boleh ke halaman admin
    if (
      token?.role === "MEKANIK" &&
      (
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/inventory")
      )
    ) {
      return NextResponse.redirect(new URL("/mekanik/worklist", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow public API routes (Auth)
        if (req.nextUrl.pathname.startsWith('/api/auth')) {
          return true;
        }
        // semua route di matcher WAJIB login
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/worklist/:path*",
    "/history/:path*",
    "/vehicle-record/:path*",
    "/inventory/:path*",
    "/billing/:path*",
    "/api/:path*", // Protect all API routes
  ],
};
