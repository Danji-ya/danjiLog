import { supabase } from "@/lib/supabase";
import type { Cat } from "@/types";

export async function getCats(): Promise<Cat[]> {
  const { data, error } = await supabase
    .from("cats")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

// 확장을 고려해 여러 마리를 저장할 수 있지만, 현재 UI는 첫 번째 고양이만 사용합니다.
export async function getPrimaryCat(): Promise<Cat | null> {
  const cats = await getCats();
  return cats[0] ?? null;
}
