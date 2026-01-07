import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../types/database.types';
import { X } from 'lucide-react';

type Workspace = Database['public']['Tables']['workspaces']['Row'];

interface CreateWorkspaceModalProps {
  onClose: () => void;
  onCreated: (workspace: Workspace) => void;
  onJoinRequest: () => void;
}

export default function CreateWorkspaceModal({ onClose, onCreated }: CreateWorkspaceModalProps) {
  const [workspaceName, setWorkspaceName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const { user } = useAuth();

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim() || !user) return;

    setCreating(true);
    setError('');

    try {
      // slug 생성: 이름 기반 + 타임스탬프로 고유성 보장
      const baseSlug = workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const uniqueSlug = `${baseSlug}-${Date.now()}`;
      
      const { data: ws, error: wsError } = await supabase
        .from('workspaces')
        .insert({ name: workspaceName.trim(), slug: uniqueSlug, owner_id: user.id })
        .select()
        .single();

      if (wsError) throw wsError;

      const { error: memberError } = await supabase
        .from('members')
        .insert({ workspace_id: ws.id, user_id: user.id, role: 'owner' });

      if (memberError) throw memberError;

      onCreated(ws);
      onClose();
    } catch (err) {
      console.error('워크스페이스 생성 오류:', err);
      const errorMessage = err instanceof Error ? err.message : '워크스페이스 생성 실패';
      setError(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !user) return;

    setJoining(true);
    setError('');

    try {
      const { data: workspaceId, error: joinError } = await supabase.rpc('join_workspace_by_code', {
        invite_code: inviteCode.trim()
      });

      if (joinError) throw joinError;

      // 워크스페이스 정보 가져오기
      const { data: ws, error: wsError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

      if (wsError) throw wsError;

      onCreated(ws);
      onClose();
    } catch (err) {
      console.error('워크스페이스 참여 오류:', err);
      const errorMessage = err instanceof Error ? err.message : '워크스페이스 참여 실패';
      setError(errorMessage);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'create' ? '새 워크스페이스 만들기' : '워크스페이스 참여'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setMode('create')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                mode === 'create'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              만들기
            </button>
            <button
              onClick={() => setMode('join')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                mode === 'join'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              참여하기
            </button>
          </div>

          {/* Create Form */}
          {mode === 'create' && (
            <form onSubmit={handleCreateWorkspace}>
              <div className="mb-4">
                <label htmlFor="workspace-name" className="block text-sm font-medium text-gray-700 mb-2">
                  워크스페이스 이름
                </label>
                <input
                  id="workspace-name"
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="예: 우리 회사, 개발팀, 스터디 그룹"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  autoFocus
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  팀원들과 함께 사용할 워크스페이스 이름을 입력하세요.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 text-sm rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  disabled={creating}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={creating || !workspaceName.trim()}
                  className="flex-1 px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? '생성 중...' : '만들기'}
                </button>
              </div>
            </form>
          )}

          {/* Join Form */}
          {mode === 'join' && (
            <form onSubmit={handleJoinWorkspace}>
              <div className="mb-4">
                <label htmlFor="invite-code" className="block text-sm font-medium text-gray-700 mb-2">
                  초대 코드
                </label>
                <input
                  id="invite-code"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="초대 코드를 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono uppercase"
                  autoFocus
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  관리자로부터 받은 초대 코드를 입력하세요.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 text-sm rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  disabled={joining}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={joining || !inviteCode.trim()}
                  className="flex-1 px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {joining ? '참여 중...' : '참여하기'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
