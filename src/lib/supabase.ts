import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

// Supabase 프로젝트 설정
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://akohiqpoxvemfdixtmnv.supabase.co';

// 올바른 JWT 형식의 anon key (eyJ로 시작)
const defaultAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrb2hpcXBveHZlbWZkaXh0bW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1OTQwOTEsImV4cCI6MjA4MzE3MDA5MX0.gQWiwPRon5DOWC0iLnqbPTk5mGhF858w01x96tFmbDE';

// 환경 변수에서 가져오거나 기본값 사용
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultAnonKey;

// JWT 형식 검증 (eyJ로 시작하는지 확인)
if (!supabaseKey.startsWith('eyJ')) {
  console.error('⚠️ Invalid Supabase anon key format! Must be a JWT token starting with "eyJ"');
  console.warn('Using default anon key instead...');
}

console.log('✅ Supabase URL:', supabaseUrl);
console.log('✅ Using anon key:', supabaseKey.substring(0, 20) + '...');

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseKey.startsWith('eyJ') ? supabaseKey : defaultAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Electron 앱의 커스텀 프로토콜 URL로 리다이렉트
      flowType: 'pkce', // PKCE 플로우 사용 (더 안전)
    }
  }
);

