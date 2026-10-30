import { NextResponse } from "next/server";

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const base = (process.env.BACKEND_API_URL || "http://127.0.0.1:8080/api").replace(/\/$/, "");
  const target = `${base}/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`;
  try {
    const authorization = request.headers.get("authorization");
    const response = await fetch(target, {
      method: request.method,
      headers: { "Content-Type": "application/json", ...(authorization ? { Authorization: authorization } : {}),
        ...(request.headers.get("x-billing-signature") ? { "X-Billing-Signature": request.headers.get("x-billing-signature")! } : {}),
        ...(request.headers.get("x-billing-timestamp") ? { "X-Billing-Timestamp": request.headers.get("x-billing-timestamp")! } : {}),
      },
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(25000),
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "The backend is unavailable. Please try again once the API server is running." }, { status: 502 });
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
