// SVG를 PNG로 변환하는 스크립트
// sharp 라이브러리가 필요합니다: npm install --save-dev sharp

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../assets/supabase-logo.svg');
const pngPath = path.join(__dirname, '../assets/supabase-logo.png');

async function generateIcon() {
  try {
    // SVG를 512x512 PNG로 변환
    await sharp(svgPath)
      .resize(512, 512)
      .png()
      .toFile(pngPath);
    
    console.log('✅ 아이콘 생성 완료:', pngPath);
  } catch (error) {
    console.error('❌ 아이콘 생성 실패:', error);
    process.exit(1);
  }
}

generateIcon();

