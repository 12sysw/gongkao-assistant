import { autoUpdater } from 'electron-updater';
import { BrowserWindow, app } from 'electron';
import { IPC } from '../shared/ipc';
import type { UpdateCheckResult } from '../shared/ipc';

let mainWindow: BrowserWindow | null = null;
let updateTimer: ReturnType<typeof setInterval> | null = null;
const CHECK_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours

export function initUpdater(window: BrowserWindow): void {
  mainWindow = window;

  if (!app.isPackaged) return;

  autoUpdater.autoDownload = false;
  autoUpdater.allowDowngrade = false;

  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send(IPC.UPDATE_CHECKING);
  });

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send(IPC.UPDATE_AVAILABLE, info);
  });

  autoUpdater.on('update-not-available', (info) => {
    mainWindow?.webContents.send(IPC.UPDATE_NOT_AVAILABLE, info);
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send(IPC.UPDATE_DOWNLOAD_PROGRESS, progress);
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send(IPC.UPDATE_DOWNLOADED, info);
  });

  autoUpdater.on('error', (error) => {
    console.error('[Updater]', error.message);
    mainWindow?.webContents.send(IPC.UPDATE_ERROR, error.message);
  });

  checkForUpdates();
  updateTimer = setInterval(() => checkForUpdates(), CHECK_INTERVAL);
}

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  if (!app.isPackaged) {
    return {
      supported: false,
      started: false,
      message: '开发模式不支持自动更新检查，请在安装版中使用。',
    };
  }

  try {
    await autoUpdater.checkForUpdates();
    return {
      supported: true,
      started: true,
      message: '已开始检查更新。',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Updater] check failed:', err);
    mainWindow?.webContents.send(IPC.UPDATE_ERROR, message);
    return {
      supported: true,
      started: false,
      message,
    };
  }
}

export async function downloadUpdate(): Promise<void> {
  if (!app.isPackaged) return;
  try {
    await autoUpdater.downloadUpdate();
  } catch (err) {
    console.error('[Updater] download failed:', err);
  }
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall();
}

export function stopUpdater(): void {
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
  }
}
