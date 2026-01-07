import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';
import { X, Search, Hash, MessageSquare } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

type Message = Database['public']['Tables']['messages']['Row'] & {
  channels: { name: string; id: string } | null;
  profiles: { username: string; avatar_url: string | null } | null;
};

interface SearchModalProps {
  onClose: () => void;
}

export default function SearchModal({ onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 실시간 검색 (디바운스)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    if (!workspaceId) {
      setError('워크스페이스를 선택해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // 먼저 워크스페이스의 채널 ID 목록 가져오기
        const { data: workspaceChannels, error: channelsError } = await supabase
          .from('channels')
          .select('id')
          .eq('workspace_id', workspaceId);

        if (channelsError) {
          console.error('Channels error:', channelsError);
          setError(`채널 조회 오류: ${channelsError.message}`);
          setResults([]);
          setLoading(false);
          return;
        }

        if (!workspaceChannels || workspaceChannels.length === 0) {
          setResults([]);
          setLoading(false);
          return;
        }

        const channelIds = workspaceChannels.map(c => c.id);

        // 해당 채널들의 메시지 검색
        const { data, error: searchError } = await supabase
          .from('messages')
          .select(`
            *,
            channels!messages_channel_id_fkey(id, name),
            profiles!messages_user_id_fkey(username, avatar_url)
          `)
          .in('channel_id', channelIds)
          .is('deleted_at', null)
          .is('parent_id', null) // 스레드 답글이 아닌 메인 메시지만 검색
          .ilike('content', `%${query.trim()}%`)
          .order('created_at', { ascending: false })
          .limit(50);

        if (searchError) {
          console.error('Search error:', searchError);
          setError(`검색 오류: ${searchError.message}`);
          setResults([]);
        } else {
          setResults((data || []) as Message[]);
          if (data && data.length === 0) {
            setError(null);
          }
        }
      } catch (err) {
        console.error('Search exception:', err);
        setError('검색 중 오류가 발생했습니다.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms 디바운스

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, workspaceId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    // 실시간 검색이므로 submit은 필요 없지만, Enter 키로 첫 결과로 이동할 수 있도록
    if (results.length > 0) {
      handleResultClick(results[0].channel_id, results[0].id);
    }
  };

  const handleResultClick = (channelId: string, messageId?: string) => {
    if (messageId) {
      navigate(`/workspace/${workspaceId}/channel/${channelId}?message=${messageId}`);
    } else {
      navigate(`/workspace/${workspaceId}/channel/${channelId}`);
    }
    onClose();
  };

  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Search size={20} />
            Search
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 border-b">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="메시지 검색..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>
            {query && (
              <div className="mt-2 text-xs text-gray-500">
                {loading ? '검색 중...' : results.length > 0 ? `${results.length}개 결과` : '검색어를 입력하세요'}
              </div>
            )}
          </form>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="text-center text-red-500 py-4 text-sm">{error}</div>
          )}
          
          {loading && query && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-gray-500">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span>검색 중...</span>
              </div>
            </div>
          )}
          
          {!loading && !error && results.length === 0 && query && (
            <div className="text-center text-gray-500 py-8">
              <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
              <p>검색 결과가 없습니다</p>
              <p className="text-sm mt-1">다른 검색어를 시도해보세요</p>
            </div>
          )}
          
          {!loading && !error && query && results.length > 0 && (
            <div className="space-y-2">
              {results.map((msg) => (
                <div 
                  key={msg.id} 
                  onClick={() => handleResultClick(msg.channel_id, msg.id)}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-gray-300 cursor-pointer transition-all"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-8 h-8 bg-gray-300 rounded overflow-hidden flex-shrink-0">
                      {msg.profiles?.avatar_url ? (
                        <img 
                          src={msg.profiles.avatar_url} 
                          alt={msg.profiles.username || ''} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                          {(msg.profiles?.username || 'U')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 text-sm">
                          {msg.profiles?.username || 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-500">in</span>
                        <span className="flex items-center gap-1 text-xs text-gray-700 font-medium">
                          <Hash size={12} />
                          {msg.channels?.name}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">
                          {new Date(msg.created_at || '').toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="text-gray-800 text-sm line-clamp-3">
                        {msg.content ? highlightText(msg.content, query) : '(파일)'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {!query && (
            <div className="text-center text-gray-400 py-8">
              <Search size={48} className="mx-auto mb-3 opacity-30" />
              <p>메시지를 검색하세요</p>
              <p className="text-sm mt-1">검색어를 입력하면 실시간으로 결과가 표시됩니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

