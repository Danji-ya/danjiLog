import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRecord,
  deleteRecord,
  getRecordsInRange,
  updateRecord,
  type CreateRecordInput,
  type UpdateRecordInput,
} from "@/services/records";
import { queryKeys } from "@/lib/queryKeys";

export function useRecords(catId: string | undefined, startISO: string, endISO: string) {
  return useQuery({
    queryKey: queryKeys.records(catId ?? "", startISO, endISO),
    queryFn: () => getRecordsInRange({ catId: catId as string, startISO, endISO }),
    enabled: Boolean(catId),
    staleTime: 1000 * 30,
  });
}

export function useCreateRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRecordInput) => createRecord(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["records"] });
    },
  });
}

export function useUpdateRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateRecordInput) => updateRecord(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["records"] });
    },
  });
}

export function useDeleteRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["records"] });
    },
  });
}
