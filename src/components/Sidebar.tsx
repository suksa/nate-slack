import React, { useEffect, useState, useRef } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';
import { Hash, Lock, Plus, ChevronDown, ChevronRight, UserPlus, LogOut, User, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import UserSelectModal from './UserSelectModal';
import CreateChannelModal from './CreateChannelModal';
import InviteUserModal from './InviteUserModal';

type Channel = Database['public']['Tables']['channels']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface DMChannel {
  id: string;
  otherUser: Profile | null;
  unreadCount?: number;
}

type Workspace = Database['public']['Tables']['workspaces']['Row'];

export default function Sidebar() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [dms, setDms] = useState<DMChannel[]>([]);
  const [showUserSelect, setShowUserSelect] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showChannels, setShowChannels] = useState(true);
  const [showDMs, setShowDMs] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { channelId: currentChannelId } = useParams<{ channelId: string }>(); // Get current channel ID
  const hasWorkspace = Boolean(workspaceId && workspace?.id);
  
  // React Query로 프로필 조회 (자동 캐싱)
  const { data: userProfile } = useProfile(user?.id);
  
  // Ref to access current channels/dms inside event handler without re-subscribing
  const channelsRef = useRef(channels);
  const dmsRef = useRef(dms);
  const currentChannelIdRef = useRef(currentChannelId);
  
  useEffect(() => {
    channelsRef.current = channels;
    dmsRef.current = dms;
    currentChannelIdRef.current = currentChannelId;
  }, [channels, dms, currentChannelId]);

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Reset unread count for current channel
  useEffect(() => {
    if (currentChannelId) {
        setUnreadCounts(prev => ({ ...prev, [currentChannelId]: 0 }));
    }
  }, [currentChannelId]);

  // Fetch workspace info
  useEffect(() => {
    let isMounted = true;

    const fetchWorkspace = async () => {
      if (!workspaceId) {
        if (isMounted) {
          setWorkspace(null);
        }
        return;
      }
      
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();
      
      if (isMounted && !error && data) {
        setWorkspace(data);
      }
    };
    
    fetchWorkspace();

    return () => {
      isMounted = false;
    };
  }, [workspaceId]);
  
  const fetchData = async () => {
    if (!workspaceId || !user) return;

    // 1. Fetch Public Channels
    const { data: publicData, error: publicError } = await supabase
      .from('channels')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('type', 'public')
      .order('name');
    
    if (publicError) console.error('Error fetching public channels:', publicError);

    // 2. Fetch My Private Channels (Not DMs)
    const { data: myPrivateMemberships } = await supabase
      .from('channel_members')
      .select('channel_id, channels!inner(*)')
      .eq('user_id', user.id)
      .eq('channels.workspace_id', workspaceId)
      .eq('channels.type', 'private');
    
    // Filter out DMs (DMs usually have specific name format or logic, but for now assuming non-DM private channels exist)
    // Actually, in this app DMs are just private channels. 
    // We separate them by checking if it's a "DM" style channel (2 members usually) or explicit logic.
    // For now, let's just combine public and ALL my private channels into the list, 
    // BUT we need to separate "Direct Messages" section.
    // The previous logic for DMs was: fetch private channels -> check if 2 members -> add to DM list.
    // We should keep that. But non-DM private channels should go to "Channels" list.
    
    const allPublic = publicData || [];
    const myPrivateChannels = myPrivateMemberships?.map((m: { channels: Channel }) => m.channels) || [];
    
    // Identify DMs vs Private Groups
    // For simplicity in this codebase: 
    // - DMs are private channels I am in.
    // - "Channels" list shows Public channels + Private channels that are NOT DMs.
    // How to distinguish? DMs usually created via "Start DM" flow. 
    // Let's reuse the existing DM fetching logic but filter them out from "Channels" list if needed.
    // Or simpler: Show ALL Public channels in "Channels". Show ALL Private channels I'm in as "DMs" OR "Channels"?
    // Standard Slack: 
    // - Channels: Public + Private (Groups)
    // - DMs: 1:1 conversations
    
    // Let's simplify: 
    // 1. Get all Public channels -> setChannels
    // 2. Get all Private channels I am in.
    // 3. For each private channel, check if it looks like a DM (e.g. name starts with 'dm-' or based on members).
    //    Current createDM logic uses name `dm-${Date.now()}`.
    
    const dmsList: DMChannel[] = [];
    const privateGroupChannels: Channel[] = [];

    if (myPrivateChannels.length > 0) {
        for (const ch of myPrivateChannels) {
            // Check if it is a DM (starts with dm-)
            if (ch.name.startsWith('dm-')) {
                 const { data: members } = await supabase
                    .from('channel_members')
                    .select('user_id, profiles(*)')
                    .eq('channel_id', ch.id)
                    .neq('user_id', user.id)
                    .single(); // Assuming 1:1 DM
                
                 if (members && members.profiles) {
                    dmsList.push({
                        id: ch.id,
                        otherUser: members.profiles,
                    });
                 }
            } else {
                // It's a private channel (group), add to channels list
                privateGroupChannels.push(ch);
            }
        }
    }

    // Merge Public + Private Groups
    const mergedChannels = [...allPublic, ...privateGroupChannels].sort((a, b) => a.name.localeCompare(b.name));
    // Deduplicate just in case
    const uniqueChannels = Array.from(new Map(mergedChannels.map(item => [item.id, item])).values());
    
    setChannels(uniqueChannels);
    setDms(dmsList);
  };


  useEffect(() => {
    if (!workspaceId || !user?.id) return;

    // Presence Subscription
    const presenceChannel = supabase.channel(`presence-${workspaceId}`)
    
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const newState = presenceChannel.presenceState();
        const onlineIds = new Set<string>();
        Object.values(newState).forEach((presences: unknown) => {
            if (Array.isArray(presences)) {
                presences.forEach((p: { user_id?: string }) => {
                    if(p.user_id) onlineIds.add(p.user_id);
                });
            }
        });
        setOnlineUsers(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
           await presenceChannel.track({ 
             user_id: user.id, 
             online_at: new Date().toISOString(),
             status: 'active'
           });
        }
      });

    fetchData();
    
    // Subscribe to new channels
    const channelSub = supabase
      .channel(`workspace-channels-${workspaceId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'channels',
        filter: `workspace_id=eq.${workspaceId}` 
      }, () => {
        fetchData();
      })
      .subscribe();

    // Subscribe to all messages for unread counts & notifications
    const messageSub = supabase
      .channel(`workspace-messages-${workspaceId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, async (payload) => {
          const newMsg = payload.new as Database['public']['Tables']['messages']['Row'];
          
          // 1. Ignore my own messages
          if (newMsg.user_id === user.id) return;

          // Check if message belongs to one of my channels/dms
          const myChannel = channelsRef.current.find(c => c.id === newMsg.channel_id);
          const myDM = dmsRef.current.find(d => d.id === newMsg.channel_id);
          
          // Check if window is hidden (tray state)
          const isWindowHidden = document.hidden;
          
          // Show notification if:
          // - Window is hidden (tray state) OR
          // - Message is from a different channel than current
          const shouldNotify = isWindowHidden || newMsg.channel_id !== currentChannelIdRef.current;
          
          if ((myChannel || myDM) && shouldNotify) {
              // 2. Increment unread count
              setUnreadCounts(prev => ({
                  ...prev,
                  [newMsg.channel_id]: (prev[newMsg.channel_id] || 0) + 1
              }));

              // 3. Show Desktop Notification
              if (Notification.permission === 'granted') {
                  // Fetch sender profile
                  const { data: senderProfile } = await supabase
                      .from('profiles')
                      .select('username')
                      .eq('id', newMsg.user_id)
                      .single();
                  
                  const senderName = senderProfile?.username || '알 수 없음';
                  const messageContent = newMsg.content || '(File)';
                  
                  let title = 'New Message';
                  let body = messageContent;

                  // Set title and body with sender name
                  if (myChannel) {
                      title = `#${myChannel.name}`;
                      body = `${senderName}: ${messageContent}`;
                  } else if (myDM) {
                      title = `${myDM.otherUser?.username || 'DM'}`;
                      body = `${senderName}: ${messageContent}`;
                  }

                  const notif = new Notification(title, {
                      body: body,
                      icon: '/icon.png', // Optional: add app icon if available
                      silent: false
                  });

                  notif.onclick = () => {
                      navigate(`/workspace/${workspaceId}/channel/${newMsg.channel_id}`);
                      window.focus(); // Focus the electron window
                      // If it's a thread reply, we might want to pass state or query param, 
                      // but basic channel navigation covers the request.
                  };
              }
          }
      })
      .subscribe();

    return () => {
      channelSub.unsubscribe();
      messageSub.unsubscribe();
      presenceChannel.unsubscribe();
    };
  }, [workspaceId, user?.id]); // user 대신 user?.id로 변경

  const handleStartDM = async (otherUserId: string) => {
    setShowUserSelect(false);
    if (!workspaceId || !user) return;

    const { data: myChannels } = await supabase
      .from('channel_members')
      .select('channel_id')
      .eq('user_id', user.id);
      
    const myChannelIds = myChannels?.map(c => c.channel_id) || [];

    if (myChannelIds.length > 0) {
        const { data: commonChannels } = await supabase
          .from('channel_members')
          .select('channel_id, channels!inner(*)')
          .eq('user_id', otherUserId)
          .in('channel_id', myChannelIds)
          .eq('channels.type', 'private')
          .eq('channels.workspace_id', workspaceId);

        if (commonChannels && commonChannels.length > 0) {
           navigate(`/workspace/${workspaceId}/channel/${commonChannels[0].channel_id}`);
           return;
        }
    }

    const { data: newChannel, error: createError } = await supabase
      .from('channels')
      .insert({
        workspace_id: workspaceId,
        name: `dm-${Date.now()}`,
        type: 'private',
        created_by: user.id
      })
      .select()
      .single();

    if (createError) {
      alert(createError.message);
      return;
    }

    await supabase.from('channel_members').insert([
      { channel_id: newChannel.id, user_id: user.id },
      { channel_id: newChannel.id, user_id: otherUserId }
    ]);

    navigate(`/workspace/${workspaceId}/channel/${newChannel.id}`);
    fetchData();
  };

  return (
    <div className="w-64 shrink-0 h-full text-gray-300 bg-gray-900 flex flex-col border-r border-gray-800 overflow-hidden">
      {/* Workspace Header */}
      <div className="h-12 px-4 flex items-center justify-between hover:bg-gray-800 transition-colors cursor-pointer border-b border-gray-800">
        <h2 className="font-bold text-white truncate">{hasWorkspace ? workspace?.name : '워크스페이스 없음'}</h2>
        {hasWorkspace && (
          <div className="flex gap-2">
            <button onClick={() => setShowInviteModal(true)} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Invite People">
                <UserPlus size={16} />
            </button>
          </div>
        )}
      </div>
      
      {hasWorkspace ? (
        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          {/* Threads Button */}
          <div className="mb-2 px-2">
            <button
              onClick={() => {
                navigate(`/workspace/${workspaceId}/threads`);
              }}
              className="w-full flex items-center px-3 py-2 gap-2 hover:bg-gray-800 transition-colors text-left text-gray-400 hover:text-white rounded group"
            >
              <MessageSquare size={16} className="flex-shrink-0" />
              <span className="text-sm font-medium">쓰레드</span>
            </button>
          </div>

          {/* Channels Section */}
          <div className="mb-4">
              <div 
                  className="px-3 flex items-center justify-between group cursor-pointer hover:text-white"
                  onClick={() => setShowChannels(!showChannels)}
              >
                  <div className="flex items-center gap-1 text-sm font-medium">
                      {showChannels ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      <span>채널</span>
                  </div>
                  <button 
                      onClick={(e) => { e.stopPropagation(); setShowCreateChannel(true); }}
                      className="opacity-0 group-hover:opacity-100 hover:bg-gray-700 p-0.5 rounded"
                  >
                      <Plus size={14} />
                  </button>
              </div>
              
              {showChannels && (
                  <ul className="mt-1 space-y-0.5">
                  {channels.map((channel) => (
                      <li key={channel.id}>
                      <NavLink
                          to={`/workspace/${workspaceId}/channel/${channel.id}`}
                          className={({ isActive }) =>
                          `flex items-center px-4 py-1 gap-2 hover:bg-gray-800 transition-colors ${isActive ? 'bg-blue-700 text-white' : (unreadCounts[channel.id] ? 'text-white font-bold' : 'text-gray-400')}`
                          }
                      >
                          {channel.type === 'private' ? <Lock size={14} /> : <Hash size={14} />}
                          <span className="truncate flex-1">{channel.name}</span>
                          {unreadCounts[channel.id] > 0 && (
                              <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full min-w-[16px] text-center">
                                  {unreadCounts[channel.id]}
                              </span>
                          )}
                      </NavLink>
                      </li>
                  ))}
                  </ul>
              )}
          </div>

          {/* Direct Messages Section */}
          <div className="mb-4">
              <div 
                  className="px-3 flex items-center justify-between group cursor-pointer hover:text-white"
                  onClick={() => setShowDMs(!showDMs)}
              >
                  <div className="flex items-center gap-1 text-sm font-medium">
                      {showDMs ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      <span>다이렉트 메시지</span>
                  </div>
                  <button 
                      onClick={(e) => { e.stopPropagation(); setShowUserSelect(true); }}
                      className="opacity-0 group-hover:opacity-100 hover:bg-gray-700 p-0.5 rounded"
                  >
                      <Plus size={14} />
                  </button>
              </div>

              {showDMs && (
                  <ul className="mt-1 space-y-0.5">
                  {dms.map((dm) => {
                      const isOnline = onlineUsers.has(dm.otherUser?.id || '');
                      return (
                          <li key={dm.id}>
                          <NavLink
                              to={`/workspace/${workspaceId}/channel/${dm.id}`}
                              className={({ isActive }) =>
                              `flex items-center px-4 py-1 gap-2 hover:bg-gray-800 transition-colors ${isActive ? 'bg-blue-700 text-white' : (unreadCounts[dm.id] ? 'text-white font-bold' : 'text-gray-400')}`
                              }
                          >
                              <div className="relative">
                                  <div 
                                    className="w-4 h-4 rounded flex items-center justify-center text-[9px] text-white font-bold"
                                    style={{ backgroundColor: dm.otherUser?.background_color || '#4b5563' }}
                                  >
                                      {dm.otherUser?.username?.[0]?.toUpperCase() || 'U'}
                                  </div>
                                  {isOnline && (
                                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-900"></div>
                                  )}
                              </div>
                              <span className="truncate opacity-90 flex-1">{dm.otherUser?.username || 'Unknown'}</span>
                              {unreadCounts[dm.id] > 0 && (
                                  <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full min-w-[16px] text-center">
                                      {unreadCounts[dm.id]}
                                  </span>
                              )}
                          </NavLink>
                          </li>
                      );
                  })}
                  </ul>
              )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-500 px-4">
          워크스페이스를 생성하거나 초대를 받아주세요.
        </div>
      )}
      
      {/* User Status Footer */}
      <div className="relative">
        {/* User Menu Dropdown */}
        {showUserMenu && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-30" 
              onClick={() => setShowUserMenu(false)}
            />
            
            {/* Menu */}
            <div className="absolute bottom-full left-0 right-0 mb-2 mx-2 bg-white rounded-lg shadow-xl border border-gray-200 z-40 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {userProfile?.avatar_url ? (
                      <img 
                        src={userProfile.avatar_url} 
                        alt="Profile" 
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div 
                        className="w-10 h-10 rounded flex items-center justify-center font-bold text-white"
                        style={{ backgroundColor: userProfile?.background_color || '#15803d' }}
                      >
                        {(userProfile?.username || user?.email)?.[0].toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900 truncate">
                      {userProfile?.username || user?.email?.split('@')[0]}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                  </div>
                </div>
              </div>
              
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/profile');
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <User size={16} />
                  프로필 설정
                </button>
                
                <button
                  onClick={async () => {
                    setShowUserMenu(false);
                    await signOut();
                    navigate('/login');
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut size={16} />
                  로그아웃
                </button>
              </div>
            </div>
          </>
        )}

        <div 
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="p-3 bg-gray-850 hover:bg-gray-800 transition-colors cursor-pointer border-t border-gray-800 flex items-center gap-2"
        >
          <div className="relative">
              {userProfile?.avatar_url ? (
                <img 
                  src={userProfile.avatar_url} 
                  alt="Profile" 
                  className="w-9 h-9 rounded object-cover"
                />
              ) : (
                <div 
                  className="w-9 h-9 rounded flex items-center justify-center font-bold text-white"
                  style={{ backgroundColor: userProfile?.background_color || '#15803d' }}
                >
                    {(userProfile?.username || user?.email)?.[0].toUpperCase() || 'U'}
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
          </div>
          <div className="flex-1 overflow-hidden">
              <div className="text-sm font-bold text-white truncate">
                {userProfile?.username || user?.email?.split('@')[0]}
              </div>
              <div className="text-xs text-gray-400">Active</div>
          </div>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {showUserSelect && workspaceId && user?.id && (
        <UserSelectModal
          workspaceId={workspaceId}
          currentUserId={user.id}
          onSelect={handleStartDM}
          onClose={() => setShowUserSelect(false)}
        />
      )}

      {showCreateChannel && workspaceId && (
        <CreateChannelModal
          workspaceId={workspaceId}
          onClose={() => setShowCreateChannel(false)}
          onCreated={fetchData}
        />
      )}

      {showInviteModal && workspaceId && (
        <InviteUserModal
          workspaceId={workspaceId}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}

