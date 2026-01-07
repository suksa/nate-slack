import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';
import { useAuth } from '../contexts/AuthContext';
import { useChannelMembers } from '../hooks/useChannelMembers';
import { useProfile } from '../hooks/useProfile';
import { Send, MessageSquare, Hash, Smile, Paperclip, X, File, Pencil, Trash2, Users } from 'lucide-react';
import ThreadView from './ThreadView';
import UserProfileModal from './UserProfileModal';
import ChannelMembersModal from './ChannelMembersModal';

type Message = Database['public']['Tables']['messages']['Row'] & {
  profiles?: Database['public']['Tables']['profiles']['Row'] | null;
  threads?: Database['public']['Tables']['threads']['Row'] | null;
  reactions?: Database['public']['Tables']['reactions']['Row'][];
  attachments?: Database['public']['Tables']['attachments']['Row'][];
  replies?: { created_at: string; profiles: { avatar_url: string | null } | null }[];
};

type Channel = Database['public']['Tables']['channels']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '✅'];

const formatThreadDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  const timeStr = date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${isToday ? '오늘 ' : ''}${timeStr}에`;
};

const renderMessageWithMentions = (content: string) => {
  // @ 다음에 공백, 줄바꿈, @가 나올 때까지의 모든 문자를 매칭 (한글 포함)
  const mentionRegex = /@([^\s@\n]+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    // 멘션 전 텍스트 추가
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {content.slice(lastIndex, match.index)}
        </span>
      );
    }
    
    // 멘션 추가 (하이라이트)
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

  // 남은 텍스트 추가
  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>
        {content.slice(lastIndex)}
      </span>
    );
  }

  return parts.length > 0 ? parts : content;
};

const MESSAGE_PAGE_SIZE = 50;

export default function ChatArea() {
  const { channelId } = useParams<{ channelId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [channelInfo, setChannelInfo] = useState<Channel | null>(null);
  const [dmUser, setDmUser] = useState<Profile | null>(null);
  const [activeThread, setActiveThread] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [oldestMessageDate, setOldestMessageDate] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  
  const [isMember, setIsMember] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; username: string }>>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  
  const { user } = useAuth();
  
  // React Query로 채널 멤버 조회 (자동 캐싱 및 중복 요청 방지)
  const { data: channelMembers = [] } = useChannelMembers(channelId, user?.id);
  
  // 현재 사용자 프로필 조회
  const { data: currentUserProfile } = useProfile(user?.id);
  
  // 전체 참여자 목록 (현재 사용자 포함)
  const allMembers = currentUserProfile && !channelMembers.some(m => m.id === currentUserProfile.id)
    ? [...channelMembers, currentUserProfile]
    : channelMembers;
  
  // Presence 구독이 채널 멤버 정보를 사용하므로, 멤버 정보가 로드된 후에 presence 설정
  useEffect(() => {
    if (!presenceChannelRef.current || !user?.id) return;
    
    const setupPresence = async () => {
      // channelMembers에서 먼저 찾기
      let username: string | undefined;
      const userProfile = channelMembers.find(m => m.id === user.id);
      
      if (userProfile) {
        username = userProfile.username || undefined;
      } else {
        // channelMembers에서 찾지 못한 경우 직접 조회
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        
        if (data) {
          username = data.username || undefined;
        }
      }
      
      if (username && presenceChannelRef.current) {
        await presenceChannelRef.current.track({
          typing: false,
          username: username
        });
      }
    };
    
    setupPresence();
  }, [channelMembers, user?.id]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const messageListRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!channelId || !user?.id) return;

    let isMounted = true;

    // Reset state on channel change
    setMessages([]);
    setChannelInfo(null);
    setDmUser(null);
    setActiveThread(null);
    setIsMember(true);
    setHasMore(true);
    setOldestMessageDate(null);
    setInitialLoading(true);

    // 1. Fetch Channel Info & Check Membership
    async function initChannel() {
        if (!channelId || !user?.id) return;
        
        const { data: ch, error } = await supabase
            .from('channels')
            .select('*')
            .eq('id', channelId)
            .single();
        
        if (!isMounted) return;
        
        if (error || !ch) {
            console.error('Error fetching channel:', error);
            return;
        }
        setChannelInfo(ch);

        // Check membership
        const { data: membership } = await supabase
            .from('channel_members')
            .select('user_id')
            .eq('channel_id', channelId)
            .eq('user_id', user.id)
            .maybeSingle(); // Use maybeSingle to avoid error if not found
        
        if (!isMounted) return;
        
        const isJoined = !!membership;
        setIsMember(isJoined);

        if (ch.type === 'private') {
             // Logic for DMs as before
             const { data: member } = await supabase
                .from('channel_members')
                .select('user_id, profiles(*)')
                .eq('channel_id', channelId)
                .neq('user_id', user.id)
                .single();
             if (isMounted && member && member.profiles) {
                 setDmUser(member.profiles);
             }
        }

        // Only fetch messages if member
        if (isMounted && isJoined) {
            fetchMessages();
            subscribeToMessages();
            subscribeToPresence();
            // fetchChannelMembers 제거 - useChannelMembers hook이 자동으로 처리
        } else if (isMounted) {
            setInitialLoading(false);
        }
    }
    
    initChannel();
    
    async function fetchMessages() {
      // 최근 메시지만 가져오기 (성능 최적화)
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles!messages_user_id_fkey(username, avatar_url, deleted_at, background_color),
          threads(reply_count, last_reply_at),
          reactions(emoji, user_id),
          attachments(id, file_url, file_name, file_size, mime_type),
          replies:messages!parent_id(
            created_at,
            profiles!messages_user_id_fkey(avatar_url)
          )
        `)
        .eq('channel_id', channelId || '')
        .is('parent_id', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(MESSAGE_PAGE_SIZE);

      if (!isMounted) return;

      if (error) {
        console.error('Error fetching messages:', error);
        setInitialLoading(false);
      } else {
        const messagesArray = (data || []).reverse(); // 오래된 것부터 최신 순으로 정렬
        setMessages(messagesArray);
        
        if (messagesArray.length > 0) {
          setOldestMessageDate(messagesArray[0].created_at);
          setHasMore(data.length === MESSAGE_PAGE_SIZE);
        } else {
          setHasMore(false);
        }
        
        setInitialLoading(false);
        
        // DOM 렌더링 후 스크롤
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scrollToBottom(true);
          });
        });
      }
    }

    // fetchChannelMembers 제거 - React Query useChannelMembers로 대체

    let channelSub: ReturnType<typeof supabase.channel> | null = null;
    let presenceChannel: ReturnType<typeof supabase.channel> | null = null;
    
    function subscribeToPresence() {
        if (presenceChannel) supabase.removeChannel(presenceChannel);
        
        presenceChannel = supabase
        .channel(`presence-${channelId}`, {
            config: {
                presence: {
                    key: user?.id || ''
                }
            }
        })
        .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel?.presenceState();
            if (!state) return;
            
            const typing: Array<{ userId: string; username: string }> = [];
            
            Object.entries(state).forEach(([userId, presences]) => {
                if (userId === user?.id) return; // 본인 제외
                
                const presenceArray = presences as Array<{ typing?: boolean; username?: string }>;
                const isTyping = presenceArray.some(p => p.typing === true);
                
                if (isTyping) {
                    const username = presenceArray[0]?.username || 'Unknown';
                    typing.push({ userId, username });
                }
            });
            
            setTypingUsers(typing);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            if (key === user?.id) return;
            // join 이벤트는 sync에서 처리됨
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            if (key === user?.id) return;
            setTypingUsers(prev => prev.filter(u => u.userId !== key));
        })
        .subscribe();
        
        presenceChannelRef.current = presenceChannel;
    }
    
    function subscribeToMessages() {
        if (channelSub) supabase.removeChannel(channelSub);
        
        channelSub = supabase
        .channel(`chat-room-${channelId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
        }, async (payload) => {
            const newMsg = payload.new as Message;
            // Manual filter
            if (newMsg.channel_id !== channelId) return;

            // Handle reply (update parent message thread info)
            if (newMsg.parent_id) {
                 const { data: profile } = await supabase
                    .from('profiles')
                    .select('avatar_url')
                    .eq('id', newMsg.user_id)
                    .single();

                 setMessages((prev) => prev.map(m => {
                    if (m.id === newMsg.parent_id) {
                         const currentThreads = m.threads || { reply_count: 0, last_reply_at: null, parent_message_id: m.id, participant_count: 0 };
                         return {
                             ...m,
                             threads: {
                                 ...currentThreads,
                                 reply_count: (currentThreads.reply_count || 0) + 1,
                                 last_reply_at: newMsg.created_at
                             },
                             replies: [...(m.replies || []), {
                                 created_at: newMsg.created_at || new Date().toISOString(),
                                 profiles: profile
                             }]
                         };
                    }
                    return m;
                 }));
                 
                 // 새 댓글이 달린 메시지를 하이라이트
                 if (newMsg.user_id !== user?.id) { // 본인이 단 댓글이 아닐 때만
                     setHighlightedMessageId(newMsg.parent_id);
                     
                     // 5초 후 하이라이트 제거
                     setTimeout(() => {
                         setHighlightedMessageId(null);
                     }, 5000);
                 }
                 
                 return;
            }

            // Fetch relations with error handling
            let profile = null;
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('username, avatar_url, deleted_at')
                    .eq('id', newMsg.user_id)
                    .single();
                profile = data;
            } catch (err) {
                console.error('Error fetching profile for realtime message:', err);
            }
            
            setMessages((prev) => {
                // Deduplicate
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, { ...newMsg, profiles: profile }];
            });
            scrollToBottom();
        })
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages'
        }, (payload) => {
            const updatedMsg = payload.new as Message;
            if (updatedMsg.channel_id !== channelId) return;

            if (updatedMsg.deleted_at) {
                setMessages((prev) => prev.filter(m => m.id !== updatedMsg.id));
            } else {
                 setMessages((prev) => prev.map(m => m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m));
            }
        })
        .subscribe();
    }

    return () => {
      isMounted = false;
      if (channelSub) {
        channelSub.unsubscribe();
        supabase.removeChannel(channelSub);
      }
      if (presenceChannel) {
        presenceChannel.untrack();
        presenceChannel.unsubscribe();
        supabase.removeChannel(presenceChannel);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [channelId, user?.id]); // user 대신 user?.id

  // URL에서 thread 파라미터 확인하여 스레드 열기
  useEffect(() => {
    if (!channelId || !user?.id) return;

    const searchParams = new URLSearchParams(window.location.search);
    const threadId = searchParams.get('thread');
    const messageId = searchParams.get('message');
    
    if (threadId && !activeThread) {
      // 부모 메시지 찾기
      supabase
        .from('messages')
        .select(`
          *,
          profiles!messages_user_id_fkey(username, avatar_url, deleted_at, background_color),
          threads(reply_count, last_reply_at),
          reactions(emoji, user_id),
          attachments(id, file_url, file_name, file_size, mime_type)
        `)
        .eq('id', threadId)
        .eq('channel_id', channelId)
        .is('deleted_at', null)
        .single()
        .then(({ data: parentMsg, error }) => {
          if (!error && parentMsg) {
            setActiveThread(parentMsg as Message);
            // URL에서 thread 파라미터 제거 (히스토리 정리)
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
          }
        });
    }
    
    // 검색 결과에서 메시지로 이동
    if (messageId && messages.length > 0) {
      const message = messages.find(m => m.id === messageId);
      if (message) {
        // 메시지 하이라이트 및 스크롤
        setHighlightedMessageId(messageId);
        setTimeout(() => {
          const messageElement = messageRefs.current[messageId];
          if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        
        // 5초 후 하이라이트 제거
        setTimeout(() => {
          setHighlightedMessageId(null);
        }, 5000);
        
        // URL에서 message 파라미터 제거
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      } else {
        // 메시지가 아직 로드되지 않았으면 이전 메시지 로드 시도
        // 또는 메시지가 현재 페이지에 없으면 로드 필요
      }
    }
  }, [channelId, user?.id, activeThread, messages]);

  // 스크롤 이벤트 리스너: 맨 위에 도달하면 이전 메시지 로드
  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = messageListRef.current;
      if (!scrollContainer) return;
      
      // 스크롤이 맨 위에서 100px 이내에 있으면 이전 메시지 로드
      if (scrollContainer.scrollTop < 100 && hasMore && !loadingMore) {
        loadOlderMessages();
      }
    };

    const scrollContainer = messageListRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [hasMore, loadingMore, oldestMessageDate, channelId]);

  // loadOlderMessages를 useEffect 외부로 이동
  const loadOlderMessages = async () => {
    if (loadingMore || !hasMore || !oldestMessageDate || !channelId) return;
    
    setLoadingMore(true);
    
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles!messages_user_id_fkey(username, avatar_url, deleted_at, background_color),
        threads(reply_count, last_reply_at),
        reactions(emoji, user_id),
        attachments(id, file_url, file_name, file_size, mime_type),
        replies:messages!parent_id(
          created_at,
          profiles!messages_user_id_fkey(avatar_url, background_color)
        )
      `)
      .eq('channel_id', channelId)
      .is('parent_id', null)
      .is('deleted_at', null)
      .lt('created_at', oldestMessageDate)
      .order('created_at', { ascending: false })
      .limit(MESSAGE_PAGE_SIZE);

    if (error) {
      console.error('Error loading older messages:', error);
    } else {
      const olderMessages = (data || []).reverse();
      
      if (olderMessages.length > 0) {
        // 현재 스크롤 위치와 높이 저장
        const scrollContainer = messageListRef.current;
        const oldScrollHeight = scrollContainer?.scrollHeight || 0;
        const oldScrollTop = scrollContainer?.scrollTop || 0;
        
        setMessages(prev => [...olderMessages, ...prev]);
        setOldestMessageDate(olderMessages[0].created_at);
        setHasMore(data.length === MESSAGE_PAGE_SIZE);
        
        // 스크롤 위치 복원 (새 메시지가 추가되어도 사용자가 보던 위치 유지)
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

  const handleJoinChannel = async () => {
      if (!user || !channelId) return;
      const { error } = await supabase
        .from('channel_members')
        .insert({ channel_id: channelId, user_id: user.id });
      
      if (error) {
          alert('Error joining channel');
          console.error(error);
      } else {
          setIsMember(true);
          window.location.reload(); 
      }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
      if (!user) return;
      const { error } = await supabase.from('reactions').insert({
          message_id: messageId,
          user_id: user.id,
          emoji
      });
      if (error) console.error('Error adding reaction', error);
      
      // Optimistic update or wait for realtime?
      // For simplicity, let's wait for realtime or refetch. 
      // Since reactions table realtime is not set up in this useEffect, we might want to just manually update local state
      // or set up a separate subscription for reactions.
      // For MVP, let's just update local state optimistically.
      setMessages(prev => prev.map(msg => {
          if (msg.id === messageId) {
              const newReaction: Database['public']['Tables']['reactions']['Row'] = { 
                emoji, 
                user_id: user.id,
                id: crypto.randomUUID(),
                message_id: messageId,
                created_at: new Date().toISOString()
              };
              return { ...msg, reactions: [...(msg.reactions || []), newReaction] };
          }
          return msg;
      }));
  };

  const scrollToBottom = (instant = false) => {
    // DOM 업데이트를 기다린 후 스크롤
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const messageList = messageListRef.current;
        if (messageList) {
          if (instant) {
            messageList.scrollTop = messageList.scrollHeight;
          } else {
            messageList.scrollTo({
              top: messageList.scrollHeight,
              behavior: 'smooth'
            });
          }
        }
      });
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteMessage = async (messageId: string) => {
      if (!confirm('Are you sure you want to delete this message?')) return;
      
      const { error } = await supabase
          .from('messages')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', messageId);

      if (error) {
          console.error('Error deleting message:', error);
          alert('Failed to delete message');
      } else {
          // Optimistic update
          setMessages(prev => prev.filter(m => m.id !== messageId));
      }
  };

  const handleUpdateMessage = async (messageId: string) => {
      if (!editContent.trim()) return;
      
      const { error } = await supabase
          .from('messages')
          .update({ 
              content: editContent,
              is_edited: true,
              updated_at: new Date().toISOString()
          })
          .eq('id', messageId);

      if (error) {
          console.error('Error updating message:', error);
          alert('Failed to update message');
      } else {
          // Optimistic update
          setMessages(prev => prev.map(m => 
              m.id === messageId 
                  ? { ...m, content: editContent, is_edited: true } 
                  : m
          ));
          setEditingMessageId(null);
          setEditContent('');
      }
  };

  const startEditing = (msg: Message) => {
      setEditingMessageId(msg.id);
      setEditContent(msg.content || '');
      setShowEmojiPicker(null); // Close other popovers
  };

  const uploadFile = async (file: File, messageId: string): Promise<boolean> => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(fileName);

      // Save attachment metadata
      const { error: attachmentError } = await supabase
        .from('attachments')
        .insert({
          message_id: messageId,
          user_id: user.id,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type
        });

      if (attachmentError) throw attachmentError;
      return true;
    } catch (error) {
      console.error('Error uploading file:', error);
      return false;
    }
  };

  const handleMessageChange = (value: string) => {
    setNewMessage(value);
    
    // Presence: 입력 중 상태 업데이트
    if (presenceChannelRef.current && user?.id) {
      const updateTypingStatus = async () => {
        let username: string = 'Unknown';
        const userProfile = channelMembers.find(m => m.id === user.id);
        
        if (userProfile) {
          username = userProfile.username || 'Unknown';
        } else {
          // channelMembers에서 찾지 못한 경우 직접 조회
          const { data } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single();
          
          if (data?.username) {
            username = data.username;
          }
        }
        
        // 입력 중 상태로 업데이트
        await presenceChannelRef.current.track({
          typing: true,
          username: username
        });
        
        // 기존 타이머 클리어
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        // 3초 후 입력 중 상태 해제
        typingTimeoutRef.current = setTimeout(async () => {
          if (presenceChannelRef.current) {
            await presenceChannelRef.current.track({
              typing: false,
              username: username
            });
          }
        }, 3000);
      };
      
      updateTypingStatus();
    }
    
    // @ 멘션 감지
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      
      // 공백이 없고 @가 최근에 입력된 경우
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
    const beforeMention = newMessage.slice(0, mentionPosition);
    const afterMention = newMessage.slice(textareaRef.current?.selectionStart || 0);
    const newText = `${beforeMention}@${username} ${afterMention}`;
    
    setNewMessage(newText);
    setShowMentionList(false);
    setMentionSearch('');
    
    // 포커스를 다시 textarea로
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
      handleSendMessage(e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && selectedFiles.length === 0) || !user || !channelId || uploading) return;

    const content = newMessage || '(파일 첨부)';
    const filesToUpload = [...selectedFiles];
    
    // Presence: 입력 중 상태 해제
    if (presenceChannelRef.current && typingTimeoutRef.current && user?.id) {
      clearTimeout(typingTimeoutRef.current);
      const updatePresence = async () => {
        let username: string = 'Unknown';
        const userProfile = channelMembers.find(m => m.id === user.id);
        
        if (userProfile) {
          username = userProfile.username || 'Unknown';
        } else {
          const { data } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single();
          
          if (data?.username) {
            username = data.username;
          }
        }
        
        await presenceChannelRef.current?.track({
          typing: false,
          username: username
        });
      };
      updatePresence();
    }
    
    setNewMessage('');
    setSelectedFiles([]);
    setShowMentionList(false);
    setUploading(true);

    try {
      // 1. Create message
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content: content,
          parent_id: null
        })
        .select(`
          *,
          profiles!messages_user_id_fkey(username, avatar_url, deleted_at, background_color)
        `)
        .single();

      if (messageError) throw messageError;

      // Optimistic Update: Add to list immediately
      if (messageData) {
          setMessages((prev) => [...prev, messageData]);
      }

      // 2. Upload files if any
      if (filesToUpload.length > 0) {
        const uploadPromises = filesToUpload.map((file: File) => uploadFile(file, messageData.id));
        await Promise.all(uploadPromises);
      }
      
      // Scroll after all operations complete
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('메시지 전송 실패: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
      setNewMessage(content);
      setSelectedFiles(filesToUpload);
    } finally {
      setUploading(false);
      // Keep focus on textarea - use multiple RAF for better timing after state updates
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            textareaRef.current?.focus();
          });
        });
      });
    }
  };

  if (!channelId) {
    return <div className="h-full w-full flex items-center justify-center text-gray-400">채팅을 시작할 채널을 선택하세요</div>;
  }

  if (!isMember) {
      return (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-800 p-8">
              <h2 className="text-2xl font-bold mb-4">#{channelInfo?.name || 'Channel'}</h2>
              <p className="mb-6 text-gray-500">You are viewing a preview of this channel. Join to start chatting!</p>
              <button 
                onClick={handleJoinChannel}
                className="px-6 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 transition"
              >
                  Join Channel
              </button>
          </div>
      );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-14 border-b border-gray-200 flex items-center px-4 justify-between bg-white flex-shrink-0">
             <div className="flex items-center font-bold text-gray-800">
                {channelInfo?.type === 'private' ? (
                     <>
                        <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center text-[10px] text-white mr-2">
                            {dmUser?.username?.[0]?.toUpperCase() || '@'}
                        </div>
                        {dmUser?.username || 'Unknown User'}
                     </>
                ) : (
                     <>
                        <Hash size={20} className="mr-2 text-gray-500" />
                        {channelInfo?.name || 'Loading...'}
                     </>
                )}
             </div>
             {/* Header Actions */}
             <button
               onClick={() => setShowMembersModal(true)}
               className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
               title="참여자 보기"
             >
               <Users size={18} />
               <span className="text-sm font-medium">{allMembers.length}</span>
             </button>
        </div>

        {/* Message List */}
        <div ref={messageListRef} className="flex-1 overflow-y-auto p-4">
          {/* 초기 로딩 중 */}
          {initialLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-2 text-gray-500">
                <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span>메시지 로딩 중...</span>
              </div>
            </div>
          )}
          
          {/* 메시지가 없을 때 */}
          {!initialLoading && messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-400">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">아직 메시지가 없습니다</p>
                <p className="text-sm mt-2">첫 메시지를 보내보세요!</p>
              </div>
            </div>
          )}
          
          {/* 이전 메시지 로딩 인디케이터 */}
          {!initialLoading && loadingMore && (
            <div className="flex justify-center py-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                이전 메시지 로딩 중...
              </div>
            </div>
          )}
          
          {/* 더 이상 메시지가 없음 표시 */}
          {!initialLoading && !hasMore && messages.length > 0 && (
            <div className="flex justify-center py-4">
              <div className="text-gray-400 text-xs">
                채널의 첫 메시지입니다
              </div>
            </div>
          )}
          
          <div ref={topRef} />
          
          {!initialLoading && messages.length > 0 && (
          <div className="space-y-2">
          {messages.map((msg, index) => {
            // 날짜 구분선 표시 여부 확인
            const showDateDivider = index === 0 || 
              new Date(messages[index - 1].created_at || '').toDateString() !== 
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
                  <div className="relative flex items-center py-4">
                    <div className="grow border-t border-gray-300"></div>
                    <span className="shrink-0 px-4 text-xs font-semibold text-gray-600 bg-white rounded-full border border-gray-300 shadow-sm">
                      {dateLabel}
                    </span>
                    <div className="grow border-t border-gray-300"></div>
                  </div>
                )}
            
            <div
              ref={(el) => { messageRefs.current[msg.id] = el; }}
              className={`flex gap-3 group hover:bg-gray-50 -mx-4 px-4 py-2 relative transition-all duration-300 ${
                highlightedMessageId === msg.id 
                  ? 'bg-yellow-100 border-l-4 border-yellow-500 animate-pulse' 
                  : ''
              }`}
            >
              <div className="w-9 h-9 rounded overflow-hidden flex-shrink-0">
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
                     className="font-bold text-gray-900 hover:underline cursor-pointer"
                     onClick={() => setSelectedProfileUserId(msg.user_id)}
                   >
                     {msg.profiles?.username || 'Unknown User'}
                     {msg.profiles?.deleted_at && (
                       <span className="ml-1 text-xs font-normal text-gray-400">(탈퇴됨)</span>
                     )}
                   </span>
                   <span className="text-xs text-gray-500">{new Date(msg.created_at || '').toLocaleTimeString()}</span>
                 </div>
                 {editingMessageId === msg.id ? (
                    <div className="mt-1">
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full border rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                        />
                        <div className="flex gap-2 mt-2">
                            <button 
                                onClick={() => setEditingMessageId(null)}
                                className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded border"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => handleUpdateMessage(msg.id)}
                                className="px-2 py-1 text-xs text-white bg-green-600 hover:bg-green-700 rounded"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                 ) : (
                    <p className="text-gray-800 break-words whitespace-pre-wrap">
                        {renderMessageWithMentions(msg.content || '')}
                        {msg.is_edited && <span className="text-xs text-gray-400 ml-1">(edited)</span>}
                    </p>
                 )}
                 
                 {/* Attachments */}
                 {msg.attachments && msg.attachments.length > 0 && (
                   <div className="mt-2 space-y-2">
                     {msg.attachments.map((att) => {
                       const isImage = att.mime_type?.startsWith('image/');
                       return (
                         <div key={att.id} className="border border-gray-200 rounded-lg overflow-hidden">
                           {isImage ? (
                             <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                               <img 
                                 src={att.file_url} 
                                 alt={att.file_name} 
                                 className="max-w-md max-h-96 object-contain cursor-pointer hover:opacity-90"
                               />
                             </a>
                           ) : (
                             <a 
                               href={att.file_url} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="flex items-center gap-3 p-3 hover:bg-gray-50"
                             >
                               <File size={24} className="text-gray-500" />
                               <div className="flex-1 min-w-0">
                                 <div className="font-medium text-sm truncate">{att.file_name}</div>
                                 <div className="text-xs text-gray-500">
                                   {att.file_size ? (att.file_size / 1024).toFixed(1) + ' KB' : 'Unknown size'}
                                 </div>
                               </div>
                             </a>
                           )}
                         </div>
                       );
                     })}
                   </div>
                 )}
                 
                 {/* Reactions */}
                 {msg.reactions && msg.reactions.length > 0 && (
                     <div className="flex flex-wrap gap-1 mt-1">
                         {Object.entries(
                             msg.reactions.reduce((acc, r) => {
                                 acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                 return acc;
                             }, {} as Record<string, number>)
                         ).map(([emoji, count]) => (
                             <button 
                                key={emoji} 
                                onClick={() => handleAddReaction(msg.id, emoji)}
                                className="bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-full px-2 py-0.5 text-xs flex items-center gap-1"
                             >
                                 <span>{emoji}</span>
                                 <span className="font-semibold text-gray-600">{count}</span>
                             </button>
                         ))}
                     </div>
                 )}

                 {/* Thread Indicator */}
                 {(msg.threads?.reply_count || msg.replies?.length || 0) > 0 ? (
                    <div 
                        className="mt-1 flex items-center gap-2 cursor-pointer group/thread"
                        onClick={() => setActiveThread(msg)}
                    >
                        {(() => {
                           // Find the last reply to show avatar
                           const replies = msg.replies || [];
                          const lastReply = replies.length > 0 
                               ? replies.slice().sort((a: { created_at: string }, b: { created_at: string }) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                               : null;
                          const avatarUrl = lastReply?.profiles?.avatar_url;
                           
                          const bgColor = lastReply?.profiles && typeof lastReply.profiles === 'object' && 'background_color' in lastReply.profiles
                            ? (lastReply.profiles.background_color as string | null)
                            : null;
                          return (
                            <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                 <div 
                                   className="w-full h-full flex items-center justify-center text-[10px] text-white"
                                   style={{ backgroundColor: (bgColor as string) || '#9ca3af' }}
                                 >
                                   {lastReply?.profiles && typeof lastReply.profiles === 'object' && 'username' in lastReply.profiles 
                                     ? String(lastReply.profiles.username)?.[0]?.toUpperCase() || 'U'
                                     : 'U'}
                                 </div>
                              )}
                            </div>
                           );
                        })()}

                        <div className="flex items-baseline gap-1">
                            <span className="text-blue-600 font-medium text-sm hover:underline">
                                {msg.threads?.reply_count || msg.replies?.length}개의 댓글
                            </span>
                            <span className="text-gray-400 text-xs ml-1">
                                {formatThreadDate(msg.threads?.last_reply_at || msg.replies?.[msg.replies.length - 1]?.created_at || '')}
                            </span>
                        </div>
                    </div>
                 ) : null}
              </div>

              {/* Message Actions (Hover) */}
              <div className="absolute top-2 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm border rounded flex items-center">
                  {user?.id === msg.user_id && (
                    <>
                        <button 
                            onClick={() => startEditing(msg)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100"
                            title="Edit message"
                        >
                            <Pencil size={16} />
                        </button>
                        <button 
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100"
                            title="Delete message"
                        >
                            <Trash2 size={16} />
                        </button>
                    </>
                  )}
                  <button 
                    onClick={() => setActiveThread(msg)}
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    title="Reply in thread"
                  >
                      <MessageSquare size={16} />
                  </button>
                  <button 
                    onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 relative"
                    title="Add reaction"
                  >
                      <Smile size={16} />
                  </button>
                  
                  {/* Emoji Picker Popover */}
                  {showEmojiPicker === msg.id && (
                      <div className="absolute top-full right-0 mt-1 bg-white shadow-xl border border-gray-200 rounded-lg p-2 flex gap-1 z-50 w-max">
                          {COMMON_EMOJIS.map(emoji => (
                              <button 
                                key={emoji} 
                                onClick={(e) => { 
                                    e.stopPropagation();
                                    handleAddReaction(msg.id, emoji); 
                                    setShowEmojiPicker(null); 
                                }}
                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-lg transition"
                              >
                                  {emoji}
                              </button>
                          ))}
                      </div>
                  )}
              </div>
            </div>
            </React.Fragment>
            );
          })}
          </div>
          )}
          
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200">
          {/* File Preview */}
          {selectedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative bg-gray-100 border border-gray-300 rounded-lg p-2 flex items-center gap-2 max-w-xs">
                  <File size={16} className="text-gray-500 flex-shrink-0" />
                  <span className="text-sm truncate flex-1">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-gray-500 hover:text-red-600 flex-shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          
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

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="absolute bottom-full left-0 mb-[5px] bg-white border border-gray-200 rounded-md shadow-sm px-3 py-1.5 text-xs text-gray-600 z-10">
                {typingUsers.length === 1 ? (
                  <span>{typingUsers[0].username} 님이 입력 중 입니다</span>
                ) : (
                  <span>{typingUsers[0].username} 님 외 {typingUsers.length - 1}명이 입력 중 입니다</span>
                )}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="relative rounded-lg border border-gray-300 shadow-sm focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => handleMessageChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${channelInfo?.type === 'private' ? (dmUser?.username || 'User') : ('#' + (channelInfo?.name || 'channel'))}`}
                className="block w-full border-0 pt-2.5 pb-2 pl-3 pr-20 resize-none focus:ring-0 sm:text-sm min-h-[50px] max-h-[200px]" 
                rows={1}
                autoFocus
              />
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-50"
                title="파일 첨부"
              >
                <Paperclip size={18} />
              </button>
              <button
                type="submit"
                disabled={(!newMessage.trim() && selectedFiles.length === 0) || uploading}
                className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
            </form>
            <div className="text-xs text-gray-400 mt-1 text-right">
              <strong>Return</strong> to send, <strong>Shift + Return</strong> for new line
              {uploading && <span className="ml-2 text-blue-600">업로드 중...</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Thread View Sidebar */}
      {activeThread && (
        <ThreadView 
            parentMessage={activeThread} 
            onClose={() => setActiveThread(null)} 
        />
      )}

      {/* User Profile Modal */}
      {selectedProfileUserId && (
        <UserProfileModal
          userId={selectedProfileUserId}
          onClose={() => setSelectedProfileUserId(null)}
        />
      )}

      {/* Channel Members Modal */}
      {showMembersModal && (
        <ChannelMembersModal
          members={allMembers}
          currentUserId={user?.id}
          onlineUsers={onlineUsers}
          onClose={() => setShowMembersModal(false)}
        />
      )}
    </div>
  );
}
