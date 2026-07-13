export type RecordType = "water" | "food";
export type HouseholdRole = "admin" | "member";

// 주의: interface는 Supabase의 GenericSchema 제약(Record<string, unknown> 검사)을
// 만족시키지 못하는 TypeScript 특이 케이스가 있어 반드시 type으로 선언합니다.
export type Household = {
  id: string;
  name: string | null;
  invite_code: string;
  created_at: string;
};

export type HouseholdMember = {
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  created_at: string;
};

export type Cat = {
  id: string;
  household_id: string;
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
      households: {
        Row: Household;
        Insert: Partial<Household> & { id?: string };
        Update: Partial<Household>;
        Relationships: [];
      };
      household_members: {
        Row: HouseholdMember;
        Insert: Partial<HouseholdMember> & { household_id: string; user_id: string };
        Update: Partial<HouseholdMember>;
        Relationships: [];
      };
      cats: {
        Row: Cat;
        Insert: Partial<Cat> & { name: string; household_id: string };
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
    Functions: {
      create_household: {
        Args: { p_name?: string | null };
        Returns: string;
      };
      join_household_by_code: {
        Args: { p_code: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
