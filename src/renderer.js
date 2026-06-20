// ==================== 页面路由 ====================
function showPage(pageName) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + pageName);
  if (target) target.classList.add('active');
  currentPage = pageName;
}

// ==================== Toast ====================
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast ' + type + ' show';
  setTimeout(() => { toast.classList.remove('show'); }, 2500);
}

// ==================== 应用启动 ====================
let currentPage = '';
let virtualName = '';
let pendingTriggerText = null;  // 当前待回复的触发事件文本

document.addEventListener('DOMContentLoaded', async () => {
  const startPage = await window.api.getStartPage();
  const config = await window.api.getConfig();

  if (config.persona?.name) {
    virtualName = config.persona.name;
  }

  if (startPage === 'main') {
    initMainPage();
    showPage('main');
    window.api.startTimers();

    // 检查打赏
    const donateResult = await window.api.checkDonate();
    if (donateResult.shouldShow) {
      setTimeout(() => showDonateModal(), 800);
    }
  } else if (startPage === 'config') {
    initConfigPage(config);
    showPage('config');
  } else {
    showPage('init');
  }
});

// ==================== 初始化页面 ====================
document.getElementById('btn-next').addEventListener('click', async () => {
  const name = document.getElementById('field-name').value.trim();
  const gender = document.getElementById('field-gender').value.trim();
  const age = document.getElementById('field-age').value.trim();
  const personality = document.getElementById('field-personality').value.trim();

  if (!name || !gender || !age || !personality) {
    showToast('请填写所有字段', 'error');
    return;
  }

  const persona = { name, gender, age, personality };
  await window.api.savePersona(persona);
  virtualName = name;

  const config = await window.api.getConfig();
  initConfigPage(config);
  showPage('config');
});

// 实时检测表单是否填写完整，控制按钮状态
document.querySelectorAll('#page-init input').forEach(input => {
  input.addEventListener('input', () => {
    const all = ['field-name', 'field-gender', 'field-age', 'field-personality'];
    const filled = all.every(id => document.getElementById(id).value.trim() !== '');
    document.getElementById('btn-next').disabled = !filled;
  });
});

// ==================== 配置页面 ====================
function initConfigPage(config) {
  if (config.apiKey) {
    document.getElementById('apikey-input').value = config.apiKey;
  }
  if (config.apiVerified) {
    document.getElementById('api-status').textContent = 'API Key 验证通过';
    document.getElementById('api-status').className = 'api-status valid';
    document.getElementById('btn-verify').disabled = true;
    document.getElementById('btn-verify').textContent = '已验证';
    document.getElementById('btn-init').style.display = 'inline-flex';
  }
}

document.getElementById('btn-verify').addEventListener('click', async () => {
  const apiKey = document.getElementById('apikey-input').value.trim();
  if (!apiKey) {
    showToast('请输入 API Key', 'error');
    return;
  }

  document.getElementById('btn-verify').disabled = true;
  document.getElementById('btn-verify').textContent = '验证中...';

  const result = await window.api.verifyApiKey(apiKey);
  const statusEl = document.getElementById('api-status');

  if (result.valid) {
    statusEl.textContent = 'API Key 验证通过 · 余额可用';
    statusEl.className = 'api-status valid';
    document.getElementById('btn-verify').textContent = '已验证';
    document.getElementById('btn-init').style.display = 'inline-flex';
  } else {
    statusEl.textContent = '验证失败：' + (result.message || '未知错误');
    statusEl.className = 'api-status invalid';
    document.getElementById('btn-verify').disabled = false;
    document.getElementById('btn-verify').textContent = '重新验证';
  }
});

document.getElementById('btn-init').addEventListener('click', async () => {
  document.getElementById('btn-init').disabled = true;
  document.getElementById('btn-init').textContent = '初始化中...';
  document.getElementById('init-progress').style.display = 'block';

  window.api.onStatusUpdate((msg) => {
    document.getElementById('progress-text').textContent = msg;
  });

  const result = await window.api.initVirtual();

  if (result.success) {
    document.getElementById('progress-text').textContent = '初始化完成！即将进入主界面...';
    setTimeout(() => {
      initMainPage();
      showPage('main');
    }, 1200);
  } else {
    document.getElementById('init-progress').style.display = 'none';
    document.getElementById('btn-init').disabled = false;
    document.getElementById('btn-init').textContent = '重试初始化';
    showToast('初始化失败：' + result.message, 'error');
  }
});

// ==================== 主界面 ====================
async function initMainPage() {
  const config = await window.api.getConfig();
  virtualName = config.persona?.name || '虚拟伙伴';

  // 设置虚拟人名称
  document.getElementById('chat-name').textContent = virtualName;

  // 加载虚拟人图片
  const fullImage = await window.api.getVirtualImage();
  const avatarImg = await window.api.getVirtualAvatar();

  const avatarDisplay = document.getElementById('avatar-display');
  if (fullImage) {
    avatarDisplay.innerHTML = `<img src="file://${fullImage}" alt="${virtualName}" />`;
  }

  // 设置头像
  if (avatarImg) {
    document.getElementById('chat-avatar-img').src = `file://${avatarImg}`;
    document.getElementById('chat-avatar-img').style.display = 'block';
    document.getElementById('chat-avatar-text').style.display = 'none';
  } else {
    document.getElementById('chat-avatar-text').textContent = virtualName.charAt(0);
  }

  // 加载历史对话
  const chats = await window.api.getChats();
  const chatBody = document.getElementById('chat-body');
  chatBody.innerHTML = '';

  chats.forEach(msg => {
    if (msg.role === 'assistant') {
      appendMessage('ai', msg.content, msg.time, msg.type === 'trigger');
    } else if (msg.role === 'user') {
      appendMessage('user', msg.content, msg.time);
    }
  });

  scrollToBottom();

  // 监听触发事件
  window.api.onTriggerMessage((data) => {
    appendTriggerEvent(data.type, data.text);
  });
}

