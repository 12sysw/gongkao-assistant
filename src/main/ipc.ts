import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import { getDatabase, saveDatabase } from './database';

export async function registerIpcHandlers() {
  const db = await getDatabase();

  // 辅助函数：执行查询并返回所有行（无参数版本）
  function all(sql: string, params: any[] = []): any[] {
    // sql.js 不支持 exec 带参数，使用手动绑定
    if (params.length > 0) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const results: any[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push(row);
      }
      stmt.free();
      return results;
    }
    const result = db.exec(sql);
    if (result.length === 0) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
  }

  // 辅助函数：执行查询并返回单行
  function get(sql: string, params: any[] = []): any | undefined {
    const rows = all(sql, params);
    return rows.length > 0 ? rows[0] : undefined;
  }

  // 辅助函数：执行并保存
  function run(sql: string, params: any[] = []) {
    db.run(sql, params);
    saveDatabase();
  }

  // ==================== 题目 ====================
  ipcMain.handle(IPC_CHANNELS.QUESTION_ADD, (_, q: any) => {
    run('INSERT INTO questions (type, content, options, answer, explanation, tags) VALUES (?, ?, ?, ?, ?, ?)',
      [q.type, q.content, q.options || null, q.answer, q.explanation || '', q.tags || '']);
    const row = get('SELECT last_insert_rowid() as id') as any;
    return { id: row?.id, ...q };
  });

  ipcMain.handle(IPC_CHANNELS.QUESTION_GET_ALL, (_, filters?: any) => {
    let sql = 'SELECT * FROM questions WHERE 1=1';
    const params: any[] = [];
    if (filters?.type) { sql += ' AND type = ?'; params.push(filters.type); }
    if (filters?.tags) { sql += ' AND tags LIKE ?'; params.push(`%${filters.tags}%`); }
    sql += ' ORDER BY created_at DESC';
    if (filters?.limit) { sql += ' LIMIT ?'; params.push(filters.limit); }
    return all(sql, params);
  });

  ipcMain.handle(IPC_CHANNELS.QUESTION_GET_BY_ID, (_, id: number) => {
    return get('SELECT * FROM questions WHERE id = ?', [id]);
  });

  ipcMain.handle(IPC_CHANNELS.QUESTION_UPDATE, (_, q: any) => {
    run('UPDATE questions SET type=?, content=?, options=?, answer=?, explanation=?, tags=? WHERE id=?',
      [q.type, q.content, q.options, q.answer, q.explanation, q.tags, q.id]);
    return q;
  });

  ipcMain.handle(IPC_CHANNELS.QUESTION_DELETE, (_, id: number) => {
    run('DELETE FROM questions WHERE id = ?', [id]);
    return { success: true };
  });

  // ==================== 错题本 ====================
  ipcMain.handle(IPC_CHANNELS.WRONG_BOOK_ADD, (_, record: any) => {
    run('INSERT INTO wrong_records (question_id, my_answer, note) VALUES (?, ?, ?)',
      [record.question_id, record.my_answer, record.note || '']);
    const row = get('SELECT last_insert_rowid() as id') as any;
    return { id: row?.id, ...record };
  });

  ipcMain.handle(IPC_CHANNELS.WRONG_BOOK_GET_ALL, (_, filters?: any) => {
    let sql = `SELECT wr.*, q.type, q.content, q.options, q.answer, q.explanation, q.tags
      FROM wrong_records wr JOIN questions q ON wr.question_id = q.id WHERE 1=1`;
    const params: any[] = [];
    if (filters?.mastered !== undefined) { sql += ' AND wr.mastered = ?'; params.push(filters.mastered); }
    if (filters?.type) { sql += ' AND q.type = ?'; params.push(filters.type); }
    sql += ' ORDER BY wr.last_wrong_at DESC';
    return all(sql, params);
  });

  ipcMain.handle(IPC_CHANNELS.WRONG_BOOK_GET_BY_ID, (_, id: number) => {
    return get(`SELECT wr.*, q.type, q.content, q.options, q.answer, q.explanation, q.tags
      FROM wrong_records wr JOIN questions q ON wr.question_id = q.id WHERE wr.id = ?`, [id]);
  });

  ipcMain.handle(IPC_CHANNELS.WRONG_BOOK_UPDATE, (_, record: any) => {
    run('UPDATE wrong_records SET my_answer=?, note=?, next_review_at=? WHERE id=?',
      [record.my_answer, record.note, record.next_review_at, record.id]);
    return record;
  });

  ipcMain.handle(IPC_CHANNELS.WRONG_BOOK_DELETE, (_, id: number) => {
    run('DELETE FROM wrong_records WHERE id = ?', [id]);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.WRONG_BOOK_MARK_MASTERED, (_, id: number) => {
    run('UPDATE wrong_records SET mastered = 1 WHERE id = ?', [id]);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.WRONG_BOOK_GET_DUE_REVIEW, () => {
    return all(`SELECT wr.*, q.type, q.content, q.options, q.answer, q.explanation, q.tags
      FROM wrong_records wr JOIN questions q ON wr.question_id = q.id
      WHERE wr.mastered = 0 AND wr.next_review_at <= datetime('now', 'localtime')
      ORDER BY wr.next_review_at ASC`);
  });

  // ==================== 思维导图 ====================
  ipcMain.handle(IPC_CHANNELS.MIND_MAP_SAVE, (_, data: any) => {
    console.log('[IPC] MIND_MAP_SAVE received:', data.title, 'id:', data.id);
    if (data.id) {
      run('UPDATE mind_maps SET title=?, subject=?, data=?, updated_at=datetime("now","localtime") WHERE id=?',
        [data.title, data.subject, data.data, data.id]);
      console.log('[IPC] MIND_MAP_SAVE: updated existing map');
      return { id: data.id, title: data.title, subject: data.subject };
    } else {
      run('INSERT INTO mind_maps (title, subject, data) VALUES (?, ?, ?)',
        [data.title, data.subject, data.data]);
      // 使用 db.exec 直接获取 last_insert_rowid，避免异步问题
      const result = db.exec('SELECT last_insert_rowid() as id');
      const rowId = result.length > 0 ? result[0].values[0][0] : null;
      console.log('[IPC] MIND_MAP_SAVE: inserted new map with id:', rowId);
      return { id: rowId, title: data.title, subject: data.subject };
    }
  });

  ipcMain.handle(IPC_CHANNELS.MIND_MAP_GET_ALL, () => {
    return all('SELECT id, title, subject, created_at, updated_at FROM mind_maps ORDER BY updated_at DESC');
  });

  ipcMain.handle(IPC_CHANNELS.MIND_MAP_GET_BY_ID, (_, id: number) => {
    return get('SELECT * FROM mind_maps WHERE id = ?', [id]);
  });

  ipcMain.handle(IPC_CHANNELS.MIND_MAP_DELETE, (_, id: number) => {
    run('DELETE FROM mind_maps WHERE id = ?', [id]);
    return { success: true };
  });

  // ==================== 学习计划 ====================
  ipcMain.handle(IPC_CHANNELS.STUDY_PLAN_ADD, (_, plan: any) => {
    run('INSERT INTO study_plans (title, subject, target_date, priority, description, daily_minutes) VALUES (?, ?, ?, ?, ?, ?)',
      [plan.title, plan.subject, plan.target_date, plan.priority || 'medium', plan.description || '', plan.daily_minutes || 60]);
    const row = get('SELECT last_insert_rowid() as id') as any;
    return { id: row?.id, ...plan };
  });

  ipcMain.handle(IPC_CHANNELS.STUDY_PLAN_GET_ALL, () => {
    return all('SELECT * FROM study_plans ORDER BY status ASC, priority DESC, target_date ASC');
  });

  ipcMain.handle(IPC_CHANNELS.STUDY_PLAN_UPDATE, (_, plan: any) => {
    run(`UPDATE study_plans SET title=?, subject=?, target_date=?, priority=?, status=?, description=?, daily_minutes=?, updated_at=datetime("now","localtime") WHERE id=?`,
      [plan.title, plan.subject, plan.target_date, plan.priority, plan.status, plan.description, plan.daily_minutes, plan.id]);
    return plan;
  });

  ipcMain.handle(IPC_CHANNELS.STUDY_PLAN_DELETE, (_, id: number) => {
    run('DELETE FROM study_plans WHERE id = ?', [id]);
    return { success: true };
  });

  // ==================== 每日记录 ====================
  ipcMain.handle(IPC_CHANNELS.DAILY_RECORD_ADD, (_, record: any) => {
    // 先检查是否存在
    const existing = get('SELECT * FROM daily_records WHERE date = ?', [record.date]);
    if (existing) {
      run(`UPDATE daily_records SET study_minutes = study_minutes + ?, questions_done = questions_done + ?, wrong_count = wrong_count + ?, note = CASE WHEN ? != '' THEN ? ELSE note END WHERE date = ?`,
        [record.study_minutes || 0, record.questions_done || 0, record.wrong_count || 0, record.note || '', record.note || '', record.date]);
    } else {
      run('INSERT INTO daily_records (date, study_minutes, questions_done, wrong_count, plan_id, note) VALUES (?, ?, ?, ?, ?, ?)',
        [record.date, record.study_minutes || 0, record.questions_done || 0, record.wrong_count || 0, record.plan_id || null, record.note || '']);
    }
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.DAILY_RECORD_GET_BY_DATE, (_, date: string) => {
    return get('SELECT * FROM daily_records WHERE date = ?', [date]);
  });

  ipcMain.handle(IPC_CHANNELS.DAILY_RECORD_GET_RANGE, (_, start: string, end: string) => {
    return all('SELECT * FROM daily_records WHERE date BETWEEN ? AND ? ORDER BY date ASC', [start, end]);
  });

  ipcMain.handle(IPC_CHANNELS.DAILY_RECORD_GET_STATS, (_, days: number) => {
    const totalStudy = get(`SELECT COALESCE(SUM(study_minutes), 0) as total_minutes,
      COALESCE(SUM(questions_done), 0) as total_questions,
      COALESCE(SUM(wrong_count), 0) as total_wrong,
      COUNT(*) as active_days
      FROM daily_records WHERE date >= date('now', 'localtime', ? || ' days')`, [`-${days}`]) as any;

    const masteredCount = get('SELECT COUNT(*) as count FROM wrong_records WHERE mastered = 1') as any;

    // 简化的连续天数计算
    const recentDays = all(`SELECT date FROM daily_records WHERE date >= date('now', 'localtime', '-365 days') ORDER BY date DESC`);
    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    let checkDate = new Date();

    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      const found = recentDays.some((r: any) => r.date === dateStr);
      if (found) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (dateStr === today) {
        // 今天还没有记录，不算断
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      ...totalStudy,
      streak,
      mastered_count: masteredCount?.count || 0,
    };
  });

  // ==================== 成就 ====================
  ipcMain.handle(IPC_CHANNELS.ACHIEVEMENT_GET_ALL, () => {
    return all('SELECT * FROM achievements ORDER BY type, threshold ASC');
  });

  ipcMain.handle(IPC_CHANNELS.ACHIEVEMENT_CHECK, () => {
    const stats = get(`SELECT COALESCE(SUM(study_minutes), 0) as total_minutes,
      COALESCE(SUM(questions_done), 0) as total_questions FROM daily_records`) as any;

    const masteredCount = get('SELECT COUNT(*) as count FROM wrong_records WHERE mastered = 1') as any;

    // 记忆卡片复习次数
    const flashcardReviewCount = get('SELECT COALESCE(SUM(review_count), 0) as count FROM flashcards') as any;
    // 记忆卡片掌握数
    const flashcardMasteredCount = get('SELECT COUNT(*) as count FROM flashcards WHERE mastered = 1') as any;
    // 番茄钟完成数
    const pomodoroCount = get('SELECT COUNT(*) as count FROM pomodoro_records WHERE mode = \'work\'') as any;
    // 打卡天数（有 daily_records 记录的天数）
    const checkinCount = get('SELECT COUNT(DISTINCT date) as count FROM daily_records') as any;

    // 简化的连续天数
    const recentDays = all(`SELECT date FROM daily_records WHERE date >= date('now', 'localtime', '-365 days') ORDER BY date DESC`);
    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    let checkDate = new Date();
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      const found = recentDays.some((r: any) => r.date === dateStr);
      if (found) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (dateStr === today) {
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // 解锁成就
    run('UPDATE achievements SET unlocked_at = datetime("now","localtime") WHERE type = ? AND threshold <= ? AND unlocked_at IS NULL',
      ['streak', streak]);
    run('UPDATE achievements SET unlocked_at = datetime("now","localtime") WHERE type = ? AND threshold <= ? AND unlocked_at IS NULL',
      ['questions', stats?.total_questions || 0]);
    run('UPDATE achievements SET unlocked_at = datetime("now","localtime") WHERE type = ? AND threshold <= ? AND unlocked_at IS NULL',
      ['study_time', stats?.total_minutes || 0]);
    run('UPDATE achievements SET unlocked_at = datetime("now","localtime") WHERE type = ? AND threshold <= ? AND unlocked_at IS NULL',
      ['mastered', masteredCount?.count || 0]);
    run('UPDATE achievements SET unlocked_at = datetime("now","localtime") WHERE type = ? AND threshold <= ? AND unlocked_at IS NULL',
      ['flashcard', flashcardReviewCount?.count || 0]);
    run('UPDATE achievements SET unlocked_at = datetime("now","localtime") WHERE type = ? AND threshold <= ? AND unlocked_at IS NULL',
      ['flashcard_master', flashcardMasteredCount?.count || 0]);
    run('UPDATE achievements SET unlocked_at = datetime("now","localtime") WHERE type = ? AND threshold <= ? AND unlocked_at IS NULL',
      ['pomodoro', pomodoroCount?.count || 0]);
    run('UPDATE achievements SET unlocked_at = datetime("now","localtime") WHERE type = ? AND threshold <= ? AND unlocked_at IS NULL',
      ['checkin', checkinCount?.count || 0]);

    // 返回成就列表及当前进度
    const achievements = all('SELECT * FROM achievements ORDER BY type, threshold ASC');

    // 附加进度信息
    const progressMap: Record<string, number> = {
      streak,
      questions: stats?.total_questions || 0,
      study_time: stats?.total_minutes || 0,
      mastered: masteredCount?.count || 0,
      flashcard: flashcardReviewCount?.count || 0,
      flashcard_master: flashcardMasteredCount?.count || 0,
      pomodoro: pomodoroCount?.count || 0,
      checkin: checkinCount?.count || 0,
    };

    return achievements.map((a: any) => ({
      ...a,
      progress: progressMap[a.type] || 0,
    }));
  });

  // ==================== 记忆卡片 ====================
  ipcMain.handle(IPC_CHANNELS.FLASHCARD_ADD, (_, card: any) => {
    run('INSERT INTO flashcards (front, back, category, difficulty) VALUES (?, ?, ?, ?)',
      [card.front, card.back, card.category || '常识-政治', card.difficulty || 'medium']);
    const row = get('SELECT last_insert_rowid() as id') as any;
    return { id: row?.id, ...card };
  });

  ipcMain.handle(IPC_CHANNELS.FLASHCARD_GET_ALL, (_, filters?: any) => {
    let sql = 'SELECT * FROM flashcards WHERE 1=1';
    const params: any[] = [];
    if (filters?.category) { sql += ' AND category = ?'; params.push(filters.category); }
    if (filters?.mastered !== undefined) { sql += ' AND mastered = ?'; params.push(filters.mastered); }
    sql += ' ORDER BY next_review ASC, created_at DESC';
    return all(sql, params);
  });

  ipcMain.handle(IPC_CHANNELS.FLASHCARD_UPDATE, (_, card: any) => {
    const fields: string[] = [];
    const params: any[] = [];
    if (card.front !== undefined) { fields.push('front = ?'); params.push(card.front); }
    if (card.back !== undefined) { fields.push('back = ?'); params.push(card.back); }
    if (card.category !== undefined) { fields.push('category = ?'); params.push(card.category); }
    if (card.difficulty !== undefined) { fields.push('difficulty = ?'); params.push(card.difficulty); }
    if (card.review_count !== undefined) { fields.push('review_count = ?'); params.push(card.review_count); }
    if (card.mastered !== undefined) { fields.push('mastered = ?'); params.push(card.mastered); }
    if (card.next_review !== undefined) { fields.push('next_review = ?'); params.push(card.next_review); }
    if (fields.length === 0) return card;
    params.push(card.id);
    run(`UPDATE flashcards SET ${fields.join(', ')} WHERE id = ?`, params);
    return card;
  });

  ipcMain.handle(IPC_CHANNELS.FLASHCARD_DELETE, (_, id: number) => {
    run('DELETE FROM flashcards WHERE id = ?', [id]);
    return { success: true };
  });

  // ==================== 番茄钟记录 ====================
  ipcMain.handle(IPC_CHANNELS.POMODORO_RECORD_ADD, (_, record: any) => {
    run('INSERT INTO pomodoro_records (date, duration, mode) VALUES (?, ?, ?)',
      [record.date, record.duration || 25, record.mode || 'work']);
    const row = get('SELECT last_insert_rowid() as id') as any;
    return { id: row?.id, ...record };
  });

  ipcMain.handle(IPC_CHANNELS.POMODORO_RECORD_GET_BY_DATE, (_, date: string) => {
    return all('SELECT * FROM pomodoro_records WHERE date = ? ORDER BY created_at ASC', [date]);
  });

  ipcMain.handle(IPC_CHANNELS.POMODORO_RECORD_GET_RANGE, (_, start: string, end: string) => {
    return all('SELECT * FROM pomodoro_records WHERE date BETWEEN ? AND ? ORDER BY date ASC, created_at ASC', [start, end]);
  });

  // ==================== 考试配置 ====================
  ipcMain.handle(IPC_CHANNELS.EXAM_CONFIG_GET, () => {
    return get('SELECT * FROM exam_config ORDER BY id DESC LIMIT 1');
  });

  ipcMain.handle(IPC_CHANNELS.EXAM_CONFIG_SET, (_, config: any) => {
    const existing = get('SELECT * FROM exam_config ORDER BY id DESC LIMIT 1');
    if (existing) {
      run('UPDATE exam_config SET name = ?, date = ? WHERE id = ?', [config.name, config.date, (existing as any).id]);
    } else {
      run('INSERT INTO exam_config (name, date) VALUES (?, ?)', [config.name, config.date]);
    }
    return config;
  });

  // ==================== 数据导入导出 ====================
  ipcMain.handle(IPC_CHANNELS.DATA_EXPORT, async () => {
    const result = await dialog.showSaveDialog({
      title: '导出数据',
      defaultPath: 'gongkao-backup.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled) return { success: false };

    const tables = ['questions', 'wrong_records', 'mind_maps', 'study_plans', 'daily_records', 'achievements', 'flashcards', 'exam_config', 'pomodoro_records'];
    const data: any = {};
    for (const table of tables) {
      data[table] = all(`SELECT * FROM ${table}`);
    }

    const fs = await import('fs');
    fs.writeFileSync(result.filePath!, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true, path: result.filePath };
  });

  ipcMain.handle(IPC_CHANNELS.DATA_IMPORT, async (_, filePath: string) => {
    if (!filePath) {
      const result = await dialog.showOpenDialog({
        title: '导入数据',
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile'],
      });
      if (result.canceled) return { success: false };
      filePath = result.filePaths[0];
    }

    const fs = await import('fs');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const tables = ['questions', 'wrong_records', 'mind_maps', 'study_plans', 'daily_records', 'achievements', 'flashcards', 'exam_config', 'pomodoro_records'];
    for (const table of tables) {
      if (data[table] && Array.isArray(data[table])) {
        db.run(`DELETE FROM ${table}`);
        for (const row of data[table]) {
          const cols = Object.keys(row).join(', ');
          const placeholders = Object.keys(row).map(() => '?').join(', ');
          const vals = Object.values(row);
          db.run(`INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${placeholders})`, vals as any[]);
        }
      }
    }
    saveDatabase();

    return { success: true };
  });
}
