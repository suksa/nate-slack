import React, { useState } from 'react';
import { X, Hash, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CreateChannelModalProps {
  workspaceId: string;
  onClose: () => void;
  onCreated?: () => void;
}

export default function CreateChannelModal({ workspaceId, onClose, onCreated }: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !workspaceId) return;

    // 이름 유효성 검사
    const cleanName = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9가-힣ㄱ-ㅎㅏ-ㅣ-_]/g, '');
    if (!cleanName) {
      setError('채널 이름을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. 채널 생성
      const { data: channel, error: createError } = await supabase
        .from('channels')
        .insert({
          workspace_id: workspaceId,
          name: cleanName,
          description: description.trim() || null,
          type: isPrivate ? 'private' : 'public',
          created_by: user.id
        })
        .select()
        .single();

      if (createError) throw createError;

      // 2. 채널 멤버로 참여 (RLS 정책상 생성자가 자동으로 참여되지 않을 수 있으므로 명시적 추가)
      // 단, 트리거가 있다면 중복될 수 있으나 ON CONFLICT 처리됨
      const { error: joinError } = await supabase
        .from('channel_members')
        .insert({
          channel_id: channel.id,
          user_id: user.id
        });

      if (joinError) {
        console.warn('채널 생성 후 참여 실패 (이미 참여되었을 수 있음):', joinError);
      }

      onCreated?.();
      onClose();
    } catch (err) {
      console.error('채널 생성 오류:', err);
      setError(err instanceof Error ? err.message : '채널 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {isPrivate ? '비공개 채널 생성' : '채널 생성'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* 이름 입력 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  {isPrivate ? <Lock size={16} /> : <Hash size={16} />}
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 기획-디자인"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  maxLength={80}
                  autoFocus
                  autoComplete="off"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                채널 이름은 한글, 영문 소문자, 숫자, 하이픈, 언더스코어를 사용할 수 있습니다.
              </p>
            </div>

            {/* 설명 입력 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                설명 <span className="text-gray-400 font-normal">(선택사항)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="이 채널에 대한 설명을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>

            {/* 공개/비공개 설정 */}
            <div className="mb-6">
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-900">
                    비공개로 만들기
                  </span>
                  <span className="block text-xs text-gray-500 mt-1">
                    비공개 채널은 초대를 통해서만 가입할 수 있으며, 채널 목록에 표시되지 않습니다.
                  </span>
                </div>
              </label>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 text-sm rounded">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={loading}
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || !name.trim()}
              >
                {loading ? '생성 중...' : '채널 생성'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

