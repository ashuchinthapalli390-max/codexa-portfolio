import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import QRCode from 'qrcode';

const PORT = 8080;
const APK_PATH = path.resolve('G:/AntiGravity IDE/codexa app/build/app/outputs/flutter-apk/app-release.apk');

// Get local IPv4 address
function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal && (net.address.startsWith('192.168.') || net.address.startsWith('10.') || net.address.startsWith('172.'))) {
        return net.address;
      }
    }
  }
  return '192.168.1.7';
}

const localIp = getLocalIp();
const downloadUrl = `http://${localIp}:${PORT}/download`;

if (!fs.existsSync(APK_PATH)) {
  console.error(`APK not found at ${APK_PATH}`);
  process.exit(1);
}

const stat = fs.statSync(APK_PATH);
const fileSizeMB = (stat.size / (1024 * 1024)).toFixed(1);

const server = http.createServer(async (req, res) => {
  const url = req.url || '/';

  if (url === '/download' || url === '/CodeXa.apk') {
    console.log(`[${new Date().toLocaleTimeString()}] Download started from ${req.socket.remoteAddress}`);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="CodeXa-Production.apk"',
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
    });

    const stream = fs.createReadStream(APK_PATH);
    stream.pipe(res);
    return;
  }

  // Generate QR code data URL
  const qrDataUrl = await QRCode.toDataURL(downloadUrl, { margin: 1, width: 260 });

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Download CodeXa Mobile APK</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #08080A;
      color: #F3F4F6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }
    .card {
      background: #111217;
      border: 1px solid #232530;
      border-radius: 24px;
      padding: 36px 28px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    }
    .badge {
      display: inline-block;
      background: rgba(225, 29, 72, 0.15);
      color: #FB7185;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 6px 14px;
      border-radius: 999px;
      margin-bottom: 20px;
      border: 1px solid rgba(225, 29, 72, 0.3);
    }
    h1 {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
      color: #FFFFFF;
    }
    p.sub {
      font-size: 14px;
      color: #9CA3AF;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    .meta-box {
      background: #181922;
      border-radius: 14px;
      padding: 14px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-around;
      font-size: 13px;
    }
    .meta-item strong { display: block; color: #FFF; font-size: 15px; }
    .meta-item span { color: #6B7280; font-size: 11px; text-transform: uppercase; }
    .btn {
      display: block;
      background: linear-gradient(135deg, #E11D48 0%, #BE123C 100%);
      color: #FFFFFF;
      font-size: 16px;
      font-weight: 700;
      text-decoration: none;
      padding: 16px 24px;
      border-radius: 14px;
      box-shadow: 0 8px 24px rgba(225, 29, 72, 0.35);
      transition: all 0.2s;
    }
    .btn:active { transform: scale(0.98); }
    .note {
      font-size: 12px;
      color: #6B7280;
      margin-top: 18px;
      line-height: 1.4;
    }
    .qr-wrap {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #232530;
    }
    .qr-wrap img {
      border-radius: 12px;
      background: #FFF;
      padding: 8px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Production Build</div>
    <h1>CodeXa Mobile</h1>
    <p class="sub">Native Mobile Client & Workspace for CodeXa Agency</p>

    <div class="meta-box">
      <div class="meta-item">
        <strong>${fileSizeMB} MB</strong>
        <span>File Size</span>
      </div>
      <div class="meta-item">
        <strong>1.0.0</strong>
        <span>Version</span>
      </div>
      <div class="meta-item">
        <strong>Android 8+</strong>
        <span>Platform</span>
      </div>
    </div>

    <a href="/download" class="btn">⬇️ Download CodeXa APK</a>
    <p class="note">After downloading, tap the notification or file to install. If prompted, select "Allow from this source".</p>

    <div class="qr-wrap">
      <p style="font-size:12px; color:#9CA3AF; margin-bottom:12px;">Or scan from phone camera:</p>
      <img src="${qrDataUrl}" alt="Scan QR Code to Download" width="180" height="180" />
    </div>
  </div>
</body>
</html>`);
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n======================================================`);
  console.log(`  CODEXA MOBILE DOWNLOAD SERVER RUNNING`);
  console.log(`======================================================`);
  console.log(`  Direct Download URL on Mobile:`);
  console.log(`  👉 http://${localIp}:${PORT}/download`);
  console.log(`\n  Download Page on Mobile:`);
  console.log(`  👉 http://${localIp}:${PORT}`);
  console.log(`======================================================\n`);

  try {
    const termQr = await QRCode.toString(downloadUrl, { type: 'terminal', small: true });
    console.log(termQr);
  } catch {}
});
