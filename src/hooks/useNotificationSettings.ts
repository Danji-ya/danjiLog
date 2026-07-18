import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getLastNotificationCheck,
  getMealReminderSettings,
  getNotificationDiagnostics,
  updateMealReminderSettings,
  type UpdateMealReminderInput,
} from "@/services/notifications";
import { queryKeys } from "@/lib/queryKeys";

export function useMealReminderSettings(catId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.notificationSettings(catId ?? ""),
    queryFn: () => getMealReminderSettings(catId as string),
    enabled: Boolean(catId),
    staleTime: 1000 * 30,
  });
}

export function useUpdateMealReminderSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMealReminderInput) => updateMealReminderSettings(input),
    onSuccess: (result, input) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: queryKeys.notificationSettings(input.catId) });
      }
    },
  });
}

export function useNotificationDiagnostics() {
  return useQuery({
    queryKey: ["notificationDiagnostics"] as const,
    queryFn: getNotificationDiagnostics,
    staleTime: 0,
  });
}

export function useLastNotificationCheck(householdId: string | undefined) {
  return useQuery({
    queryKey: ["lastNotificationCheck", householdId] as const,
    queryFn: () => getLastNotificationCheck(householdId as string),
    enabled: Boolean(householdId),
    staleTime: 1000 * 60,
  });
}
