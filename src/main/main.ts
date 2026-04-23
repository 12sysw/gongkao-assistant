import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipc';
import { closeDatabase } from './database';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // 获取正确的 preload 路径（兼容 asar 打包）
  let preloadPath: string;
  if (app.isPackaged) {
    // 打包后，app.getAppPath() 返回 asar 内的根路径
    preloadPath = path.join(app.getAppPath(), 'dist', 'main', 'main', 'preload.js');
  } else {
    // 开发模式
    preloadPath = path.join(__dirname, 'preload.js');
  }

  console.log('[Main] preload path:', preloadPath);
  console.log('[Main] __dirname:', __dirname);
  console.log('[Main] isPackaged:', app.isPackaged);

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

  // 开发模式加载 dev server，生产模式加载打包文件
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'renderer', 'index.html'));
    // 打开开发者工具方便调试
    mainWindow.webContents.openDevTools();
  }

  // 监听控制台消息
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('[Renderer]', message);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
