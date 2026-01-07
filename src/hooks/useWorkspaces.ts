import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';

type Workspace = Database['public']['Tables']['workspaces']['Row'];

export function useWorkspaces(userId: string | undefined) {
  return useQuery({
    queryKey: ['workspaces', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      const { data, error } = await supabase
        .from('members')
        .select('workspace_id, workspaces(*)')
        .eq('user_id', userId);

      if (error) throw error;

      const workspaces = data
        .map((item) => item.workspaces)
        .filter((ws): ws is Workspace => ws !== null) as Workspace[];

      return workspaces;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5분간 신선한 상태 유지
  });
}

