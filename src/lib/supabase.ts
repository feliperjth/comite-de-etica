import { createClient } from "@supabase/supabase-js";

export type ProjectStatus = "submitted" | "reviewing" | "corrections" | "approved" | "rejected" | "certified";

export type Project = {
  id: string;
  title: string;
  researcher_name: string;
  researcher_email: string;
  researcher_role: string | null;
  project_type: string;
  theme: string;
  abstract: string | null;
  status: ProjectStatus;
  reviewer: string | null;
  reviewer2: string | null;
  progress: number;
  tracking_code: string | null;
  current_round: number | null;
  created_at: string;
  advisor_name: string | null;
  funding_type: string | null;
  funding_folio: string | null;
  funding_detail: string | null;
  researcher_rut: string | null;
};

export type Document = {
  id: string;
  project_id: string;
  doc_type: string;
  file_name: string;
  file_path: string | null;
  created_at: string;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = !!(url && key);

export function getSupabase() {
  if (!url || !key) throw new Error("Supabase no configurado. Agrega NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
  return createClient(url, key);
}
