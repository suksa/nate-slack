import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useChannelMembers(channelId: string | undefined, currentUserId: string | undefined) {
  return useQuery({
    queryKey: ['channel-members', channelId],
    queryFn: async () => {
      if (!channelId) throw new Error('Channel ID is required');

      const { data, error } = await supabase
        .from('channel_members')
        .select('user_id, profiles(*)')
        .eq('channel_id', channelId);

      if (error) throw error;

      const profiles = data
        .map((m: { profiles: Profile | null }) => m.profiles)
        .filter((p: Profile | null): p is Profile => p !== null && p.id !== currentUserId);

      return profiles;
    },
    enabled: !!channelId && !!currentUserId,
    staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
  });
}

