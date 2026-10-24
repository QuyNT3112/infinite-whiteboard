const fs = require('fs');
const path = require('path');
const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');

async function pushToGitHub() {
  const dir = path.resolve(__dirname);
  const token = process.argv[2] || process.env.GITHUB_TOKEN;

  if (!token) {
    console.log('\n❌ Thiếu GitHub Personal Access Token (PAT).');
    console.log('👉 Hướng dẫn:');
    console.log('   Cách 1: node push-to-github.cjs <TOKEN_CỦA_BẠN>');
    console.log('   Cách 2: $env:GITHUB_TOKEN="<TOKEN>"; npm run push');
    console.log('\n🔗 Để tạo token (chỉ mất 30 giây):');
    console.log('   Truy cập: https://github.com/settings/tokens/new');
    console.log('   Tích chọn quyền: [x] repo (Full control of private repositories)');
    console.log('   Sau đó copy token và chạy lệnh trên.\n');
    process.exit(1);
  }

  console.log('🚀 Đang đẩy mã nguồn lên https://github.com/QuyNT3112/infinite-whiteboard.git (nhánh main)...');

  try {
    await git.push({
      fs,
      http,
      dir,
      remote: 'origin',
      ref: 'main',
      onAuth: () => ({ username: token }),
      onProgress: (p) => {
        if (p.phase) {
          process.stdout.write(`   ${p.phase}: ${p.loaded}/${p.total || '?'}\r`);
        }
      }
    });

    console.log('\n✅ ĐÃ ĐẨY LÊN GITHUB THÀNH CÔNG RỰC RỠ!');
    console.log('🔗 Xem kho mã nguồn tại: https://github.com/QuyNT3112/infinite-whiteboard');
  } catch (error) {
    console.error('\n❌ Không thể đẩy lên GitHub:', error.message);
    if (error.data) {
      console.error('Chi tiết lỗi:', error.data);
    }
    process.exit(1);
  }
}

pushToGitHub();
