export interface Question {
    id: number;
    type: '行测-言语理解' | '行测-数量关系' | '行测-判断推理' | '行测-资料分析' | '行测-常识判断' | '申论';
    content: string;
    options?: string;
    answer: string;
    explanation: string;
    tags: string;
    created_at: string;
}
export interface WrongRecord {
    id: number;
    question_id: number;
    my_answer: string;
    wrong_count: number;
    last_wrong_at: string;
    mastered: number;
    review_count: number;
    next_review_at: string;
    note: string;
    created_at: string;
    question?: Question;
}
export interface MindMapNode {
    id: string;
    topic: string;
    children?: MindMapNode[];
}
export interface MindMapData {
    id: number;
    title: string;
    subject: string;
    data: string;
    created_at: string;
    updated_at: string;
}
export type PlanStatus = 'pending' | 'in_progress' | 'completed';
export type PlanPriority = 'low' | 'medium' | 'high';
export interface StudyPlan {
    id: number;
    title: string;
    subject: string;
    target_date: string;
    priority: PlanPriority;
    status: PlanStatus;
    description: string;
    daily_minutes: number;
    created_at: string;
    updated_at: string;
}
export interface DailyRecord {
    id: number;
    date: string;
    study_minutes: number;
    questions_done: number;
    wrong_count: number;
    plan_id?: number;
    note: string;
    created_at: string;
}
export interface Achievement {
    id: number;
    type: 'streak' | 'questions' | 'study_time' | 'mastered';
    title: string;
    description: string;
    icon: string;
    threshold: number;
    unlocked_at: string | null;
}
export interface EncourageQuote {
    id: number;
    content: string;
    author: string;
    category: 'perseverance' | 'confidence' | 'method' | 'wisdom';
}
export declare const IPC_CHANNELS: {
    readonly WRONG_BOOK_ADD: "wrong-book:add";
    readonly WRONG_BOOK_GET_ALL: "wrong-book:get-all";
    readonly WRONG_BOOK_GET_BY_ID: "wrong-book:get-by-id";
    readonly WRONG_BOOK_UPDATE: "wrong-book:update";
    readonly WRONG_BOOK_DELETE: "wrong-book:delete";
    readonly WRONG_BOOK_MARK_MASTERED: "wrong-book:mark-mastered";
    readonly WRONG_BOOK_GET_DUE_REVIEW: "wrong-book:get-due-review";
    readonly QUESTION_ADD: "question:add";
    readonly QUESTION_GET_ALL: "question:get-all";
    readonly QUESTION_GET_BY_ID: "question:get-by-id";
    readonly QUESTION_UPDATE: "question:update";
    readonly QUESTION_DELETE: "question:delete";
    readonly MIND_MAP_SAVE: "mind-map:save";
    readonly MIND_MAP_GET_ALL: "mind-map:get-all";
    readonly MIND_MAP_GET_BY_ID: "mind-map:get-by-id";
    readonly MIND_MAP_DELETE: "mind-map:delete";
    readonly STUDY_PLAN_ADD: "study-plan:add";
    readonly STUDY_PLAN_GET_ALL: "study-plan:get-all";
    readonly STUDY_PLAN_UPDATE: "study-plan:update";
    readonly STUDY_PLAN_DELETE: "study-plan:delete";
    readonly DAILY_RECORD_ADD: "daily-record:add";
    readonly DAILY_RECORD_GET_BY_DATE: "daily-record:get-by-date";
    readonly DAILY_RECORD_GET_RANGE: "daily-record:get-range";
    readonly DAILY_RECORD_GET_STATS: "daily-record:get-stats";
    readonly ACHIEVEMENT_GET_ALL: "achievement:get-all";
    readonly ACHIEVEMENT_CHECK: "achievement:check";
    readonly DATA_EXPORT: "data:export";
    readonly DATA_IMPORT: "data:import";
};
