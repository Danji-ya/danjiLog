export type RecordType = "water" | "food";

// 주의: interface는 Supabase의 GenericSchema 제약(Record<string, unknown> 검사)을
// 만족시키지 못하는 TypeScript 특이 케이스가 있어 반드시 type으로 선언합니다.
export type Cat = {
  id: string;
  name: string;
  photo_url: string | null;
  weight: number | null;
  birthday: string | null;
  created_at: string;
};

export type CatRecord = {
  id: string;
  cat_id: string;
  type: RecordType;
  amount_ml: number;
  recorded_at: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      cats: {
        Row: Cat;
        Insert: Partial<Cat> & { name: string };
        Update: Partial<Cat>;
        Relationships: [];
      };
      records: {
        Row: CatRecord;
        Insert: Omit<CatRecord, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<CatRecord, "id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
