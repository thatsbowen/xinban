# 心伴 · 虚拟人情感陪护桌面应用

## 功能概述

一款基于 Electron 的跨平台桌面应用，集成 MiniMax 大模型，提供虚拟人情感陪护服务。

### 核心流程

1. **初始化** — 收集姓名/性别/年龄/性格 4 要素（不可跳过）
2. **模型配置** — 引导注册 MiniMax 平台并绑定 API Key，自动生成虚拟人形象
3. **主界面** — 左栏虚拟人竖构图 + 右栏对话窗口
4. **定时触发** — 10分钟轮询 / 8:00/12:30/18:00/22:00 自动问候
5. **打赏** — 第3次打开应用弹出，之后保留按钮入口

---

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
cd virtual-companion
npm install
```

### 开发运行

```bash
npm start
```

### 构建安装包

**Windows：**
```bash
npm run build:win
```
输出：`dist/心伴-Setup-1.0.0.exe`

**macOS：**
```bash
npm run build:mac
```
输出：`dist/心伴-1.0.0.dmg`

**全平台：**
```bash
npm run build:all
```

---

## 项目结构

```
virtual-companion/
├── package.json          # 项目配置 & 构建脚本
├── main.js               # Electron 主进程（窗口管理、API、定时任务、本地存储）
├── preload.js            # 预加载脚本（安全 IPC 桥接）
├── assets/
│   └── icon.svg          # 应用图标源文件
├── src/
│   ├── index.html        # 入口页面（SPA 容器）
│   ├── styles.css        # 全局样式
│   └── renderer.js       # 渲染进程（页面路由、交互逻辑）
└── build/
```

---

## 数据存储

所有数据保存在用户目录的 `VirtualCompanion` 文件夹中：

| 文件 | 说明 |
|------|------|
| `config.json` | 4要素、API Key、应用状态 |
| `chats.json` | 完整对话历史（JSON 数组） |
| `avatars/` | 虚拟人图片、头像、收款二维码 |

---

## 使用说明

### 1. 获取 MiniMax API Key

1. 访问 [platform.minimaxi.com](https://platform.minimaxi.com) 注册
2. 在账户中心充值 10 元体验金
3. 在「API Keys」页面创建 Key
4. 将 Key 粘贴到应用配置页面完成绑定

### 2. 导入收款二维码

在应用内首次打赏时可选择本地二维码图片文件，之后自动加载。

### 3. 对话记录

每次打开应用时，系统将 4 要素 + 最近 10 条对话自动发送给 MiniMax-M3，确保角色一致性。

---

## 图标说明

应用使用 `assets/icon.svg` 作为图标源文件。

如需自定义图标，替换 `icon.svg` 并在构建前运行：
```bash
npm run generate-icons
```
（此命令会将 SVG 转换为各平台所需格式）
