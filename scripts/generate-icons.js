// 从 SVG 生成多尺寸 PNG 图标 + ICO 文件
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ASSETS = path.join(__dirname, '..', 'assets');
const svgPath = path.join(ASSETS, 'icon.svg');

async function generate() {
  console.log('读取 SVG...');
  const svgBuffer = fs.readFileSync(svgPath);

  // 生成 256x256 PNG（主图标）
  console.log('生成 256x256 PNG...');
  await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toFile(path.join(ASSETS, 'icon.png'));

  // 生成 512x512 PNG
  console.log('生成 512x512 PNG...');
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(ASSETS, 'icon_512.png'));

  // 生成 1024x1024 PNG（macOS 备选）
  console.log('生成 1024x1024 PNG...');
  await sharp(svgBuffer)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS, 'icon_1024.png'));

  // 生成 ICO（从 256x256 PNG 转换）
  console.log('生成 ICO...');
  const png256 = path.join(ASSETS, 'icon.png');
  try {
    const pngToIco = require('png-to-ico');
    const icoBuf = await pngToIco([png256]);
    fs.writeFileSync(path.join(ASSETS, 'icon.ico'), icoBuf);
    console.log('  ICO 生成成功');
  } catch (e) {
    console.log('  png-to-ico 失败，使用备用方案: ' + e.message);
    // 备用：复制 PNG 为 ICO 扩展名（electron-builder 在 Windows 上也能用 PNG）
    fs.copyFileSync(png256, path.join(ASSETS, 'icon.ico'));
  }

  console.log('图标生成完成！');
  console.log('  assets/icon.png    (256x256)');
  console.log('  assets/icon_512.png (512x512)');
  console.log('  assets/icon_1024.png (1024x1024)');
  console.log('  assets/icon.ico    (Windows)');
}

generate().catch(err => {
  console.error('图标生成失败:', err);
  process.exit(1);
});
