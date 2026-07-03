export const queryKeys = {
  cats: ["cats"] as const,
  records: (catId: string, startISO: string, endISO: string) =>
    ["records", catId, startISO, endISO] as const,
};
