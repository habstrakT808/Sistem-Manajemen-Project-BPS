// File: src/app/middleware.ts
// UPDATED: Enhanced middleware with role-based redirects

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Update session first
  const response = await updateSession(request);

  // Handle role-based redirects for login page
  if (request.nextUrl.pathname === "/auth/login") {
    const role = request.nextUrl.searchParams.get("role");
    if (role) {
      // Prefetch the likely destination based on role hint
      const destinations = {
        admin: "/admin",
        ketua_tim: "/ketua-tim",
        pegawai: "/pegawai",
      };

      const destination = destinations[role as keyof typeof destinations];
      if (destination) {
        // Add prefetch header for the client
        response.headers.set("X-Prefetch-Destination", destination);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
