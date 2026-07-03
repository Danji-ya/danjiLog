export * from "./database";

export type StatsPeriod = "today" | "7d" | "30d";

export interface DailyStat {
  date: string; // YYYY-MM-DD
  water: number;
  food: number;
}
