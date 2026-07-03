import { supabase } from "@/lib/supabase";
import type { CatRecord, RecordType } from "@/types";

export interface RecordsRange {
  catId: string;
  startISO: string; // inclusive
  endISO: string; // exclusive
}

export async function getRecordsInRange({ catId, startISO, endISO }: RecordsRange): Promise<CatRecord[]> {
  const { data, error } = await supabase
    .from("records")
    .select("*")
    .eq("cat_id", catId)
    .gte("recorded_at", startISO)
    .lt("recorded_at", endISO)
    .order("recorded_at", { ascending: true });
  if (error) throw error;
  return data;
}

export interface CreateRecordInput {
  catId: string;
  type: RecordType;
  amountMl: number;
  recordedAt: string;
  createdBy: string;
}

export async function createRecord(input: CreateRecordInput): Promise<CatRecord> {
  const { data, error } = await supabase
    .from("records")
    .insert({
      cat_id: input.catId,
      type: input.type,
      amount_ml: input.amountMl,
      recorded_at: input.recordedAt,
      created_by: input.createdBy,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export interface UpdateRecordInput {
  id: string;
  type?: RecordType;
  amountMl?: number;
  recordedAt?: string;
}

export async function updateRecord({ id, type, amountMl, recordedAt }: UpdateRecordInput): Promise<CatRecord> {
  const { data, error } = await supabase
    .from("records")
    .update({
      ...(type !== undefined ? { type } : {}),
      ...(amountMl !== undefined ? { amount_ml: amountMl } : {}),
      ...(recordedAt !== undefined ? { recorded_at: recordedAt } : {}),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRecord(id: string): Promise<void> {
  const { error } = await supabase.from("records").delete().eq("id", id);
  if (error) throw error;
}
