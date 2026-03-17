import type { NFeConference, NFeInvoice, NFeProduct } from "@/types/nfe";
import { getSupabase, isSupabaseConfigured } from "./supabase";

const STORAGE_KEY = "nfe_conferences";

function getFromLocalStorage(): NFeConference[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(conference: NFeConference): void {
  const list = getFromLocalStorage();
  const index = list.findIndex((c) => c.id === conference.id);
  if (index >= 0) {
    list[index] = conference;
  } else {
    list.push(conference);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function getNFeConferences(): Promise<NFeConference[]> {
  const supabase = getSupabase();
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from("nfe_conferences")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        return data.map((row) => ({
          id: row.id,
          key: row.key ?? "",
          invoiceNumber: row.invoice_number ?? "",
          supplierName: row.supplier_name ?? "",
          supplierCnpj: row.supplier_cnpj ?? undefined,
          issueDate: row.issue_date ?? "",
          products: (row.products ?? []) as NFeProduct[],
          createdAt: row.created_at ?? "",
          observation: row.observation ?? undefined,
          startedBy: row.started_by ?? undefined,
          destRazaoSocial: row.dest_razao_social ?? undefined,
          destCnpj: row.dest_cnpj ?? undefined,
          status: (row.status as NFeConference["status"]) ?? undefined,
          createdBy: row.created_by as string | undefined,
        }));
      }
      if (error) console.error("[Supabase] getNFeConferences:", error.message);
      return [];
    } catch (err) {
      console.error("[Supabase] getNFeConferences error:", err);
      return [];
    }
  }
  return getFromLocalStorage();
}

export async function saveNFeConference(conference: NFeConference): Promise<void> {
  const supabase = getSupabase();
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.from("nfe_conferences").upsert(
        {
          id: conference.id,
          key: conference.key,
          invoice_number: conference.invoiceNumber,
          supplier_name: conference.supplierName,
          supplier_cnpj: conference.supplierCnpj ?? null,
          issue_date: conference.issueDate,
          products: conference.products,
          created_at: conference.createdAt,
          observation: conference.observation ?? null,
          started_by: conference.startedBy ?? null,
          dest_razao_social: conference.destRazaoSocial ?? null,
          dest_cnpj: conference.destCnpj ?? null,
          status: conference.status ?? null,
          created_by: conference.createdBy ?? null,
        },
        { onConflict: "id" }
      );
      if (!error) return;
      if (error) {
        console.error("[Supabase] saveNFeConference:", error.message);
        throw new Error(error.message);
      }
    } catch (err) {
      console.error("[Supabase] saveNFeConference error:", err);
      throw err;
    }
  } else {
    saveToLocalStorage(conference);
  }
}

export async function getNFeConference(id: string): Promise<NFeConference | null> {
  const supabase = getSupabase();
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from("nfe_conferences")
        .select("*")
        .eq("id", id)
        .single();
      if (!error && data) {
        return {
          id: data.id,
          key: data.key ?? "",
          invoiceNumber: data.invoice_number ?? "",
          supplierName: data.supplier_name ?? "",
          supplierCnpj: data.supplier_cnpj ?? undefined,
          issueDate: data.issue_date ?? "",
          products: (data.products ?? []) as NFeProduct[],
          createdAt: data.created_at ?? "",
          observation: data.observation ?? undefined,
          startedBy: data.started_by ?? undefined,
          destRazaoSocial: data.dest_razao_social ?? undefined,
          destCnpj: data.dest_cnpj ?? undefined,
          status: (data.status as NFeConference["status"]) ?? undefined,
          createdBy: data.created_by as string | undefined,
        };
      }
      if (error && error.code !== "PGRST116") console.error("[Supabase] getNFeConference:", error.message);
      return null;
    } catch (err) {
      console.error("[Supabase] getNFeConference error:", err);
      return null;
    }
  }
  return getFromLocalStorage().find((c) => c.id === id) ?? null;
}

export async function deleteNFeConference(id: string): Promise<void> {
  const supabase = getSupabase();
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.from("nfe_conferences").delete().eq("id", id);
      if (!error) return;
      if (error) {
        console.error("[Supabase] deleteNFeConference:", error.message);
        throw new Error(error.message);
      }
    } catch (err) {
      console.error("[Supabase] deleteNFeConference error:", err);
      throw err;
    }
  } else {
    const list = getFromLocalStorage().filter((c) => c.id !== id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  }
}

export function createNFeConferenceFromInvoice(
  invoice: NFeInvoice,
  startedBy?: string,
  createdBy?: string
): NFeConference {
  return {
    ...invoice,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    startedBy,
    createdBy,
  };
}
