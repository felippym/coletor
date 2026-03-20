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
function rowToInventory(row: Record<string, unknown>): Inventory {
  return withDefaultStatus({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    items: row.items ?? [],
    status: row.status ?? "em_contagem",
    observation: row.observation ?? undefined,
    createdBy: row.created_by as string | undefined,
    funcionario: (row.funcionario as string | null | undefined)?.trim() || undefined,
  } as Record<string, unknown>);
}

export async function getInventories(): Promise<Inventory[]> {
  const local = getFromLocalStorage().map((i) => withDefaultStatus(i as unknown as Record<string, unknown>));
  const supabase = getSupabase();
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from("inventories")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        const fromSupabase = data.map((row) => rowToInventory(row as Record<string, unknown>));
        const byId = new Map<string, Inventory>();
        for (const inv of [...local, ...fromSupabase]) {
          byId.set(inv.id, inv);
        }
        return Array.from(byId.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      if (error) console.error("[Supabase] getInventories:", error.message);
    } catch (err) {
      console.error("[Supabase] getInventories error:", err);
    }
  }
  return local;
}

export async function saveInventory(inventory: Inventory): Promise<void> {
  const supabase = getSupabase();
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.from("inventories").upsert(
        {
          id: inventory.id,
          name: inventory.name,
          created_at: inventory.createdAt,
          items: inventory.items,
          status: inventory.status ?? "em_contagem",
          observation: inventory.observation ?? null,
          created_by: inventory.createdBy ?? null,
          funcionario: inventory.funcionario?.trim() || null,
        },
        { onConflict: "id" }
      );
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
        return withDefaultStatus({
          id: data.id,
          name: data.name,
          createdAt: data.created_at,
          items: data.items ?? [],
          status: data.status ?? "em_contagem",
          observation: data.observation ?? undefined,
          createdBy: data.created_by as string | undefined,
          funcionario: (data.funcionario as string | null | undefined)?.trim() || undefined,
        } as Record<string, unknown>);
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
      if (error) console.error("[Supabase] deleteInventory:", error.message);
    } catch (err) {
      console.error("[Supabase] deleteInventory error:", err);
    }
  }
  const inventories = getFromLocalStorage().filter((i) => i.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(inventories));
}
