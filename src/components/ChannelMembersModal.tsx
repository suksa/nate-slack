import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { Database } from '../types/database.types';
import UserProfileModal from './UserProfileModal';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface ChannelMembersModalProps {
  members: Profile[];
  currentUserId?: string;
  onlineUsers?: Set<string>;
  onClose: () => void;
}

export default function ChannelMembersModal({ members, currentUserId, onlineUsers = new Set(), onClose }: ChannelMembersModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);

  // 현재 사용자 포함한 전체 멤버 목록 (정렬: 현재 사용자 먼저, 그 다음 이름순)
  const sortedMembers = [...members].sort((a, b) => {
    // 현재 사용자를 맨 위로
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    // 그 다음 이름순 정렬
    const nameA = a.username || a.full_name || '';
    const nameB = b.username || b.full_name || '';
    return nameA.localeCompare(nameB, 'ko');
  });
  
  // 검색 필터링
  const filteredMembers = sortedMembers.filter(member => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.username?.toLowerCase().includes(query) ||
      member.full_name?.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
        <div 
          className="bg-white rounded-lg w-[480px] max-h-[600px] shadow-xl flex flex-col" 
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">참여자</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition p-1 rounded hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="참여자 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Members List */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase mb-2">
              {filteredMembers.length}명
            </div>
            {filteredMembers.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                검색 결과가 없습니다
              </div>
            ) : (
              <div className="space-y-1">
                {filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedProfileUserId(member.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded overflow-hidden shrink-0 relative">
                      {member.avatar_url ? (
                        <img 
                          src={member.avatar_url} 
                          alt={member.username || 'User'} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: member.background_color || '#6b7280' }}
                        >
                          {(member.username || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      {/* 접속 상태 표시 */}
                      {onlineUsers.has(member.id) && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">
                          {member.username || 'Unknown User'}
                        </span>
                        {onlineUsers.has(member.id) && (
                          <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                            접속 중
                          </span>
                        )}
                        {member.deleted_at && (
                          <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                            탈퇴됨
                          </span>
                        )}
                        {member.id === currentUserId && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            나
                          </span>
                        )}
                      </div>
                      {member.full_name && (
                        <div className="text-sm text-gray-500 truncate">
                          {member.full_name}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Profile Modal */}
      {selectedProfileUserId && (
        <UserProfileModal
          userId={selectedProfileUserId}
          onClose={() => setSelectedProfileUserId(null)}
        />
      )}
    </>
  );
}

