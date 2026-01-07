import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, Minus, Square, X, Copy } from 'lucide-react';
import SearchModal from './SearchModal';
import { useParams } from 'react-router-dom';

// 타입은 src/types/electron.d.ts에서 정의됨

export default function CustomTitleBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // 브라우저 히스토리 상태 확인
  useEffect(() => {
    const checkHistory = () => {
      // React Router는 브라우저 히스토리를 사용하므로
      // 실제로는 브라우저 히스토리 API를 직접 사용할 수 없습니다.
      // 대신 location.key를 사용하거나 간단히 항상 활성화할 수 있습니다.
      setCanGoBack(window.history.length > 1);
      setCanGoForward(false); // React Router는 forward를 직접 지원하지 않음
    };

    checkHistory();
    window.addEventListener('popstate', checkHistory);
    return () => window.removeEventListener('popstate', checkHistory);
  }, [location]);

  // 윈도우 최대화 상태 확인
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.isMaximized().then(setIsMaximized);
      window.electronAPI.onMaximize(setIsMaximized);
    }
  }, []);

  const handleBack = () => {
    navigate(-1);
  };

  const handleForward = () => {
    navigate(1);
  };

  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimize();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.maximize();
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.close();
    }
  };

  // Ctrl+K 단축키 지원
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

  return (
    <>
      <div className="h-10 bg-gray-900 flex items-center justify-between px-2 select-none drag-region" style={{ WebkitAppRegion: 'drag' as any }}>
        {/* 왼쪽: 네비게이션 버튼 */}
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' as any }}>
          <button
            onClick={handleBack}
            disabled={!canGoBack}
            className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="뒤로가기"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleForward}
            disabled={!canGoForward}
            className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="앞으로가기"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* 중앙: 검색 바 */}
        <div className="flex-1 max-w-2xl mx-4" style={{ WebkitAppRegion: 'no-drag' as any }}>
          <button
            onClick={() => setShowSearch(true)}
            className="w-full flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-md text-left text-sm text-gray-300 transition-colors"
          >
            <Search size={14} className="text-gray-400" />
            <span className="flex-1">검색</span>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-semibold text-gray-400 bg-gray-900 border border-gray-700 rounded">
              <span className="text-[10px]">⌘</span>K
            </kbd>
          </button>
        </div>

        {/* 오른쪽: 윈도우 제어 버튼 */}
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' as any }}>
          <button
            onClick={handleMinimize}
            className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            title="최소화"
          >
            <Minus size={16} />
          </button>
          <button
            onClick={handleMaximize}
            className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            title={isMaximized ? "복원" : "최대화"}
          >
            {isMaximized ? <Copy size={16} /> : <Square size={16} />}
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-red-600 rounded text-gray-400 hover:text-white transition-colors"
            title="닫기"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {showSearch && workspaceId && (
        <SearchModal onClose={() => setShowSearch(false)} />
      )}
    </>
  );
}

