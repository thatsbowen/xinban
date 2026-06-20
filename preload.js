const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // 配置
  getConfig: () => ipcRenderer.invoke('get-config'),
  savePersona: (persona) => ipcRenderer.invoke('save-persona', persona),
  getStartPage: () => ipcRenderer.invoke('get-start-page'),

  // API Key
  verifyApiKey: (apiKey) => ipcRenderer.invoke('verify-api-key', apiKey),

  // 虚拟人初始化
  initVirtual: () => ipcRenderer.invoke('init-virtual'),

  // 聊天
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
  triggerReply: (triggerText, userReply) => ipcRenderer.invoke('trigger-reply', triggerText, userReply),
  getChats: () => ipcRenderer.invoke('get-chats'),

  // 打赏
  checkDonate: () => ipcRenderer.invoke('check-donate'),
  dismissDonate: () => ipcRenderer.invoke('dismiss-donate'),
  selectQrcode: () => ipcRenderer.invoke('select-qrcode'),
  getQrcode: () => ipcRenderer.invoke('get-qrcode'),

  // 图片
  getVirtualImage: () => ipcRenderer.invoke('get-virtual-image'),
  getVirtualAvatar: () => ipcRenderer.invoke('get-virtual-avatar'),

  // 事件监听
  onTriggerMessage: (callback) => {
    ipcRenderer.on('trigger-message', (_, data) => callback(data));
  },
  onStatusUpdate: (callback) => {
    ipcRenderer.on('status-update', (_, msg) => callback(msg));
  },

  // 定时任务
  startTimers: () => ipcRenderer.invoke('start-timers')
});
