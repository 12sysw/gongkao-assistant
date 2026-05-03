import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, CheckCircle, X } from 'lucide-react';

const api = (window as any).api;

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';

interface UpdateInfo {
  version?: string;
  releaseNotes?: string;
}

interface DownloadProgress {
  percent?: number;
  bytesPerSecond?: number;
}

const UpdateNotification: React.FC = () => {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [info, setInfo] = useState<UpdateInfo>({});
  const [progress, setProgress] = useState<DownloadProgress>({});
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!api?.update) return;

    const offChecking = api.update.onChecking(() => {
      setStatus('checking');
      setDismissed(false);
    });

    const offAvailable = api.update.onAvailable((updateInfo: any) => {
      setStatus('available');
      setInfo(updateInfo || {});
      setDismissed(false);
    });

    const offNotAvailable = api.update.onNotAvailable(() => {
      setStatus('idle');
    });

    const offProgress = api.update.onProgress((p: any) => {
      setStatus('downloading');
      setProgress(p || {});
    });

    const offDownloaded = api.update.onDownloaded((updateInfo: any) => {
      setStatus('downloaded');
      setInfo(updateInfo || {});
    });

    const offError = api.update.onError(() => {
      setStatus('idle');
    });

    return () => {
      offChecking();
      offAvailable();
      offNotAvailable();
      offProgress();
      offDownloaded();
      offError();
    };
  }, []);

  if (dismissed || status === 'idle' || status === 'checking') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-surface-1 border border-border rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          {status === 'available' && (
            <>
              <Download className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  发现新版本 {info.version ? `v${info.version}` : ''}
                </p>
                <p className="text-xs text-text-secondary mt-1">是否下载更新？</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => api.update.download()}
                    className="px-3 py-1.5 text-xs font-medium bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    下载更新
                  </button>
                  <button
                    onClick={() => setDismissed(true)}
                    className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
                  >
                    稍后提醒
                  </button>
                </div>
              </div>
            </>
          )}

          {status === 'downloading' && (
            <>
              <RefreshCw className="w-5 h-5 text-blue-500 mt-0.5 shrink-0 animate-spin" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">正在下载更新...</p>
                <div className="w-full bg-surface-2 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round(progress.percent || 0)}%` }}
                  />
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {Math.round(progress.percent || 0)}%
                </p>
              </div>
            </>
          )}

          {status === 'downloaded' && (
            <>
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">更新已下载完成</p>
                <p className="text-xs text-text-secondary mt-1">重启应用即可完成更新</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => api.update.install()}
                    className="px-3 py-1.5 text-xs font-medium bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  >
                    立即安装
                  </button>
                  <button
                    onClick={() => setDismissed(true)}
                    className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
                  >
                    稍后
                  </button>
                </div>
              </div>
            </>
          )}

          <button
            onClick={() => setDismissed(true)}
            className="text-text-secondary hover:text-text-primary transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;
