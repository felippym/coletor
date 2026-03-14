import type { Inventory, InventoryStatus } from "@/types/inventory";

function withDefaultStatus(inv: Record<string, unknown>): Inventory {
  const status = (inv.status as InventoryStatus) || "em_contagem";
  return { ...inv, status } as Inventory;
}
import { getSupabase, isSupabaseConfigured } from "./supabase";

const STORAGE_KEY = "inventories";

// --- localStorage (fallback) ---
function getFromLocalStorage(): Inventory[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(inventory: Inventory): void {
  const inventories = getFromLocalStorage();
  const index = inventories.findIndex((i) => i.id === inventory.id);
  if (index >= 0) {
    inventories[index] = inventory;
  } else {
    inventories.push(inventory);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(inventories));
}

// --- Supabase ---
/**
 * Lista inventários. Admin vê todos; usuários normais veem apenas da sua loja.
 * @param lojaId - ID da loja do usuário (null = admin, vê todos)
 * @param lojaUsername - Fallback para localStorage quando não há Supabase/userId
 */
export async function getInventories(
  lojaId?: string | null,
  lojaUsername?: string | null
): Promise<Inventory[]> {
  const supabase = getSupabase();
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase.from("inventories").select("*").order("created_at", { ascending: false });
      if (lojaId != null && lojaId !== "") {
        query = query.eq("loja_id", lojaId);
      }
      const { data, error } = await query;
      if (!error && data) {
        return data.map((row) => ({
          id: row.id,
          name: row.name,
          createdAt: row.created_at,
          items: row.items ?? [],
          status: row.status ?? "em_contagem",
          lojaId: row.loja_id ?? undefined,
          usuarioId: row.usuario_id ?? undefined,
        }));
      }
      if (error) console.error("[Supabase] getInventories:", error.message);
    } catch (err) {
      console.error("[Supabase] getInventories error:", err);
    }
  }
  let local = getFromLocalStorage().map((i) => withDefaultStatus(i as unknown as Record<string, unknown>));
  if (lojaId != null && lojaId !== "") {
    local = local.filter((i) => i.lojaId === lojaId);
  } else if (lojaUsername != null && lojaUsername !== "") {
    local = local.filter((i) => i.lojaUsername === lojaUsername);
  }
  return local;
}

export async function saveInventory(inventory: Inventory): Promise<void> {
  const supabase = getSupabase();
  if (isSupabaseConfigured() && supabase) {
    try {
      const payload: Record<string, unknown> = {
        id: inventory.id,
        name: inventory.name,
        created_at: inventory.createdAt,
        items: inventory.items,
        status: inventory.status ?? "em_contagem",
      };
      if (inventory.lojaId != null) payload.loja_id = inventory.lojaId;
      if (inventory.usuarioId != null) payload.usuario_id = inventory.usuarioId;
      const { error } = await supabase.from("inventories").upsert(payload, { onConflict: "id" });
      if (!error) return;
      if (error) console.error("[Supabase] saveInventory:", error.message);
    } catch (err) {
      console.error("[Supabase] saveInventory error:", err);
    }
  }
  saveToLocalStorage(inventory);
}

export async function getInventory(id: string): Promise<Inventory | null> {
  const supabase = getSupabase();
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from("inventories")
        .select("*")
        .eq("id", id)
        .single();
      if (!error && data) {
        return {
          id: data.id,
          name: data.name,
          createdAt: data.created_at,
          items: data.items ?? [],
          status: data.status ?? "em_contagem",
          lojaId: data.loja_id ?? undefined,
          usuarioId: data.usuario_id ?? undefined,
        };
      }
      if (error && error.code !== "PGRST116") console.error("[Supabase] getInventory:", error.message);
    } catch (err) {
      console.error("[Supabase] getInventory error:", err);
    }
  }
  const found = getFromLocalStorage().find((i) => i.id === id);
  return found ? withDefaultStatus(found as unknown as Record<string, unknown>) : null;
}

export async function deleteInventory(id: string): Promise<void> {
  const supabase = getSupabase();
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.from("inventories").delete().eq("id", id);
      if (!error) return;
      if (error) console.error("[Supabase] deleteInventory:", error.message);
    } catch (err) {
      console.error("[Supabase] deleteInventory error:", err);
    }
  }
  const inventories = getFromLocalStorage().filter((i) => i.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(inventories));
}

/**
 * @param lojaId - Se informado e não admin, deleta apenas inventários da loja.
 * @param lojaUsername - Fallback para localStorage.
 */
export async function deleteAllInventories(
  lojaId?: string | null,
  lojaUsername?: string | null,
  isAdmin?: boolean
): Promise<void> {
  const supabase = getSupabase();
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase.from("inventories").select("id");
      if (!isAdmin && lojaId != null && lojaId !== "") {
        query = query.eq("loja_id", lojaId);
      }
      const { data } = await query;
      if (data && data.length > 0) {
        for (const row of data) {
          await supabase.from("inventories").delete().eq("id", row.id);
        }
      }
    } catch (err) {
      console.error("[Supabase] deleteAllInventories error:", err);
    }
  }
  if (!isAdmin && lojaId != null && lojaId !== "") {
    const local = getFromLocalStorage().filter((i) => i.lojaId !== lojaId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
  } else if (!isAdmin && lojaUsername != null && lojaUsername !== "") {
    const local = getFromLocalStorage().filter((i) => i.lojaUsername !== lojaUsername);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
  } else {
    localStorage.setItem(STORAGE_KEY, "[]");
  }
}
