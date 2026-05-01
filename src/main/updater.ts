import { autoUpdater } from 'electron-updater';
import { BrowserWindow, app } from 'electron';
import { IPC } from '../shared/ipc';

let mainWindow: BrowserWindow | null = null;

export function initUpdater(window: BrowserWindow): void {
  mainWindow = window;

  // 仅在打包后的生产环境启用自动更新
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
}

export async function checkForUpdates(): Promise<void> {
  if (!app.isPackaged) return;
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    console.error('[Updater] check failed:', err);
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
