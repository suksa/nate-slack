import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Minus, Square, X } from 'lucide-react';

type AuthMode = 'signin' | 'signup';

export default function Login() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();

  // 이메일 확인 완료 처리
  useEffect(() => {
    const handleEmailVerification = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      
      if (type === 'signup' || type === 'email') {
        setMessage('✅ 이메일 인증이 완료되었습니다! 아래에서 이메일과 비밀번호로 로그인해주세요.');
        setMode('signin'); // 로그인 탭으로 전환
        
        // URL에서 해시 제거
        window.history.replaceState(null, '', window.location.pathname);
      }
      
      // 에러 체크
      const error = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');
      if (error) {
        setMessage(`❌ 인증 오류: ${errorDescription || error}`);
        window.history.replaceState(null, '', window.location.pathname);
      }
    };

    handleEmailVerification();
  }, []);

  // 이미 로그인된 경우 워크스페이스 선택 페이지로 리다이렉트
  useEffect(() => {
    if (!authLoading && session) {
      navigate('/', { replace: true });
    }
  }, [session, authLoading, navigate]);

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (mode === 'signup') {
        // 회원가입 전에 이메일 중복 체크
        const { data: emailExists, error: checkError } = await supabase
          .rpc('check_email_exists', { user_email: email });

        if (checkError) {
          console.error('이메일 중복 체크 오류:', checkError);
          // 체크 오류가 발생해도 회원가입은 진행 (서버에서 최종 검증)
        } else if (emailExists) {
          // 이메일이 이미 존재하는 경우
          throw new Error('이미 가입된 이메일입니다. 로그인 탭에서 로그인해주세요.');
        }

        // 회원가입
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username || email.split('@')[0],
              full_name: username || email.split('@')[0],
            },
          },
        });

        if (signUpError) {
          // 이미 존재하는 이메일인 경우
          if (signUpError.message.includes('already registered') || 
              signUpError.message.includes('User already registered') ||
              signUpError.message.includes('email address is already registered')) {
            // 에러 메시지만 표시 (로그인 탭으로 이동하지 않음)
            throw new Error('이미 가입된 이메일입니다. 로그인 탭에서 로그인해주세요.');
          }
          throw signUpError;
        }

        // signUp이 성공했지만 user가 null이면 이미 존재하는 이메일일 수 있음
        if (!authData.user) {
          throw new Error('이미 가입된 이메일입니다. 로그인 탭에서 로그인해주세요.');
        }

        // 재가입 시 이메일로 프로필 복구 시도 (기존 사용자 ID 사용)
        try {
          const { error: restoreError } = await (supabase.rpc as any)('restore_user_profile_by_email', { 
            user_email: email,
            username_param: username || email.split('@')[0],
            full_name_param: username || email.split('@')[0]
          });
          
          if (restoreError) {
            console.error('프로필 복구 오류:', restoreError);
          }
        } catch (rpcError) {
          console.error('프로필 복구 오류:', rpcError);
        }

        // 프로필 생성/복구 대기 (트리거 실행 대기)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 재가입 시 기존 사용자 ID를 사용 (authData.user.id 사용)
        const actualUserId = authData.user.id;

        // 프로필이 이미 존재하는지 확인 (기존 사용자인지 새 사용자인지 판단)
        const signUpTime = new Date();
        let profile = null;
        let profileError = null;
        
        // 프로필 조회 시도 (최대 3번 재시도)
        for (let i = 0; i < 3; i++) {
          const result = await supabase
            .from('profiles')
            .select('created_at, deleted_at')
            .eq('id', actualUserId)
            .maybeSingle(); // single() 대신 maybeSingle() 사용하여 에러 방지
          
          profile = result.data;
          profileError = result.error;
          
          // 프로필이 조회되고 deleted_at이 NULL이면 성공
          if (profile && !profile.deleted_at) {
            break;
          }
          
          // 프로필이 없거나 deleted_at이 설정되어 있으면 이메일로 다시 복구 시도
          if (!profile || profile.deleted_at) {
            console.log('프로필이 없거나 deleted_at이 설정되어 있음, 이메일로 복구 시도...');
            try {
              const { error: restoreError } = await (supabase.rpc as any)('restore_user_profile_by_email', { 
                user_email: email,
                username_param: username || email.split('@')[0],
                full_name_param: username || email.split('@')[0]
              });
              
              if (restoreError) {
                console.error('프로필 재복구 오류:', restoreError);
              }
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (rpcError) {
              console.error('프로필 재복구 오류:', rpcError);
            }
          }
          
          if (i < 2) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        // 프로필 조회 에러가 발생하면 프로필이 없는 것이므로 계속 진행
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('프로필 조회 오류:', profileError);
        }

        // 프로필이 존재하고, 생성 시간이 회원가입 시도 시간보다 오래 전이면 기존 사용자
        if (profile && profile.created_at) {
          const profileCreatedAt = new Date(profile.created_at);
          const timeDiff = signUpTime.getTime() - profileCreatedAt.getTime();
          
          // 프로필이 5초 이전에 생성되었고 deleted_at이 NULL이면 기존 활성 사용자
          if (timeDiff > 5000 && !profile.deleted_at) {
            throw new Error('이미 가입된 이메일입니다. 로그인 탭에서 로그인해주세요.');
          }
        }

        // 회원가입 성공 시 이메일 자동 확인
        try {
          // RPC 함수를 통해 이메일 자동 확인
          await (supabase.rpc as any)('auto_confirm_user_email', { user_id_param: authData.user.id });
        } catch (rpcError) {
          console.error('이메일 자동 확인 오류:', rpcError);
          // RPC 오류는 무시하고 계속 진행 (트리거가 처리할 수 있음)
        }

        // 세션이 없으면 프로필 생성 완료 대기 후 로그인 시도
        if (!authData.session) {
          // 프로필 생성 및 이메일 확인 완료 대기
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // 로그인 시도
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (signInError) {
            // 이메일 미확인 오류인 경우 재시도
            if (signInError.message.includes('Email not confirmed') || 
                signInError.message.includes('email_not_confirmed')) {
              // 이메일 자동 확인 재시도
              try {
                await (supabase.rpc as any)('auto_confirm_user_email', { user_id_param: authData.user.id });
              } catch (rpcError) {
                console.error('이메일 자동 확인 오류:', rpcError);
              }
              
              // 잠시 대기 후 다시 시도
              await new Promise(resolve => setTimeout(resolve, 1000));
              const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
                email,
                password,
              });
              
              if (retryError) {
                // 재시도 실패 시 로그인 탭으로 이동
                setMode('signin');
                setMessage('✅ 회원가입이 완료되었습니다. 아래에서 로그인해주세요.');
                return;
              }
              
              // 재시도 성공 시 리다이렉트
              setMessage('✅ 회원가입 성공! 이동 중...');
              await new Promise(resolve => setTimeout(resolve, 500));
              navigate('/', { replace: true });
              return;
            }
            
            // 다른 오류는 로그인 탭으로 이동
            setMode('signin');
            setMessage('✅ 회원가입이 완료되었습니다. 아래에서 로그인해주세요.');
            return;
          }
          
          // 로그인 성공 시 리다이렉트
          setMessage('✅ 회원가입 성공! 이동 중...');
          await new Promise(resolve => setTimeout(resolve, 500));
          navigate('/', { replace: true });
          return;
        }

        // 회원가입 성공 (이메일 인증 없이 바로 로그인)
        let finalSession = authData.session;
        
        if (!finalSession) {
          // 세션이 없으면 수동으로 로그인 시도
          // 프로필 생성 및 이메일 확인 완료 대기
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (signInError) {
            // 이메일 미확인 오류인 경우 이메일 확인 후 재시도
            if (signInError.message.includes('Email not confirmed') || signInError.message.includes('email_not_confirmed')) {
              // 이메일 자동 확인 시도
              if (authData.user) {
                try {
                  await (supabase.rpc as any)('auto_confirm_user_email', { user_id_param: authData.user.id });
                } catch (rpcError) {
                  console.error('이메일 자동 확인 오류:', rpcError);
                }
              }
              
              // 잠시 대기 후 다시 시도
              await new Promise(resolve => setTimeout(resolve, 1000));
              const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
                email,
                password,
              });
              
              if (retryError) {
                // 로그인 실패 시 로그인 탭으로 이동
                setMode('signin');
                setMessage('✅ 회원가입이 완료되었습니다. 아래에서 로그인해주세요.');
                return;
              }
              
              finalSession = retryData?.session || null;
            } else {
              // 로그인 실패 시 로그인 탭으로 이동
              setMode('signin');
              setMessage('✅ 회원가입이 완료되었습니다. 아래에서 로그인해주세요.');
              return;
            }
          } else {
            finalSession = signInData?.session || null;
          }
        }
        
        // 세션이 생성되었으면 리다이렉트
        if (finalSession) {
          setMessage('✅ 회원가입 성공! 이동 중...');
          // 세션이 반영될 때까지 잠시 대기 후 리다이렉트
          await new Promise(resolve => setTimeout(resolve, 500));
          navigate('/', { replace: true });
        } else {
          // 세션이 없으면 로그인 탭으로 이동
          setMode('signin');
          setMessage('✅ 회원가입이 완료되었습니다. 아래에서 로그인해주세요.');
        }
      } else {
        // 로그인 시도 전에 탈퇴한 회원인지 확인
        const { data: isDeleted, error: checkError } = await supabase
          .rpc('is_user_deleted', { user_email: email });

        if (checkError) {
          console.error('탈퇴 회원 확인 오류:', checkError);
          // 체크 오류가 발생해도 로그인은 진행 (서버에서 최종 검증)
        } else if (isDeleted === true) {
          throw new Error('탈퇴한 회원입니다. 같은 이메일로 재가입해주세요.');
        }

        // 로그인
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        
        setMessage('✅ 로그인 성공!');
        // AuthContext의 onAuthStateChange가 세션을 업데이트하고
        // useEffect가 자동으로 워크스페이스 선택 페이지로 리다이렉트
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setMessage(`❌ 오류: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* 드래그 가능한 상단 영역 */}
      <div className="h-10 bg-white border-b border-gray-200 flex items-center justify-end px-2 select-none" style={{ WebkitAppRegion: 'drag' as any }}>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' as any }}>
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
      
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md" style={{ WebkitAppRegion: 'no-drag' as any }}>
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            네이트 커뮤니케이션
          </h2>
        </div>

        {/* 탭 전환 */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setMode('signin')}
            className={`flex-1 py-2 text-sm font-medium ${
              mode === 'signin'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            로그인
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 text-sm font-medium ${
              mode === 'signup'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            회원가입
          </button>
        </div>

        {message && (
          <div
            className={`p-4 text-sm rounded whitespace-pre-line ${
              message.includes('❌') || message.includes('⚠️')
                ? 'bg-red-100 text-red-700 border border-red-300'
                : message.includes('📧')
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-green-100 text-green-700 border border-green-300'
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handlePasswordAuth} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                사용자 이름
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="홍길동"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              이메일
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
              minLength={6}
            />
            {mode === 'signup' && (
              <p className="mt-1 text-xs text-gray-500">최소 6자 이상</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? '처리 중...'
              : mode === 'signin'
              ? '로그인'
              : '회원가입'}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}
