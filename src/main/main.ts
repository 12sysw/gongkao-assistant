import { app, BrowserWindow, globalShortcut } from 'electron';
import path from 'path';
import fs from 'fs';
import { registerIpcHandlers } from './ipc/index';
import { initDatabase } from './db/migrations';
import { closeDatabase } from './db';
import { initUpdater } from './updater';

// 加载 .env 文件到 process.env（仅开发模式，生产环境通过 CI 注入）
function loadEnvFile() {
  try {
    const envPaths = [
      path.join(__dirname, '..', '..', '..', '.env'),          // dev: project root
      path.join(__dirname, '..', '..', '.env'),                  // dev: alternate
    ];
    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx === -1) continue;
          const key = trimmed.slice(0, eqIdx).trim();
          const value = trimmed.slice(eqIdx + 1).trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
        console.log('[Main] Loaded .env from', envPath);
        return;
      }
    }
  } catch (err) {
    console.warn('[Main] Failed to load .env file:', err);
  }
}

const isDevelopment = process.env.NODE_ENV === 'development';

if (isDevelopment) {
  loadEnvFile();
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // Use the compiled file location itself as the anchor. This is more reliable
  // than rebuilding an absolute path from app.getAppPath() inside packaged apps.
  const preloadPath = path.join(__dirname, 'preload.js');
  const rendererIndexPath = path.join(__dirname, '..', '..', 'renderer', 'index.html');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: '公考小助手',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(rendererIndexPath);
  }

  mainWindow.webContents.on('console-message', (_, __, message) => {
    console.log('[Renderer]', message);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // 初始化数据库（better-sqlite3 建表 + 种子数据）
  initDatabase();
  // 注册 IPC 处理器（better-sqlite3 同步，无需 await）
  registerIpcHandlers();
  createWindow();
  if (mainWindow) initUpdater(mainWindow);

  // 生产环境按 F12 打开开发者工具
  if (app.isPackaged) {
    globalShortcut.register('F12', () => {
      const win = BrowserWindow.getFocusedWindow();
      if (win) {
        win.webContents.toggleDevTools();
      }
    });
  }
});

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  closeDatabase();
  if (app.isPackaged) {
    globalShortcut.unregisterAll();
  }
});
