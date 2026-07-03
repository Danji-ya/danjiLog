import { useQuery } from "@tanstack/react-query";
import { getCats } from "@/services/cats";
import { queryKeys } from "@/lib/queryKeys";

export function useCats() {
  return useQuery({
    queryKey: queryKeys.cats,
    queryFn: getCats,
    staleTime: 1000 * 60 * 10,
  });
}

// 현재 UI는 첫 번째로 등록된 고양이 한 마리만 사용합니다.
export function usePrimaryCat() {
  const { data: cats, ...rest } = useCats();
  return { cat: cats?.[0] ?? null, ...rest };
}
