import React, { useEffect, useState } from 'react';
import { X, Mail, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
}

interface UserProfile extends Profile {
  email?: string;
}

export default function UserProfileModal({ userId, onClose }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        // 프로필 정보 가져오기
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) throw profileError;

        // 이메일 정보 가져오기 (RPC 함수 사용)
        const { data: email } = await supabase
          .rpc('get_user_email', { user_id: userId });

        setProfile({
          ...profileData,
          email: email || undefined
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-lg p-6 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-lg p-6 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="text-center text-gray-500">프로필을 찾을 수 없습니다</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">프로필</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Avatar & Name */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full overflow-hidden mb-3">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center text-3xl font-bold text-white"
                  style={{ backgroundColor: profile.background_color || '#6b7280' }}
                >
                  {(profile.username || 'U')[0].toUpperCase()}
                </div>
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {profile.username || 'Unknown User'}
              {profile.deleted_at && (
                <span className="text-sm font-normal text-red-500 bg-red-50 px-2 py-1 rounded">
                  탈퇴됨
                </span>
              )}
            </h3>
            {profile.full_name && (
              <p className="text-sm text-gray-500 mt-1">{profile.full_name}</p>
            )}
          </div>

          {/* Info */}
          <div className="space-y-3">
            {/* Email */}
            {profile.email && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail size={18} className="text-gray-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 mb-1">이메일</div>
                  <div className="text-sm text-gray-900 break-all">{profile.email}</div>
                </div>
              </div>
            )}

            {/* Status */}
            {profile.status && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                  profile.status === 'active' ? 'bg-green-500' :
                  profile.status === 'away' ? 'bg-yellow-500' :
                  profile.status === 'dnd' ? 'bg-red-500' : 'bg-gray-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 mb-1">상태</div>
                  <div className="text-sm text-gray-900">
                    {profile.status === 'active' ? '활성' :
                     profile.status === 'away' ? '자리 비움' :
                     profile.status === 'dnd' ? '방해 금지' : '오프라인'}
                  </div>
                  {profile.status_message && (
                    <div className="text-xs text-gray-500 mt-1">{profile.status_message}</div>
                  )}
                </div>
              </div>
            )}

            {/* Deleted Date */}
            {profile.deleted_at && (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <Calendar size={18} className="text-red-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-red-600 mb-1">탈퇴일</div>
                  <div className="text-sm text-red-700">
                    {new Date(profile.deleted_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

