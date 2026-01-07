import React, { useState, useEffect } from 'react';
import { X, Copy, Trash2, RefreshCw, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../types/database.types';

interface InviteUserModalProps {
  workspaceId: string;
  onClose: () => void;
}

type Invitation = Database['public']['Tables']['invitations']['Row'] & {
  created_by_user?: {
    username: string;
    full_name: string;
  }
};

export default function InviteUserModal({ workspaceId, onClose }: InviteUserModalProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  
  // Create state
  const [maxUses, setMaxUses] = useState<string>('unlimited');
  const [expiresIn, setExpiresIn] = useState<string>('7d');
  const [generatedLink, setGeneratedLink] = useState('');

  // Manage state
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  useEffect(() => {
    if (activeTab === 'manage') {
      fetchInvitations();
    }
  }, [activeTab]);

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*, created_by_user:profiles(username, full_name)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []); // Type assertion needed for joined data
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
      setError('초대 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    setGeneratedLink('');

    try {
      const code = Math.random().toString(36).substring(2, 12).toUpperCase();
      
      let expiresAt: string | null = null;
      const now = new Date();
      if (expiresIn === '1d') expiresAt = new Date(now.setDate(now.getDate() + 1)).toISOString();
      else if (expiresIn === '7d') expiresAt = new Date(now.setDate(now.getDate() + 7)).toISOString();
      else if (expiresIn === '30d') expiresAt = new Date(now.setDate(now.getDate() + 30)).toISOString();
      
      const maxUsesVal = maxUses === 'unlimited' ? null : parseInt(maxUses);

      const { data, error } = await supabase
        .from('invitations')
        .insert({
          workspace_id: workspaceId,
          code: code,
          created_by: user.id,
          expires_at: expiresAt,
          max_uses: maxUsesVal
        })
        .select()
        .single();

      if (error) throw error;

      // In a real app, this would be a full URL like https://app.nateslack.com/join/CODE
      // For now, we'll just show the code or a dummy URL
      const link = `nateslack://join/${data.code}`; 
      setGeneratedLink(link);

    } catch (err) {
      console.error('Failed to create invitation:', err);
      setError(err instanceof Error ? err.message : '초대 링크 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    if (!confirm('정말로 이 초대 링크를 삭제하시겠습니까? 삭제하면 더 이상 사용할 수 없습니다.')) return;
    
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setInvitations(invitations.filter(inv => inv.id !== id));
    } catch (err) {
      console.error('Failed to delete invitation:', err);
      alert('초대 삭제 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    alert('링크가 복사되었습니다!');
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <UserPlus size={24} />
            멤버 초대하기
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          <button
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'create' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('create')}
          >
            초대 링크 생성
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'manage' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('manage')}
          >
            초대 관리
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'create' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">유효 기간</label>
                <select
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1d">1일</option>
                  <option value="7d">7일</option>
                  <option value="30d">30일</option>
                  <option value="unlimited">무제한</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">최대 사용 횟수</label>
                <select
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">1회</option>
                  <option value="10">10회</option>
                  <option value="100">100회</option>
                  <option value="unlimited">무제한</option>
                </select>
              </div>

              <button
                onClick={handleCreateInvite}
                disabled={loading}
                className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium disabled:opacity-50"
              >
                {loading ? '생성 중...' : '링크 생성하기'}
              </button>

              {generatedLink && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-500 mb-2">이 링크를 복사하여 초대하려는 사람에게 보내세요:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedLink}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center gap-2"
                    >
                      <Copy size={16} />
                      복사
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex justify-end mb-4">
                <button 
                  onClick={fetchInvitations} 
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  <RefreshCw size={14} /> 새로고침
                </button>
              </div>
              
              {invitations.length === 0 ? (
                <p className="text-center text-gray-500 py-8">생성된 초대 링크가 없습니다.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th className="px-4 py-3">코드</th>
                        <th className="px-4 py-3">생성자</th>
                        <th className="px-4 py-3">만료일</th>
                        <th className="px-4 py-3">사용/최대</th>
                        <th className="px-4 py-3">관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invitations.map((inv) => (
                        <tr key={inv.id} className="bg-white border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono font-medium text-gray-900">{inv.code}</td>
                          <td className="px-4 py-3">{inv.created_by_user?.username || 'Unknown'}</td>
                          <td className="px-4 py-3">
                            {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : '무제한'}
                          </td>
                          <td className="px-4 py-3">
                            {inv.used_count} / {inv.max_uses || '∞'}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleDeleteInvite(inv.id)}
                              className="text-red-600 hover:text-red-800"
                              title="삭제"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 text-sm rounded">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

