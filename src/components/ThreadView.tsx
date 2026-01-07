import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';
import { useAuth } from '../contexts/AuthContext';
import { Send, X } from 'lucide-react';
import UserProfileModal from './UserProfileModal';

type Message = Database['public']['Tables']['messages']['Row'] & {
  profiles?: Database['public']['Tables']['profiles']['Row'] | null;
};

type Profile = Database['public']['Tables']['profiles']['Row'];

interface ThreadViewProps {
  parentMessage: Message;
  onClose: () => void;
}

const REPLY_PAGE_SIZE = 50;

export default function ThreadView({ parentMessage, onClose }: ThreadViewProps) {
  const [replies, setReplies] = useState<Message[]>([]);
  const [newReply, setNewReply] = useState('');
  const [channelMembers, setChannelMembers] = useState<Database['public']['Tables']['profiles']['Row'][]>([]);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [oldestReplyDate, setOldestReplyDate] = useState<string | null>(null);
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyListRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset state when parent message changes
    setReplies([]);
    setHasMore(true);
    setOldestReplyDate(null);
    
    async function fetchReplies() {
      // 처음에는 최근 답글만 가져오기 (최신순으로 정렬 후 limit)
      const { data, error } = await supabase
        .from('messages')
        .select('*, profiles!messages_user_id_fkey(username, avatar_url, deleted_at, background_color)')
        .eq('parent_id', parentMessage.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(REPLY_PAGE_SIZE);

      if (error) {
        console.error('Error fetching replies:', error);
        setHasMore(false);
      } else {
        const repliesArray = (data || []).reverse() as Message[]; // 오래된 것부터 최신 순으로 정렬
        setReplies(repliesArray);
        
        if (repliesArray.length > 0) {
          setOldestReplyDate(repliesArray[0].created_at);
          setHasMore(data.length === REPLY_PAGE_SIZE);
        } else {
          setHasMore(false);
        }
        
        // 스레드 열릴 때 최신 답글로 스크롤
        scrollToBottom(true);
      }
    }

    async function fetchChannelMembers() {
      const { data, error } = await supabase
        .from('channel_members')
        .select('user_id, profiles(*)')
        .eq('channel_id', parentMessage.channel_id);

      if (error) {
        console.error('Error fetching channel members:', error);
      } else {
        const profiles = data
          .map((m: { profiles: Profile | null }) => m.profiles)
          .filter((p: Profile | null): p is Profile => p !== null && p.id !== user?.id);
        setChannelMembers(profiles);
      }
    }

    fetchReplies();
    fetchChannelMembers();

    const replySub = supabase
      .channel(`thread-${parentMessage.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `parent_id=eq.${parentMessage.id}`
      }, async (payload) => {
        const newMsg = payload.new as Message;
        
        // Skip if already exists (optimistic update)
        setReplies((current) => {
            if (current.some(m => m.id === newMsg.id)) return current;
            return [...current, newMsg]; // Placeholder until fetch
        });

        // Fetch relation
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url, deleted_at, background_color')
          .eq('id', newMsg.user_id)
          .single();
        
        setReplies((current) => current.map(m => 
            m.id === newMsg.id ? { ...m, profiles: profile as Database['public']['Tables']['profiles']['Row'] | null } : m
        ));
        scrollToBottom();
      })
      .subscribe();

    return () => {
      replySub.unsubscribe();
    };
  }, [parentMessage.id]);

  // 스크롤 이벤트 리스너: 맨 위에 도달하면 이전 답글 로드
  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = replyListRef.current;
      if (!scrollContainer) return;
      
      // 스크롤이 맨 위에서 100px 이내에 있으면 이전 답글 로드
      if (scrollContainer.scrollTop < 100 && hasMore && !loadingMore) {
        loadOlderReplies();
      }
    };

    const scrollContainer = replyListRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [hasMore, loadingMore, oldestReplyDate, parentMessage.id]);

  const loadOlderReplies = async () => {
    if (loadingMore || !hasMore || !oldestReplyDate || !parentMessage.id) return;
    
    setLoadingMore(true);
    
    const { data, error } = await supabase
      .from('messages')
      .select('*, profiles!messages_user_id_fkey(username, avatar_url, deleted_at)')
      .eq('parent_id', parentMessage.id)
      .is('deleted_at', null)
      .lt('created_at', oldestReplyDate)
      .order('created_at', { ascending: false })
      .limit(REPLY_PAGE_SIZE);

    if (error) {
      console.error('Error loading older replies:', error);
      setHasMore(false);
      } else {
        const olderReplies = (data || []).reverse() as Message[];
        
        if (olderReplies.length > 0) {
          // 현재 스크롤 위치와 높이 저장
          const scrollContainer = replyListRef.current;
          const oldScrollHeight = scrollContainer?.scrollHeight || 0;
          const oldScrollTop = scrollContainer?.scrollTop || 0;
          
          setReplies(prev => [...olderReplies, ...prev]);
        setOldestReplyDate(olderReplies[0].created_at);
        setHasMore(data.length === REPLY_PAGE_SIZE);
        
        // 스크롤 위치 복원 (새 답글이 추가되어도 사용자가 보던 위치 유지)
        setTimeout(() => {
          if (scrollContainer) {
            const newScrollHeight = scrollContainer.scrollHeight;
            scrollContainer.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
          }
        }, 0);
      } else {
        setHasMore(false);
      }
    }
    
    setLoadingMore(false);
  };

  const scrollToBottom = (instant = false) => {
    // DOM 업데이트를 기다린 후 스크롤
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const replyList = replyListRef.current;
        if (replyList) {
          if (instant) {
            replyList.scrollTop = replyList.scrollHeight;
          } else {
            replyList.scrollTo({
              top: replyList.scrollHeight,
              behavior: 'smooth'
            });
          }
        }
      });
    });
  };

  const renderMessageWithMentions = (content: string) => {
    // @ 다음에 공백, 줄바꿈, @가 나올 때까지의 모든 문자를 매칭 (한글 포함)
    const mentionRegex = /@([^\s@\n]+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {content.slice(lastIndex, match.index)}
          </span>
        );
      }
      
      parts.push(
        <span
          key={`mention-${match.index}`}
          className="bg-indigo-100 text-indigo-700 font-medium px-1.5 py-0.5 rounded"
        >
          @{match[1]}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {content.slice(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : content;
  };

  const handleReplyChange = (value: string) => {
    setNewReply(value);
    
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionSearch(textAfterAt);
        setMentionPosition(lastAtIndex);
        setShowMentionList(true);
        setSelectedMentionIndex(0);
      } else {
        setShowMentionList(false);
      }
    } else {
      setShowMentionList(false);
    }
  };

  const handleMentionSelect = (username: string) => {
    const beforeMention = newReply.slice(0, mentionPosition);
    const afterMention = newReply.slice(textareaRef.current?.selectionStart || 0);
    const newText = `${beforeMention}@${username} ${afterMention}`;
    
    setNewReply(newText);
    setShowMentionList(false);
    setMentionSearch('');
    
    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPos = beforeMention.length + username.length + 2;
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionList) {
      const filteredMembers = channelMembers.filter(m =>
        m.username?.toLowerCase().includes(mentionSearch.toLowerCase())
      );

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < filteredMembers.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredMembers[selectedMentionIndex]) {
          handleMentionSelect(filteredMembers[selectedMentionIndex].username || '');
        }
        return;
      } else if (e.key === 'Escape') {
        setShowMentionList(false);
        return;
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply(e);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || !user) return;

    const content = newReply;
    setNewReply('');
    setShowMentionList(false);

    const { data: replyData, error } = await supabase
      .from('messages')
      .insert({
        channel_id: parentMessage.channel_id,
        user_id: user.id,
        content: content,
        parent_id: parentMessage.id
      })
        .select('*, profiles!messages_user_id_fkey(username, avatar_url, background_color)')
        .single();

    if (error) {
      console.error('Error sending reply:', error);
      alert('Failed to send reply: ' + error.message);
      setNewReply(content);
    } else if (replyData) {
        setReplies(prev => [...prev, replyData as Message]);
        scrollToBottom();
    }
    
    // Also update thread metadata (reply_count) - could be done by trigger or manually
    // For now assuming database trigger handles it or we ignore the count in UI for now
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 border-l border-gray-200 w-96 shadow-xl z-20">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <h3 className="font-bold text-gray-800">Thread</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>
      </div>
      
      {/* Original Message */}
      <div className="p-4 bg-white border-b border-gray-100">
            <div className="flex gap-3">
            <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
               {parentMessage.profiles?.avatar_url ? (
                 <img src={parentMessage.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover"/>
               ) : (
                 <div 
                   className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
                   style={{ backgroundColor: parentMessage.profiles?.background_color || '#6b7280' }}
                 >
                    {(parentMessage.profiles?.username || 'U')[0].toUpperCase()}
                 </div>
               )}
            </div>
            <div>
                 <div className="flex items-baseline gap-2">
                   <span className="font-bold text-sm text-gray-900">
                     {parentMessage.profiles?.username || 'Unknown'}
                     {parentMessage.profiles?.deleted_at && (
                       <span className="ml-1 text-xs font-normal text-gray-400">(탈퇴됨)</span>
                     )}
                   </span>
                   <span className="text-xs text-gray-500">{new Date(parentMessage.created_at || '').toLocaleTimeString()}</span>
                 </div>
                 <p className="text-sm text-gray-800">{renderMessageWithMentions(parentMessage.content || '')}</p>
            </div>
        </div>
      </div>

      {/* Replies List */}
      <div ref={replyListRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 이전 답글 로딩 인디케이터 */}
        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              이전 답글 로딩 중...
            </div>
          </div>
        )}
        
        {/* 더 이상 답글이 없음 표시 */}
        {!hasMore && replies.length > 0 && (
          <div className="flex justify-center py-4">
            <div className="text-gray-400 text-xs">
              스레드의 첫 답글입니다
            </div>
          </div>
        )}
        
        <div ref={topRef} />
        
        {replies.map((msg, index) => {
          // 날짜 구분선 표시 여부 확인
          const showDateDivider = index === 0 || 
            new Date(replies[index - 1].created_at || '').toDateString() !== 
            new Date(msg.created_at || '').toDateString();
          
          const messageDate = new Date(msg.created_at || '');
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          let dateLabel = messageDate.toLocaleDateString('ko-KR', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'short'
          });
          
          if (messageDate.toDateString() === today.toDateString()) {
            dateLabel = '오늘';
          } else if (messageDate.toDateString() === yesterday.toDateString()) {
            dateLabel = '어제';
          }
          
          return (
            <React.Fragment key={msg.id}>
              {showDateDivider && (
                <div className="relative flex items-center py-2">
                  <div className="grow border-t border-gray-300"></div>
                  <span className="shrink-0 px-3 text-xs font-semibold text-gray-600 bg-white rounded-full border border-gray-300 shadow-sm">
                    {dateLabel}
                  </span>
                  <div className="grow border-t border-gray-300"></div>
                </div>
              )}
          
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
               {msg.profiles?.avatar_url ? (
                 <img src={msg.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover"/>
               ) : (
                 <div 
                   className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
                   style={{ backgroundColor: msg.profiles?.background_color || '#6b7280' }}
                 >
                    {(msg.profiles?.username || 'U')[0].toUpperCase()}
                 </div>
               )}
            </div>
            <div className="flex-1 min-w-0">
               <div className="flex items-baseline gap-2">
                 <span 
                   className="font-bold text-sm text-gray-900 hover:underline cursor-pointer"
                   onClick={() => setSelectedProfileUserId(msg.user_id)}
                 >
                   {msg.profiles?.username || 'Unknown'}
                   {msg.profiles?.deleted_at && (
                     <span className="ml-1 text-xs font-normal text-gray-400">(탈퇴됨)</span>
                   )}
                 </span>
                 <span className="text-xs text-gray-500">{new Date(msg.created_at || '').toLocaleTimeString()}</span>
               </div>
               <p className="text-sm text-gray-800 break-words whitespace-pre-wrap">{renderMessageWithMentions(msg.content || '')}</p>
            </div>
          </div>
          </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="relative">
          {/* Mention Autocomplete */}
          {showMentionList && (
            <div className="absolute bottom-full left-0 mb-2 w-64 max-h-48 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-lg z-50">
              {channelMembers
                .filter(m => m.username?.toLowerCase().includes(mentionSearch.toLowerCase()))
                .map((member, index) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleMentionSelect(member.username || '')}
                    className={`w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-2 ${
                      index === selectedMentionIndex ? 'bg-blue-100' : ''
                    }`}
                  >
                    <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: member.background_color || '#6b7280' }}
                        >
                          {(member.username || 'U')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{member.username}</div>
                      {member.full_name && (
                        <div className="text-xs text-gray-500 truncate">{member.full_name}</div>
                      )}
                    </div>
                  </button>
                ))}
            </div>
          )}

          <form onSubmit={handleSendReply} className="relative rounded-lg border border-gray-300 shadow-sm focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
            <textarea
              ref={textareaRef}
              value={newReply}
              onChange={(e) => handleReplyChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Reply..."
              className="block w-full border-0 pt-2.5 pb-2 pl-3 pr-10 resize-none focus:ring-0 sm:text-sm min-h-[40px] max-h-[150px]"
              rows={1}
            />
            <button
              type="submit"
              disabled={!newReply.trim()}
              className="absolute bottom-2 right-2 p-1 text-gray-500 hover:text-blue-600 disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* User Profile Modal */}
      {selectedProfileUserId && (
        <UserProfileModal
          userId={selectedProfileUserId}
          onClose={() => setSelectedProfileUserId(null)}
        />
      )}
    </div>
  );
}

