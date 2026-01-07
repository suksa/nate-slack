import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';
import { MessageSquare, Hash } from 'lucide-react';

type Message = Database['public']['Tables']['messages']['Row'] & {
  profiles?: Database['public']['Tables']['profiles']['Row'] | null;
  threads?: Database['public']['Tables']['threads']['Row'] | null;
  channels?: Database['public']['Tables']['channels']['Row'] | null;
};

export default function ThreadsList() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllThreads = async () => {
    if (!workspaceId) return;
      setLoading(true);
      
      // 워크스페이스의 모든 채널 가져오기
      const { data: channels } = await supabase
        .from('channels')
        .select('id')
        .eq('workspace_id', workspaceId);

      if (!channels || channels.length === 0) {
        setThreads([]);
        setLoading(false);
        return;
      }

      const channelIds = channels.map(c => c.id);

      // 모든 스레드(parent_id가 null인 메시지 중 답글이 있는 것) 찾기
      const { data: allMessages } = await supabase
        .from('messages')
        .select('id, channel_id')
        .in('channel_id', channelIds)
        .is('parent_id', null)
        .is('deleted_at', null);

      if (!allMessages || allMessages.length === 0) {
        setThreads([]);
        setLoading(false);
        return;
      }

      const messageIds = allMessages.map(m => m.id);

      // 답글이 있는 메시지 찾기
      const { data: replies } = await supabase
        .from('messages')
        .select('parent_id')
        .in('parent_id', messageIds)
        .is('deleted_at', null);

      const threadMessageIds = new Set<string>();
      replies?.forEach(reply => {
        if (reply.parent_id) threadMessageIds.add(reply.parent_id);
      });

      if (threadMessageIds.size === 0) {
        setThreads([]);
        setLoading(false);
        return;
      }

      // 스레드 메시지와 관련 정보 가져오기
      const { data: threadMessages } = await supabase
        .from('messages')
        .select(`
          *,
          profiles!messages_user_id_fkey(username, avatar_url, deleted_at),
          threads(reply_count, last_reply_at),
          channels!messages_channel_id_fkey(id, name, type)
        `)
        .in('id', Array.from(threadMessageIds))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (threadMessages) {
        setThreads(threadMessages as Message[]);
      }
      
    setLoading(false);
  };

  useEffect(() => {
    fetchAllThreads();

    // 실시간 업데이트 구독
    const channelSub = supabase
      .channel(`workspace-threads-${workspaceId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, () => {
        fetchAllThreads();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'threads'
      }, () => {
        fetchAllThreads();
      })
      .subscribe();

    return () => {
      channelSub.unsubscribe();
    };
  }, [workspaceId]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (days === 1) {
      return '어제';
    } else if (days < 7) {
      return `${days}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <span>스레드 로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="h-14 border-b border-gray-200 flex items-center px-4 justify-between bg-white flex-shrink-0">
        <div className="flex items-center font-bold text-gray-800">
          <MessageSquare size={20} className="mr-2 text-gray-500" />
          스레드
        </div>
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto p-4">
        {threads.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">스레드가 없습니다</p>
              <p className="text-sm mt-2">메시지에 답글을 달면 여기에 표시됩니다</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((thread) => {
              const channel = thread.channels as Database['public']['Tables']['channels']['Row'] | null;
              const threadMeta = thread.threads as Database['public']['Tables']['threads']['Row'] | null;
              
              return (
                <button
                  key={thread.id}
                  onClick={() => {
                    navigate(`/workspace/${workspaceId}/channel/${thread.channel_id}?thread=${thread.id}`);
                  }}
                  className="w-full flex gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left group"
                >
                  <div className="w-10 h-10 bg-gray-300 rounded overflow-hidden flex-shrink-0">
                    {thread.profiles?.avatar_url ? (
                      <img 
                        src={thread.profiles.avatar_url} 
                        alt="avatar" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                        {(thread.profiles?.username || 'U')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-bold text-gray-900">
                        {thread.profiles?.username || 'Unknown User'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(thread.created_at)}
                      </span>
                      {channel && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          {channel.type === 'private' ? (
                            <Hash size={12} />
                          ) : (
                            <Hash size={12} />
                          )}
                          <span>{channel.name}</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-700 break-words line-clamp-2 mb-2">
                      {thread.content || '(파일)'}
                    </p>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <MessageSquare size={12} />
                      <span>{threadMeta?.reply_count || 0}개의 답글</span>
                      {threadMeta?.last_reply_at && (
                        <>
                          <span>•</span>
                          <span>{formatDate(threadMeta.last_reply_at)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

