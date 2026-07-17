import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { IPC } from '../../shared/ipc';
import type { EssayPaperExportParams } from '../../shared/ipc';
import { sanitizeExportFileName } from './contract-utils';

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeParams(params: EssayPaperExportParams) {
  const title = String(params?.title || '申论答题纸').trim().slice(0, 80) || '申论答题纸';
  const format = params?.format === 'png' ? 'png' as const : 'pdf' as const;
  const questions = (Array.isArray(params?.questions) ? params.questions : [])
    .slice(0, 10)
    .map((question, index) => ({
      title: String(question?.title || `第 ${index + 1} 题`).trim().slice(0, 100),
      wordCount: Math.max(100, Math.min(3000, Math.round(Number(question?.word_count) || 400))),
      suggestedMinutes: Math.max(1, Math.min(180, Math.round(Number(question?.suggested_minutes) || 20))),
    }));
  return { title, format, candidateInfo: Boolean(params?.candidate_info), questions };
}

export function buildEssayPaperHtml(params: EssayPaperExportParams) {
  const normalized = normalizeParams(params);
  const pages = normalized.questions.map((question, questionIndex) => {
    const cells = Array.from({ length: question.wordCount }, (_, cellIndex) => {
      const marker = (cellIndex + 1) % 100 === 0 ? `<span>${cellIndex + 1}</span>` : '';
      return `<i>${marker}</i>`;
    }).join('');

    return `<section class="page">
      <header>
        <div><b>${escapeHtml(normalized.title)}</b><small>第 ${questionIndex + 1} 题 · 建议用时 ${question.suggestedMinutes} 分钟</small></div>
        <strong>${escapeHtml(question.title)}</strong>
      </header>
      ${normalized.candidateInfo ? '<div class="candidate">姓名：________________　准考证号：________________________　考场：________　座位号：________</div>' : ''}
      <div class="notice">请在方格内作答。共 ${question.wordCount} 格，标记数字仅用于字数定位。</div>
      <div class="grid">${cells}</div>
      <footer>公考小助手 · 纸笔训练答题纸</footer>
    </section>`;
  }).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;padding:0;background:#e8e8e8;color:#111;font-family:"Microsoft YaHei","SimHei",sans-serif}
    .page{width:210mm;min-height:297mm;margin:0 auto 10mm;background:#fff;padding:13mm 12mm 12mm;page-break-after:always;overflow:hidden}
    .page:last-child{page-break-after:auto}header{display:flex;align-items:flex-end;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:4mm;margin-bottom:4mm}
    header b{display:block;font-size:20px}header small{display:block;color:#555;margin-top:2mm;font-size:11px}header strong{font-size:15px;max-width:48%;text-align:right}
    .candidate{border:1px solid #111;padding:3mm;font-size:12px;margin-bottom:3mm}.notice{font-size:10px;color:#555;margin-bottom:3mm}
    .grid{display:grid;grid-template-columns:repeat(20,1fr);border-top:1px solid #555;border-left:1px solid #555}
    .grid i{position:relative;aspect-ratio:1/1;border-right:1px solid #777;border-bottom:1px solid #777;font-style:normal;min-height:8.9mm}
    .grid i span{position:absolute;right:1px;bottom:0;color:#aaa;font-size:6px;line-height:1}
    footer{text-align:center;color:#777;font-size:9px;margin-top:4mm}@page{size:A4;margin:0}
    @media print{html,body{background:#fff}.page{margin:0}}
  </style></head><body>${pages}</body></html>`;
}

export function registerEssayPaperHandler() {
  ipcMain.handle(IPC.ESSAY_PAPER_EXPORT, async (_event, params: EssayPaperExportParams) => {
    const normalized = normalizeParams(params);
    if (normalized.questions.length === 0) return { success: false, error: '至少需要一道题目' };

    const result = await dialog.showSaveDialog({
      title: normalized.format === 'pdf' ? '导出申论答题纸 PDF' : '导出申论答题纸 PNG',
      defaultPath: `${sanitizeExportFileName(normalized.title)}.${normalized.format}`,
      filters: [{ name: normalized.format.toUpperCase(), extensions: [normalized.format] }],
    });
    if (result.canceled || !result.filePath) return { success: false };

    const tempPath = path.join(app.getPath('temp'), `essay_paper_${Date.now()}.html`);
    const win = new BrowserWindow({
      show: false,
      width: 794,
      height: 1123,
      webPreferences: { sandbox: true },
    });

    try {
      fs.writeFileSync(tempPath, buildEssayPaperHtml(params), 'utf-8');
      await win.loadFile(tempPath);
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (normalized.format === 'pdf') {
        const buffer = await win.webContents.printToPDF({
          printBackground: true,
          pageSize: 'A4',
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
        });
        fs.writeFileSync(result.filePath, Buffer.from(buffer));
      } else {
        const pageHeight = await win.webContents.executeJavaScript('Math.ceil(document.documentElement.scrollHeight)');
        const captureHeight = Math.max(1123, Math.min(Number(pageHeight) || 1123, 30000));
        win.setContentSize(794, captureHeight);
        await new Promise((resolve) => setTimeout(resolve, 100));
        const image = await win.webContents.capturePage({ x: 0, y: 0, width: 794, height: captureHeight });
        fs.writeFileSync(result.filePath, image.toPNG());
      }
      return { success: true, path: result.filePath };
    } catch (error) {
      console.error('[Essay Paper Export] Error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    } finally {
      win.close();
      try { fs.unlinkSync(tempPath); } catch { /* ignore cleanup errors */ }
    }
  });
}
