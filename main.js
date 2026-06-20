const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');

const DATA_DIR = path.join(app.getPath('userData'), 'VirtualCompanion');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const CHAT_FILE = path.join(DATA_DIR, 'chats.json');
const AVATAR_DIR = path.join(DATA_DIR, 'avatars');

const MINIMAX_BASE = 'https://api.minimaxi.com/v1';

let mainWindow = null;
let config = null;
let chatHistory = [];
let timers = { intervals: {}, marks: {} };

// ==================== 数据管理 ====================
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function ensureQrcode() {
  // 自动将内置二维码复制到数据目录
  const destPath = path.join(AVATAR_DIR, 'qrcode.jpg');
  if (!fs.existsSync(destPath)) {
    const srcPath = path.join(__dirname, 'assets', 'qrcode.jpg');
    if (fs.existsSync(srcPath)) {
      ensureDir(AVATAR_DIR);
      fs.copyFileSync(srcPath, destPath);
    }
  }
  return destPath;
}

function loadConfig() {
  ensureDir(DATA_DIR);
  if (fs.existsSync(CONFIG_FILE)) {
    try { config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')); }
    catch { config = getDefaultConfig(); }
  } else {
    config = getDefaultConfig();
  }
  return config;
}

function getDefaultConfig() {
  return {
    initialized: false,
    persona: { name: '', gender: '', age: '', personality: '' },
    apiKey: '',
    apiVerified: false,
    virtualImagePath: '',
    virtualAvatarPath: '',
    openCount: 0,
    donateShown: false
  };
}

function saveConfig() {
  ensureDir(DATA_DIR);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

function loadChats() {
  if (fs.existsSync(CHAT_FILE)) {
    try { chatHistory = JSON.parse(fs.readFileSync(CHAT_FILE, 'utf-8')); }
    catch { chatHistory = []; }
  }
}

function saveChats() {
  fs.writeFileSync(CHAT_FILE, JSON.stringify(chatHistory, null, 2), 'utf-8');
}

function getRecentUserMessages(count = 10) {
  const userMsgs = chatHistory.filter(m => m.role === 'user');
  return userMsgs.slice(-count).map(m => m.content);
}

// ==================== MiniMax API ====================
async function callMiniMaxChat(messages, systemPrompt = null) {
  const apiKey = config.apiKey;
  if (!apiKey) throw new Error('API Key 未配置');

  const allMessages = [];
  if (systemPrompt) {
    allMessages.push({ role: 'system', content: systemPrompt });
  }
  allMessages.push(...messages);

  const response = await fetch(`${MINIMAX_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'MiniMax-M3',
      messages: allMessages,
      temperature: 0.7,
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API 请求失败 (${response.status})`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function verifyApiKey(apiKey) {
  try {
    const response = await fetch(`${MINIMAX_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'MiniMax-M3',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5
      })
    });
    if (response.ok) return { valid: true };
    const err = await response.json().catch(() => ({}));
    return { valid: false, message: err.error?.message || `状态码 ${response.status}` };
  } catch (e) {
    return { valid: false, message: e.message };
  }
}

async function generateVirtualImage(persona) {
  const apiKey = config.apiKey;
  if (!apiKey) throw new Error('API Key 未配置');

  const prompt = [
    `生成一个虚拟人物形象：${persona.gender}，${persona.age}岁，性格${persona.personality}`,
    '高清图片', '全身照', '休闲装', '明星脸', '竖构图',
    '柔和光线', '温暖背景', '半身到全身可见', '适合做头像'
  ].join('，');

  const response = await fetch(`${MINIMAX_BASE}/image/generation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'image-01',
      prompt: prompt,
      n: 1,
      size: '1024x1536'
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `图片生成失败 (${response.status})`);
  }

  const data = await response.json();
  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) throw new Error('未获取到图片 URL');

  // 下载原图
  const imgResponse = await fetch(imageUrl);
  const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());

  ensureDir(AVATAR_DIR);
  const fullPath = path.join(AVATAR_DIR, `avatar_full_${Date.now()}.png`);
  fs.writeFileSync(fullPath, imgBuffer);

  // 裁剪 200x200 头像（中心裁剪）
  const avatarPath = path.join(AVATAR_DIR, `avatar_200_${Date.now()}.png`);
  const metadata = await sharp(imgBuffer).metadata();
  const size = Math.min(metadata.width, metadata.height);
  await sharp(imgBuffer)
    .extract({
      left: Math.floor((metadata.width - size) / 2),
      top: 0,
      width: size,
      height: size
    })
    .resize(200, 200)
    .png()
    .toFile(avatarPath);

  return { fullPath, avatarPath };
}

// ==================== 定时任务 ====================
function buildSystemPrompt() {
  const p = config.persona;
  return [
    `你是一个虚拟情感陪护角色。`,
    `你的名字是「${p.name}」，性别${p.gender}，年龄${p.age}岁，性格是${p.personality}。`,
    `请始终以这个角色身份与用户对话，保持性格一致性。`,
    `你的回复应该自然、温暖、有情感，像一个真实的朋友。`,
    `不要透露你是AI或程序。`,
    `用户的名字是用户自己，不要用固定称呼。`
  ].join('\n');
}

function startTimers() {
  stopTimers();

  // 每10分钟轮询
  timers.intervals.tenMin = setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('trigger-message', {
        text: '哇，我们相处一会了，是需要休息一下吗？',
        type: 'ten-minute'
      });
    }
  }, 10 * 60 * 1000);

  // 每分钟检查定时播报
  timers.intervals.cron = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const today = now.toDateString();

    if (!timers.marks[today]) timers.marks[today] = {};

    // 22:00 天气
    if (h === 22 && m === 0 && !timers.marks[today].weather) {
      timers.marks[today].weather = true;
      mainWindow.webContents.send('trigger-message', {
        text: '你想知道明天天气如何吗？',
        type: 'weather'
      });
    }
    // 8:00 早餐
    if (h === 8 && m === 0 && !timers.marks[today].breakfast) {
      timers.marks[today].breakfast = true;
      mainWindow.webContents.send('trigger-message', {
        text: '你吃过了吗？吃的可是什么好吃的呀？',
        type: 'meal-morning'
      });
    }
    // 18:00 晚餐
    if (h === 18 && m === 0 && !timers.marks[today].dinner) {
      timers.marks[today].dinner = true;
      mainWindow.webContents.send('trigger-message', {
        text: '你吃过了吗？吃的可是什么好吃的呀？',
        type: 'meal-evening'
      });
    }
    // 12:30 午休
    if (h === 12 && m === 30 && !timers.marks[today].noon) {
      timers.marks[today].noon = true;
      mainWindow.webContents.send('trigger-message', {
        text: 'emmm...这个点是不是需要休息下呢？',
        type: 'noon-rest'
      });
    }
  }, 60 * 1000);
}

