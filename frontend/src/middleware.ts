import { NextRequest, NextResponse } from "next/server";

// Injeta a chave da API no servidor (nunca exposta ao navegador) quando o
// dashboard é acessado diretamente pelo Next.js e /api é reescrito para o backend.
export function middleware(request: NextRequest) {
  const key = process.env.API_ACCESS_KEY;
  if (!key) return NextResponse.next();
  const headers = new Headers(request.headers);
  headers.set("X-API-Key", key);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: "/api/:path*" };
