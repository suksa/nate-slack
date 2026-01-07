import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, Loader2, Check, X, Minus, Square } from 'lucide-react';

export default function ProfileSettings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // React Query로 프로필 조회 (Sidebar와 캐시 공유)
  const { data: profile, isLoading: loading } = useProfile(user?.id);
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [backgroundColor, setBackgroundColor] = useState<string>('');
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 진한색 10개 색상 옵션
  const colorOptions = [
    { name: '진한 파란색', value: '#1e3a8a' },
    { name: '진한 갈색', value: '#7c2d12' },
    { name: '진한 회색', value: '#1e293b' },
    { name: '진한 녹색', value: '#064e3b' },
    { name: '진한 보라색', value: '#581c87' },
    { name: '진한 핑크', value: '#831843' },
    { name: '진한 주황', value: '#78350f' },
    { name: '진한 청록', value: '#0c4a6e' },
    { name: '진한 황금', value: '#422006' },
    { name: '거의 검은색', value: '#1c1917' },
  ];

  // 프로필 데이터가 로드되면 state 업데이트
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setAvatarUrl(profile.avatar_url || '');
      setBackgroundColor(profile.background_color || '');
    }
  }, [profile]);

  // 프로필 사진 업로드
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setMessage(null);

      const files = event.target.files;
      if (!files || files.length === 0) {
        return;
      }

      const file = files[0];
      
      // 파일 크기 체크 (5MB 제한)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: '파일 크기는 5MB 이하여야 합니다.' });
        return;
      }

      // 파일 타입 체크
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: '이미지 파일만 업로드 가능합니다.' });
        return;
      }

      if (!user?.id) {
        setMessage({ type: 'error', text: '사용자 정보를 찾을 수 없습니다.' });
        return;
      }

      // 파일명 생성 (중복 방지)
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // 타임아웃 프로미스 (5초)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('업로드 시간이 초과되었습니다. 다시 시도해주세요.')), 5000);
      });

      // 업로드 프로미스
      const uploadPromise = (async () => {
        // 기존 아바타가 있으면 삭제
        if (avatarUrl) {
          const oldPath = avatarUrl.split('/').pop();
          if (oldPath) {
            await supabase.storage.from('avatars').remove([`avatars/${oldPath}`]);
          }
        }

        // Supabase Storage에 업로드
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Public URL 가져오기
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        // 프로필 업데이트
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id);

        if (updateError) throw updateError;

        return publicUrl;
      })();

      // 타임아웃과 업로드 경쟁
      const publicUrl = await Promise.race([uploadPromise, timeoutPromise]);

      setAvatarUrl(publicUrl);
      setMessage({ type: 'success', text: '프로필 사진이 업데이트되었습니다!' });
      
      // React Query 캐시 무효화 (프로필 새로고침)
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    } catch (error) {
      console.error('업로드 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '사진 업로드에 실패했습니다.';
      setMessage({ type: 'error', text: errorMessage });
      
      // 파일 input 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setUploading(false);
    }
  };

  // 프로필 정보 저장
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setMessage({ type: 'error', text: '사용자 이름을 입력해주세요.' });
      return;
    }

    if (!user?.id) {
      setMessage({ type: 'error', text: '사용자 정보를 찾을 수 없습니다.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          background_color: backgroundColor || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      setMessage({ type: 'success', text: '프로필이 저장되었습니다!' });
      
      // React Query 캐시 무효화 (프로필 새로고침)
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      
      // 3초 후 메시지 자동 제거
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('프로필 저장 오류:', error);
      setMessage({ type: 'error', text: '프로필 저장에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  // 회원 탈퇴 확인 모달 열기
  const handleDeleteAccountClick = () => {
    setShowDeleteConfirm(true);
    setMessage(null);
  };

  // 회원 탈퇴 실행
  const handleDeleteAccount = async () => {
    if (!user?.id) {
      setMessage({ type: 'error', text: '사용자 정보를 찾을 수 없습니다.' });
      setShowDeleteConfirm(false);
      return;
    }

    setDeleting(true);
    setMessage(null);
    setShowDeleteConfirm(false);

    try {
      // 프로필을 소프트 삭제 (deleted_at 타임스탬프 설정, username은 유지)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // React Query 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      
      // 로그아웃
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('회원 탈퇴 오류:', error);
      setMessage({ type: 'error', text: '회원 탈퇴 처리 중 오류가 발생했습니다.' });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* 드래그 가능한 상단 영역 - 항상 고정 */}
      <div className="h-10 bg-white border-b border-gray-200 flex items-center justify-end px-2 select-none shrink-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={() => {
              if (window.electronAPI) {
                window.electronAPI.minimize();
              }
            }}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
            title="최소화"
          >
            <Minus size={16} />
          </button>
          <button
            onClick={() => {
              if (window.electronAPI) {
                window.electronAPI.maximize();
              }
            }}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
            title="최대화"
          >
            <Square size={16} />
          </button>
          <button
            onClick={() => {
              if (window.electronAPI) {
                window.electronAPI.close();
              }
            }}
            className="p-1.5 hover:bg-red-100 rounded text-gray-500 hover:text-red-600 transition-colors"
            title="닫기"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* 헤더 - 상단 고정 */}
      <div className="bg-white border-b border-gray-200 shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">프로필 설정</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">

      {/* 메인 컨텐츠 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* 프로필 사진 섹션 */}
          <div className="p-8 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">프로필 사진</h2>
            <div className="flex items-center gap-6">
              {/* 현재 프로필 사진 */}
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="프로필"
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-gray-100"
                  />
                ) : (
                  <div 
                    className="w-24 h-24 rounded-full flex items-center justify-center ring-4 ring-gray-100"
                    style={{ backgroundColor: backgroundColor || '#3b82f6' }}
                  >
                    <span className="text-3xl font-bold text-white">
                      {username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                
                {/* 업로드 중 오버레이 */}
                {uploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                )}
              </div>

              {/* 업로드 버튼 */}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Camera size={18} />
                  {uploading ? '업로드 중...' : '사진 변경'}
                </button>
                <p className="mt-2 text-sm text-gray-500">
                  JPG, PNG, GIF 지원 (최대 5MB)
                </p>
              </div>
            </div>
          </div>

          {/* 프로필 정보 섹션 */}
          <form onSubmit={handleSaveProfile} className="p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">프로필 정보</h2>
            
            {/* 메시지 */}
            {message && (
              <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message.type === 'success' ? (
                  <Check size={20} className="shrink-0" />
                ) : (
                  <X size={20} className="shrink-0" />
                )}
                <span className="text-sm">{message.text}</span>
              </div>
            )}

            <div className="space-y-6">
              {/* 이메일 (읽기 전용) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이메일
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-lg cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">이메일은 변경할 수 없습니다.</p>
              </div>

              {/* 사용자 이름 */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  사용자 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="예: 홍길동"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <p className="mt-1 text-xs text-gray-500">
                  다른 사용자에게 표시되는 이름입니다.
                </p>
              </div>

              {/* 배경색 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  프로필 배경색
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setBackgroundColor(color.value)}
                      className={`relative w-full aspect-square rounded-lg border-2 transition-all hover:scale-105 ${
                        backgroundColor === color.value
                          ? 'border-blue-600 ring-2 ring-blue-200'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {backgroundColor === color.value && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check size={20} className="text-white drop-shadow-lg" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  프로필 사진이 없을 때 표시되는 배경색입니다. 채팅과 모든 프로필 사진이 보이는 곳에 적용됩니다.
                </p>
              </div>
            </div>

            {/* 저장 버튼 */}
            <div className="mt-8 flex items-center justify-between">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    저장 중...
                  </>
                ) : (
                  '저장하기'
                )}
              </button>
            </div>
          </form>

          {/* 계정 관리 섹션 */}
          <div className="p-8 bg-gray-50 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">계정 관리</h2>
            <div className="space-y-3">
              <button
                onClick={async () => {
                  if (confirm('정말 로그아웃 하시겠습니까?')) {
                    await signOut();
                    navigate('/login');
                  }
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                로그아웃
              </button>
              
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">위험 구역</h3>
                <button
                  onClick={handleDeleteAccountClick}
                  disabled={deleting}
                  className="px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    '회원 탈퇴'
                  )}
                </button>
                <p className="mt-2 text-xs text-gray-500">
                  탈퇴 시 계정을 복구할 수 없습니다. 작성한 메시지는 남아있으며 "탈퇴됨"으로 표시됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* 탈퇴 확인 모달 */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteConfirm(false);
              setMessage(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
            style={{ WebkitAppRegion: 'no-drag', pointerEvents: 'auto' } as React.CSSProperties}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">회원 탈퇴 확인</h3>
            <div className="mb-6">
              <p className="text-sm text-gray-700 mb-3">
                정말로 회원 탈퇴하시겠습니까?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-red-900 mb-2">탈퇴 후:</p>
                <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                  <li>계정에 다시 로그인할 수 없습니다</li>
                  <li>작성한 메시지는 그대로 남아있습니다</li>
                  <li>프로필에 "탈퇴됨"으로 표시됩니다</li>
                </ul>
                <p className="text-sm font-semibold text-red-900 mt-3">
                  이 작업은 되돌릴 수 없습니다.
                </p>
              </div>
            </div>
            {message && message.type === 'error' && (
              <div className="mb-4 p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-sm">
                {message.text}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setMessage(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    처리 중...
                  </>
                ) : (
                  '탈퇴하기'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

