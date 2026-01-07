// =====================================================
// 브라우저 콘솔에서 직접 실행 가능한 테스트 스크립트
// =====================================================
// F12를 눌러 개발자 도구를 열고, Console 탭에 붙여넣기

console.log('🧪 NATE SLACK 로그인 테스트 시작');

// 1. 현재 세션 확인
async function checkSession() {
  console.log('\n📊 1. 현재 세션 확인 중...');
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('❌ 세션 확인 오류:', error);
    return null;
  }
  if (data.session) {
    console.log('✅ 로그인됨:', data.session.user.email);
    return data.session;
  }
  console.log('⚠️ 로그인되지 않음');
  return null;
}

// 2. 로그아웃
async function logout() {
  console.log('\n🚪 2. 로그아웃 중...');
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('❌ 로그아웃 오류:', error);
    return false;
  }
  console.log('✅ 로그아웃 완료');
  localStorage.clear();
  sessionStorage.clear();
  return true;
}

// 3. 로그인 테스트
async function testLogin(email = 'suksa_@naver.com', password = '123123') {
  console.log(`\n🔐 3. 로그인 테스트 (${email})`);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    console.error('❌ 로그인 실패:', error);
    return null;
  }
  
  console.log('✅ 로그인 성공!');
  console.log('   User ID:', data.user.id);
  console.log('   Email:', data.user.email);
  return data;
}

// 4. 프로필 확인
async function checkProfile() {
  console.log('\n👤 4. 프로필 확인 중...');
  
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    console.error('❌ 사용자 정보 없음');
    return null;
  }
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userData.user.id)
    .single();
  
  if (error) {
    console.error('❌ 프로필 조회 오류:', error);
    return null;
  }
  
  console.log('✅ 프로필 발견:');
  console.log('   Username:', profile.username);
  console.log('   Full Name:', profile.full_name);
  return profile;
}

// 5. 워크스페이스 확인
async function checkWorkspaces() {
  console.log('\n📂 5. 워크스페이스 확인 중...');
  
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    console.error('❌ 사용자 정보 없음');
    return [];
  }
  
  const { data: members, error } = await supabase
    .from('members')
    .select('workspace_id, workspaces(*)')
    .eq('user_id', userData.user.id);
  
  if (error) {
    console.error('❌ 워크스페이스 조회 오류:', error);
    return [];
  }
  
  const workspaces = members.map(m => m.workspaces);
  console.log(`✅ 워크스페이스 ${workspaces.length}개 발견:`);
  workspaces.forEach((ws, i) => {
    console.log(`   ${i + 1}. ${ws.name} (${ws.slug})`);
  });
  
  return workspaces;
}

// 6. 전체 테스트 실행
async function runFullTest() {
  console.log('🚀 전체 로그인 테스트 실행\n');
  console.log('='.repeat(50));
  
  try {
    // 1. 현재 세션 확인
    await checkSession();
    
    // 2. 로그아웃 (이미 로그인된 경우)
    await logout();
    
    // 3. 로그인 테스트
    const loginResult = await testLogin();
    if (!loginResult) {
      console.log('\n❌ 테스트 실패: 로그인 불가');
      return;
    }
    
    // 4. 프로필 확인
    const profile = await checkProfile();
    if (!profile) {
      console.log('\n❌ 테스트 실패: 프로필 없음');
      return;
    }
    
    // 5. 워크스페이스 확인
    const workspaces = await checkWorkspaces();
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 모든 테스트 통과!');
    console.log('✅ 로그인 성공');
    console.log('✅ 프로필 확인');
    console.log(`✅ 워크스페이스 ${workspaces.length}개`);
    console.log('\n💡 페이지를 새로고침하면 워크스페이스 선택 화면으로 이동합니다.');
    
    // 페이지 새로고침 안내
    setTimeout(() => {
      if (confirm('페이지를 새로고침하여 워크스페이스 화면으로 이동하시겠습니까?')) {
        location.reload();
      }
    }, 1000);
    
  } catch (error) {
    console.error('\n❌ 테스트 중 오류 발생:', error);
  }
}

// 자동 실행
console.log('\n📋 사용 가능한 명령어:');
console.log('  - checkSession()     : 현재 세션 확인');
console.log('  - logout()           : 로그아웃');
console.log('  - testLogin()        : 로그인 테스트');
console.log('  - checkProfile()     : 프로필 확인');
console.log('  - checkWorkspaces()  : 워크스페이스 확인');
console.log('  - runFullTest()      : 전체 테스트 실행\n');

console.log('💡 전체 테스트를 실행하려면: runFullTest()');

