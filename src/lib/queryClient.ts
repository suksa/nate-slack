import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5분간 데이터가 신선하다고 간주
      gcTime: 1000 * 60 * 10, // 10분간 캐시 유지 (구 cacheTime)
      retry: 1, // 실패 시 1번만 재시도
      refetchOnWindowFocus: false, // 윈도우 포커스 시 자동 리페치 비활성화
      refetchOnMount: false, // 마운트 시 자동 리페치 비활성화 (필요시 수동으로)
    },
    mutations: {
      retry: 0, // mutation은 재시도 안 함
    },
  },
});

