import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { Plus, Home } from 'lucide-react';
import CreateWorkspaceModal from './CreateWorkspaceModal';

export default function WorkspaceSidebar() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  
  // React Query로 워크스페이스 조회 (자동 캐싱 및 중복 요청 방지)
  const { data: workspaces = [], isLoading: loading, refetch } = useWorkspaces(user?.id);

  // 첫 로그인 시 자동 이동
  useEffect(() => {
    if (workspaces.length > 0 && !workspaceId) {
      navigate(`/workspace/${workspaces[0].id}`, { replace: true });
    }
  }, [workspaces.length, workspaceId, navigate]);

  const handleWorkspaceCreated = (newWorkspace: Database['public']['Tables']['workspaces']['Row']) => {
    refetch(); // 워크스페이스 목록 새로고침
    navigate(`/workspace/${newWorkspace.id}`);
  };

  if (loading) {
    return (
      <div className="w-16 shrink-0 h-full bg-gray-950 flex flex-col items-center py-3 gap-2 overflow-hidden">
        <div className="w-10 h-10 bg-gray-800 rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  return (
    <>
      <div className="w-16 shrink-0 h-full bg-gray-950 flex flex-col items-center py-3 gap-2 overflow-y-auto overflow-x-hidden border-r border-gray-900 custom-scrollbar">
        {/* Home / All Workspaces Button */}
        <button
          onClick={() => workspaces.length > 0 && navigate(`/workspace/${workspaces[0].id}`)}
          className="w-11 h-11 shrink-0 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center hover:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl group relative"
          title="홈"
        >
          <Home size={20} className="text-white" />
        </button>

        <div className="w-8 h-px bg-gray-800 my-1"></div>

        {/* Workspace List */}
        {workspaces.map((ws) => {
          const isActive = workspaceId === ws.id;
          const initial = ws.name[0].toUpperCase();
          
          return (
            <button
              key={ws.id}
              onClick={() => navigate(`/workspace/${ws.id}`)}
              className={`w-11 h-11 shrink-0 flex items-center justify-center font-semibold text-base rounded-2xl hover:rounded-xl transition-all duration-200 relative group ${
                isActive
                  ? 'bg-white text-gray-900 rounded-xl shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white shadow-md hover:shadow-lg'
              }`}
              title={ws.name}
            >
              {initial}
              {isActive && (
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-9 bg-white rounded-r-full"></div>
              )}
              
              {/* Tooltip */}
              <div className="absolute left-full ml-3 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-xl border border-gray-700">
                {ws.name}
              </div>
            </button>
          );
        })}

        {/* Add Workspace Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-11 h-11 shrink-0 border-2 border-dashed border-gray-700 text-gray-400 rounded-2xl hover:border-gray-500 hover:text-white hover:bg-gray-800 hover:rounded-xl transition-all duration-200 flex items-center justify-center group relative mt-1"
          title="워크스페이스 추가"
        >
          <Plus size={22} strokeWidth={2.5} />
          
          {/* Tooltip */}
          <div className="absolute left-full ml-3 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-xl border border-gray-700">
            워크스페이스 추가
          </div>
        </button>
      </div>

      {showCreateModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleWorkspaceCreated}
          onJoinRequest={() => {
            // No-op: Join request not implemented yet
          }}
        />
      )}
    </>
  );
}

