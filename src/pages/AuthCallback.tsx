import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔐 Processing auth callback...');
        
        // URL의 해시에서 토큰 추출
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        console.log('📋 Auth type:', type);
        console.log('🔑 Has access token:', !!accessToken);
        console.log('🔑 Has refresh token:', !!refreshToken);

        if (type === 'recovery') {
          // 비밀번호 재설정
          setError('비밀번호 재설정 기능은 아직 구현되지 않았습니다.');
          setProcessing(false);
          return;
        }

        if (!accessToken) {
          // 토큰이 없으면 일반 Supabase 인증 플로우 사용
          const { data, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('❌ Session error:', sessionError);
            setError('인증 처리 중 오류가 발생했습니다.');
            setProcessing(false);
            return;
          }

          if (data.session) {
            console.log('✅ Session found, redirecting...');
            navigate('/', { replace: true });
            return;
          }

          setError('인증 토큰을 찾을 수 없습니다.');
          setProcessing(false);
          return;
        }

        // 토큰으로 세션 설정
        const { data, error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (setSessionError) {
          console.error('❌ Set session error:', setSessionError);
          setError(`인증 실패: ${setSessionError.message}`);
          setProcessing(false);
          return;
        }

        if (data.session) {
          console.log('✅ Authentication successful!');
          console.log('👤 User:', data.session.user.email);
          
          // 이메일 인증 완료 후 홈으로 이동
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 1000);
        } else {
          setError('세션을 생성할 수 없습니다.');
          setProcessing(false);
        }
      } catch (err) {
        console.error('❌ Auth callback error:', err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        setProcessing(false);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
        {processing ? (
          <div className="text-center">
            <div className="mb-4">
              <div className="inline-block w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">인증 처리 중...</h2>
            <p className="text-gray-600">잠시만 기다려주세요.</p>
          </div>
        ) : error ? (
          <div className="text-center">
            <div className="mb-4 text-red-500">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">인증 실패</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              로그인 페이지로 돌아가기
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-4 text-green-500">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">인증 완료!</h2>
            <p className="text-gray-600">곧 메인 페이지로 이동합니다...</p>
          </div>
        )}
      </div>
    </div>
  );
}

