export function tenantIdFromJwt(token?: string | null): string | null {
  try {
    if (!token) return null;
    const [, p] = token.split(".");
    const payload = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload?.tid === "string" ? payload.tid : null;
  } catch {
    return null;
  }
}