function stopTimers() {
  if (timers.intervals.tenMin) {
    clearInterval(timers.intervals.tenMin);
    timers.intervals.tenMin = null;
  }
  if (timers.intervals.cron) {
    clearInterval(timers.intervals.cron);
    timers.intervals.cron = null;
  }
}

// ==================== IPC 处理 ====================
function setupIPC() {
  // 获取配置
  ipcMain.handle('get-config', () => config);

  // 保存初始化信息
  ipcMain.handle('save-persona', (_, persona) => {
    config.persona = persona;
    config.initialized = true;
    saveConfig();
    return { success: true };
  });

  // 验证 API Key
  ipcMain.handle('verify-api-key', async (_, apiKey) => {
    const result = await verifyApiKey(apiKey);
    if (result.valid) {
      config.apiKey = apiKey;
      config.apiVerified = true;
      saveConfig();
    }
    return result;
  });

  // 初始化虚拟人（生成图片 + 建立角色记忆）
  ipcMain.handle('init-virtual', async () => {
    try {
      // 生成虚拟人图片
      mainWindow.webContents.send('status-update', '正在生成虚拟人形象...');
      const { fullPath, avatarPath } = await generateVirtualImage(config.persona);
      config.virtualImagePath = fullPath;
      config.virtualAvatarPath = avatarPath;

      // 建立初始角色记忆
      mainWindow.webContents.send('status-update', '正在初始化角色记忆...');
      const systemPrompt = buildSystemPrompt();
      const initMsg = await callMiniMaxChat(
        [{ role: 'user', content: `你好，请用你的角色身份（${config.persona.name}）做一个简短的自我介绍。` }],
        systemPrompt
      );

      config.initialized = true;
      saveConfig();

      // 保存初始对话
      chatHistory = [
        { role: 'assistant', content: initMsg, time: new Date().toISOString(), type: 'init' }
      ];
      saveChats();

      return { success: true, initMsg };
    } catch (e) {
      return { success: false, message: e.message };
    }
  });

  // 发送聊天消息
  ipcMain.handle('send-message', async (_, userMessage) => {
    try {
      // 保存用户消息
      chatHistory.push({
        role: 'user',
        content: userMessage,
        time: new Date().toISOString()
      });

      // 构建消息列表（系统提示 + 最近对话）
      const systemPrompt = buildSystemPrompt();
      const recentMessages = chatHistory.slice(-20).map(m => ({
        role: m.role,
        content: m.content
      }));

      const reply = await callMiniMaxChat(recentMessages, systemPrompt);

      // 保存 AI 回复
      chatHistory.push({
        role: 'assistant',
        content: reply,
        time: new Date().toISOString()
      });
      saveChats();

      return { success: true, reply };
    } catch (e) {
      return { success: false, message: e.message };
    }
  });

  // 触发事件对话（虚拟人主动发起，用户回复后调用）
  ipcMain.handle('trigger-reply', async (_, triggerText, userReply) => {
    try {
      const systemPrompt = buildSystemPrompt();
      const messages = [
        { role: 'assistant', content: triggerText },
        { role: 'user', content: userReply },
      ];

      chatHistory.push(
        { role: 'assistant', content: triggerText, time: new Date().toISOString(), type: 'trigger' },
        { role: 'user', content: userReply, time: new Date().toISOString() }
      );

      const reply = await callMiniMaxChat(messages, systemPrompt);
      chatHistory.push({ role: 'assistant', content: reply, time: new Date().toISOString() });
      saveChats();

      return { success: true, reply };
    } catch (e) {
      return { success: false, message: e.message };
    }
  });

  // 获取聊天历史
  ipcMain.handle('get-chats', () => chatHistory);

  // 打开计数 & 打赏检查
  ipcMain.handle('check-donate', () => {
    config.openCount = (config.openCount || 0) + 1;
    saveConfig();
    const shouldShow = config.openCount >= 3 && !config.donateShown;
    return { shouldShow, openCount: config.openCount };
  });

  ipcMain.handle('dismiss-donate', () => {
    config.donateShown = true;
    saveConfig();
  });

  // 选择二维码图片
  ipcMain.handle('select-qrcode', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择收款二维码图片',
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg'] }],
      properties: ['openFile']
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const srcPath = result.filePaths[0];
      const destPath = path.join(AVATAR_DIR, 'qrcode.png');
      ensureDir(AVATAR_DIR);
      fs.copyFileSync(srcPath, destPath);
      config.qrcodePath = destPath;
      saveConfig();
      return destPath;
    }
    return null;
  });

  // 获取虚拟人图片路径
  ipcMain.handle('get-virtual-image', () => config.virtualImagePath || '');
  ipcMain.handle('get-virtual-avatar', () => config.virtualAvatarPath || '');
  ipcMain.handle('get-qrcode', () => {
    if (config.qrcodePath && fs.existsSync(config.qrcodePath)) return config.qrcodePath;
    const defaultQr = ensureQrcode();
    return fs.existsSync(defaultQr) ? defaultQr : '';
  });

  // 获取启动页面
  ipcMain.handle('get-start-page', () => {
    if (config.initialized && config.apiVerified) {
      return 'main';
    } else if (config.initialized && !config.apiVerified) {
      return 'config';
    }
    return 'init';
  });

  // 启动定时任务
  ipcMain.handle('start-timers', () => {
    startTimers();
    return true;
  });
}

// ==================== 窗口创建 ====================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 800,
    minHeight: 600,
    title: '心伴',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false,
    frame: true,
    backgroundColor: '#0f1a2e'
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    stopTimers();
  });
}

// ==================== 生命周期 ====================
app.whenReady().then(() => {
  loadConfig();
  loadChats();
  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopTimers();
  if (process.platform !== 'darwin') app.quit();
});
