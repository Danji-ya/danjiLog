export type RecordType = "water" | "food";
export type HouseholdRole = "admin" | "member";

// 주의: interface는 Supabase의 GenericSchema 제약(Record<string, unknown> 검사)을
// 만족시키지 못하는 TypeScript 특이 케이스가 있어 반드시 type으로 선언합니다.
export type Household = {
  id: string;
  name: string | null;
  invite_code: string;
  created_by: string | null;
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

export type PushSubscriptionRow = {
  id: string;
  household_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
};

export type MealReminderSettings = {
  id: string;
  cat_id: string;
  enabled: boolean;
  interval_minutes: number;
  next_notify_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationLog = {
  id: string;
  household_id: string;
  cat_id: string | null;
  kind: string;
  ran_at: string;
  attempted: number;
  succeeded: number;
  failed: number;
  detail: unknown;
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
      push_subscriptions: {
        Row: PushSubscriptionRow;
        Insert: Partial<PushSubscriptionRow> & {
          household_id: string;
          endpoint: string;
          p256dh: string;
          auth_key: string;
        };
        Update: Partial<PushSubscriptionRow>;
        Relationships: [];
      };
      meal_reminder_settings: {
        Row: MealReminderSettings;
        Insert: Partial<MealReminderSettings> & { cat_id: string; interval_minutes: number };
        Update: Partial<MealReminderSettings>;
        Relationships: [];
      };
      notification_log: {
        Row: NotificationLog;
        Insert: Partial<NotificationLog> & { household_id: string };
        Update: Partial<NotificationLog>;
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
      upsert_push_subscription: {
        Args: {
          p_household_id: string;
          p_endpoint: string;
          p_p256dh: string;
          p_auth_key: string;
          p_user_agent?: string | null;
        };
        Returns: string;
      };
      upsert_meal_reminder_settings: {
        Args: { p_cat_id: string; p_enabled: boolean; p_interval_minutes: number };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
