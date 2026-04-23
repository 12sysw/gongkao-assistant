"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC_CHANNELS = void 0;
// ==================== IPC 通道类型 ====================
exports.IPC_CHANNELS = {
    // 错题本
    WRONG_BOOK_ADD: 'wrong-book:add',
    WRONG_BOOK_GET_ALL: 'wrong-book:get-all',
    WRONG_BOOK_GET_BY_ID: 'wrong-book:get-by-id',
    WRONG_BOOK_UPDATE: 'wrong-book:update',
    WRONG_BOOK_DELETE: 'wrong-book:delete',
    WRONG_BOOK_MARK_MASTERED: 'wrong-book:mark-mastered',
    WRONG_BOOK_GET_DUE_REVIEW: 'wrong-book:get-due-review',
    // 题目
    QUESTION_ADD: 'question:add',
    QUESTION_GET_ALL: 'question:get-all',
    QUESTION_GET_BY_ID: 'question:get-by-id',
    QUESTION_UPDATE: 'question:update',
    QUESTION_DELETE: 'question:delete',
    // 思维导图
    MIND_MAP_SAVE: 'mind-map:save',
    MIND_MAP_GET_ALL: 'mind-map:get-all',
    MIND_MAP_GET_BY_ID: 'mind-map:get-by-id',
    MIND_MAP_DELETE: 'mind-map:delete',
    // 学习计划
    STUDY_PLAN_ADD: 'study-plan:add',
    STUDY_PLAN_GET_ALL: 'study-plan:get-all',
    STUDY_PLAN_UPDATE: 'study-plan:update',
    STUDY_PLAN_DELETE: 'study-plan:delete',
    // 每日记录
    DAILY_RECORD_ADD: 'daily-record:add',
    DAILY_RECORD_GET_BY_DATE: 'daily-record:get-by-date',
    DAILY_RECORD_GET_RANGE: 'daily-record:get-range',
    DAILY_RECORD_GET_STATS: 'daily-record:get-stats',
    // 成就
    ACHIEVEMENT_GET_ALL: 'achievement:get-all',
    ACHIEVEMENT_CHECK: 'achievement:check',
    // 数据导出导入
    DATA_EXPORT: 'data:export',
    DATA_IMPORT: 'data:import',
};
