import * as XLSX from 'xlsx';

export interface ExportOptions {
  title?: string;
  filename?: string;
}

/**
 * Export data to Excel (XLSX)
 */
export function exportToExcel(
  data: any[],
  columns: { key: string; label: string; width?: number }[],
  options: ExportOptions = {}
) {
  const { title = '导出数据', filename = 'export.xlsx' } = options;

  const exportData = data.map((row) => {
    const newRow: Record<string, any> = {};
    columns.forEach((col) => {
      newRow[col.label] = row[col.key] ?? '';
    });
    return newRow;
  });

  const ws = XLSX.utils.json_to_sheet(exportData);

  if (columns.some((col) => col.width)) {
    ws['!cols'] = columns.map((col) => ({ wch: col.width || 20 }));
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title);
  XLSX.writeFile(wb, filename);
}

/**
 * Export data to PDF using main process (supports Chinese)
 */
export function exportToPDF(
  data: any[],
  columns: { key: string; label: string }[],
  options: ExportOptions = {}
) {
  const { title = '导出数据' } = options;

  const api = window.api;
  if (!api?.data?.exportPdf) {
    console.error('[Export] exportPdf API not available');
    return;
  }

  api.data.exportPdf({ title, columns, data });
}

/**
 * Export wrong records
 */
export function exportWrongRecords(
  records: any[],
  format: 'xlsx' | 'pdf' = 'xlsx'
) {
  const columns = [
    { key: 'type', label: '题型', width: 15 },
    { key: 'content', label: '题目', width: 50 },
    { key: 'answer', label: '正确答案', width: 20 },
    { key: 'my_answer', label: '你的答案', width: 20 },
    { key: 'explanation', label: '解析', width: 60 },
    { key: 'review_count', label: '复习次数', width: 12 },
    { key: 'mastered', label: '已掌握', width: 12 },
    { key: 'created_at', label: '添加日期', width: 15 },
  ];

  const displayData = records.map((r) => ({
    ...r,
    mastered: r.mastered ? '是' : '否',
    created_at: r.created_at ? new Date(r.created_at).toLocaleDateString('zh-CN') : '',
  }));

  const options = {
    title: '错题本',
    filename: `错题本_${new Date().toISOString().split('T')[0]}.${format}`,
  };

  if (format === 'xlsx') {
    exportToExcel(displayData, columns, options);
  } else {
    exportToPDF(displayData, columns, options);
  }
}

/**
 * Export study plans
 */
export function exportStudyPlans(plans: any[], format: 'xlsx' | 'pdf' = 'xlsx') {
  const columns = [
    { key: 'title', label: '计划标题', width: 30 },
    { key: 'subject', label: '科目', width: 20 },
    { key: 'priority', label: '优先级', width: 12 },
    { key: 'status', label: '状态', width: 12 },
    { key: 'daily_minutes', label: '每日时长(分钟)', width: 18 },
    { key: 'target_date', label: '目标日期', width: 15 },
    { key: 'created_at', label: '创建日期', width: 15 },
  ];

  const priorityMap: Record<string, string> = { low: '低', medium: '中', high: '高' };
  const statusMap: Record<string, string> = { pending: '未开始', in_progress: '进行中', completed: '已完成' };

  const displayData = plans.map((p) => ({
    ...p,
    priority: priorityMap[p.priority] || p.priority,
    status: statusMap[p.status] || p.status,
    target_date: p.target_date ? new Date(p.target_date).toLocaleDateString('zh-CN') : '',
    created_at: p.created_at ? new Date(p.created_at).toLocaleDateString('zh-CN') : '',
  }));

  const options = {
    title: '学习计划',
    filename: `学习计划_${new Date().toISOString().split('T')[0]}.${format}`,
  };

  if (format === 'xlsx') {
    exportToExcel(displayData, columns, options);
  } else {
    exportToPDF(displayData, columns, options);
  }
}

/**
 * Export flashcards
 */
export function exportFlashcards(
  cards: any[],
  format: 'xlsx' | 'pdf' = 'xlsx'
) {
  const columns = [
    { key: 'category', label: '分类', width: 20 },
    { key: 'front', label: '正面', width: 40 },
    { key: 'back', label: '背面', width: 40 },
    { key: 'review_count', label: '复习次数', width: 12 },
    { key: 'mastered', label: '已掌握', width: 12 },
    { key: 'next_review', label: '下次复习', width: 15 },
  ];

  const displayData = cards.map((c) => ({
    ...c,
    mastered: c.mastered ? '是' : '否',
    next_review: c.next_review ? new Date(c.next_review).toLocaleDateString('zh-CN') : '待安排',
  }));

  const options = {
    title: '记忆卡片',
    filename: `记忆卡片_${new Date().toISOString().split('T')[0]}.${format}`,
  };

  if (format === 'xlsx') {
    exportToExcel(displayData, columns, options);
  } else {
    exportToPDF(displayData, columns, options);
  }
}

/**
 * Export daily statistics
 */
export function exportDailyStats(
  stats: any[],
  format: 'xlsx' | 'pdf' = 'xlsx'
) {
  const columns = [
    { key: 'date', label: '日期', width: 15 },
    { key: 'study_minutes', label: '学习时长(分钟)', width: 18 },
    { key: 'questions_done', label: '做题数量', width: 12 },
    { key: 'wrong_count', label: '错题数量', width: 12 },
    { key: 'note', label: '笔记', width: 40 },
  ];

  const displayData = stats.map((s) => ({
    ...s,
    date: s.date ? new Date(s.date).toLocaleDateString('zh-CN') : '',
  }));

  const options = {
    title: '学习统计',
    filename: `学习统计_${new Date().toISOString().split('T')[0]}.${format}`,
  };

  if (format === 'xlsx') {
    exportToExcel(displayData, columns, options);
  } else {
    exportToPDF(displayData, columns, options);
  }
}
