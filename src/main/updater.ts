import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';
import { IPC } from '../shared/ipc';

let mainWindow: BrowserWindow | null = null;

export function initUpdater(window: BrowserWindow): void {
  mainWindow = window;

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
    mainWindow?.webContents.send(IPC.UPDATE_ERROR, error.message);
  });
}

export async function checkForUpdates(): Promise<void> {
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    console.error('Update check failed:', err);
  }
}

export async function downloadUpdate(): Promise<void> {
  try {
    await autoUpdater.downloadUpdate();
  } catch (err) {
    console.error('Update download failed:', err);
  }
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall();
}
