import { app, BrowserWindow, globalShortcut } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipc/index';
import { initDatabase } from './db/migrations';
import { closeDatabase } from './db';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  let preloadPath: string;
  if (app.isPackaged) {
    preloadPath = path.join(app.getAppPath(), 'dist', 'main', 'main', 'preload.js');
  } else {
    preloadPath = path.join(__dirname, 'preload.js');
  }

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
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'renderer', 'index.html'));
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
