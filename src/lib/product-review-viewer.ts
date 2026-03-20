/** Header enviado nas rotas /api/product-review/* com o usuário logado (session). */
export const VIEWER_HEADER = "x-viewer-user";

export function normalizeViewerUser(raw: string | null | undefined): string | null {
  const s = raw?.trim().toLowerCase();
  return s || null;
}

export function canAccessTicket(
  viewer: string | null,
  ticketCreatedBy: string | null | undefined
): boolean {
  if (!viewer) return false;
  if (viewer === "admin") return true;
  const owner = ticketCreatedBy?.trim().toLowerCase() ?? "";
  if (!owner) return false;
  return owner === viewer;
}