function appendMessage(role, content, time, isTrigger = false) {
  const chatBody = document.getElementById('chat-body');
  const row = document.createElement('div');
  row.className = 'msg-row ' + role;

  // 头像
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'msg-avatar-sm';
  if (role === 'ai') {
    const avatarImg = document.createElement('img');
    avatarImg.src = document.getElementById('chat-avatar-img').src || '';
    avatarImg.style.display = document.getElementById('chat-avatar-img').src ? 'block' : 'none';
    avatarDiv.appendChild(avatarImg);
    if (!document.getElementById('chat-avatar-img').src) {
      avatarDiv.textContent = virtualName.charAt(0);
    }
  } else {
    avatarDiv.className += ' user-av';
    avatarDiv.textContent = '我';
  }

  // 气泡
  const wrapper = document.createElement('div');
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = content;
  wrapper.appendChild(bubble);

  if (time) {
    const timeDiv = document.createElement('div');
    timeDiv.className = 'msg-time';
    timeDiv.textContent = new Date(time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    wrapper.appendChild(timeDiv);
  }

  row.appendChild(avatarDiv);
  row.appendChild(wrapper);
  chatBody.appendChild(row);

  // 如果是触发事件，添加事件标签
  if (isTrigger) {
    const tag = document.createElement('div');
    tag.className = 'event-tag';
    tag.textContent = '系统 · 自动触发';
    chatBody.appendChild(tag);
  }

  scrollToBottom();
}

function appendTriggerEvent(type, text) {
  pendingTriggerText = text;

  const chatBody = document.getElementById('chat-body');

  // 事件标签
  const tag = document.createElement('div');
  tag.className = 'event-tag';
  const typeMap = {
    'ten-minute': '系统 · 陪伴满 10 分钟',
    'weather': '定时 · 每日 22:00 天气播报',
    'meal-morning': '定时 · 每日 08:00 早安问候',
    'meal-evening': '定时 · 每日 18:00 晚间问候',
    'noon-rest': '定时 · 每日 12:30 午休提醒'
  };
  tag.textContent = typeMap[type] || '系统 · 自动触发';
  chatBody.appendChild(tag);

  // AI 消息
  appendMessage('ai', text, new Date().toISOString(), true);
}

function scrollToBottom() {
  const chatBody = document.getElementById('chat-body');
  setTimeout(() => {
    chatBody.scrollTop = chatBody.scrollHeight;
  }, 50);
}

// 发送消息
async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  input.disabled = true;
  document.getElementById('btn-send').disabled = true;

  // 显示用户消息
  appendMessage('user', text, new Date().toISOString());

  let result;
  if (pendingTriggerText) {
    // 这是对触发事件的回复
    result = await window.api.triggerReply(pendingTriggerText, text);
    pendingTriggerText = null;
  } else {
    // 普通对话
    result = await window.api.sendMessage(text);
  }

  if (result.success) {
    appendMessage('ai', result.reply, new Date().toISOString());
  } else {
    showToast('回复失败：' + result.message, 'error');
  }

  input.disabled = false;
  document.getElementById('btn-send').disabled = false;
  input.focus();
}

document.getElementById('btn-send').addEventListener('click', sendMessage);
document.getElementById('chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// 触发事件回复
async function replyToTrigger(triggerText, userReply) {
  const result = await window.api.triggerReply(triggerText, userReply);
  if (result.success) {
    appendMessage('ai', result.reply, new Date().toISOString());
  } else {
    showToast('回复失败：' + result.message, 'error');
  }
}

// 全局处理 AI 消息的点击回复（简化版：在消息区底部有一个通用回复框）
// 触发事件消息通过正常输入框回复，由 main.js 的 trigger-reply 处理
// 用户直接在输入框输入即可

// ==================== 打赏弹窗 ====================
function showDonateModal() {
  const overlay = document.getElementById('donate-overlay');
  overlay.classList.add('show');

  // 加载二维码
  window.api.getQrcode().then(qrPath => {
    if (qrPath) {
      document.getElementById('qr-img').src = 'file://' + qrPath;
      document.getElementById('qr-img').style.display = 'block';
      document.getElementById('qr-placeholder').style.display = 'none';
    }
  });
}

document.getElementById('donate-close').addEventListener('click', () => {
  document.getElementById('donate-overlay').classList.remove('show');
  window.api.dismissDonate();
});

document.getElementById('donate-fab').addEventListener('click', () => {
  showDonateModal();
});

// 金额选择
document.querySelectorAll('.amount-tag').forEach(tag => {
  tag.addEventListener('click', function() {
    document.querySelectorAll('.amount-tag').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
  });
});
