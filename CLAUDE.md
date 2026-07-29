# CLAUDE.md

本文件为在此仓库中工作的Claude Code 等编码代理提供约束和开发指引。

## 项目概述

公考小助手是 Windows Electron 桌面端公考学习工具。当前产品采用“核心流程优先”结构：8 个侧栏入口覆盖复习、真题、模考、申论、AI 教学和备考追踪；低频能力作为核心页面内的二级入口，不再新增平行壳页面。

技术栈：Electron 33、React 18、TypeScript 5.6、Vite 6、Tailwind CSS 3、better-sqlite3、Drizzle ORM、TanStack Query 和 Zustand。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run electron:dev` | 启动 Vite 与 Electron 开发环境 |
| `npm run lint` | 检查渲染进程和主进程 TypeScript |
| `npm run test` | 构建主进程并执行 IPC/核心功能防回退测试 |
| `npm run build:all` | 构建渲染进程和主进程 |
| `npm run electron:build` | 构建 Windows 安装版与便携版 |
| `npm run verify:study-tracker` | 校验备考追踪上游快照 |
| `npm run verify:study-tracker:package` | 校验安装包中的备考追踪快照 |

## 产品边界

### 侧栏只保留 8 个主入口

- `/` 首页
- `/review` 今日复习
- `/mock-exam` 套题模考
- `/question-bank` 真题题库
- `/essay-review` 申论训练
- `/rag-chat` AI 名师
- `/study-tracker` 备考追踪
- `/settings` 设置

### 二级入口

- `/wrong-book` 错题本
- `/real-papers` 已导入真题
- `/paper-import` PDF 真题导入
- `/essay-practice` 申论答题纸
- `/skill-tree` 能力树

`/flashcards` 和 `/study-plan` 只做历史链接兼容重定向。不要恢复番茄钟、成就、聊天室、鼓励语录、思维导图、知识图谱、独立计划/卡片、打卡、残酷报告或组件展示页面。

## Electron 架构

- `src/main/`：数据库、文件系统、OCR/PDF、IPC、自动更新和 preload。
- `src/renderer/`：React UI；所有系统能力必须通过 `window.api` 调用。
- `src/shared/ipc.ts`：IPC 通道、请求与返回类型的唯一契约来源。
- 主窗口保持 `contextIsolation: true`、`nodeIntegration: false`。

IPC 通道使用 `命名空间:方法` 格式。数据库层多用 camelCase，渲染层历史契约使用 snake_case；新增或修改 IPC 返回值时先检查 `src/main/ipc/contract-utils.ts` 的转换函数。

## 状态与数据

- Zustand 只保留 `app-store.ts` 与 `mock-exam-store.ts`。
- IPC 数据读取统一通过 `src/renderer/hooks/use-api.ts` 的 TanStack Query hooks。
- SQLite Schema 位于 `src/main/db/schema.ts`。
- 旧表与旧 IPC 可以继续存在以兼容历史用户数据，但不得据此恢复已删除的桌面页面。
- 用户数据库默认位于 `%APPDATA%/gongkao-assistant/gongkao.db`。

## Skill 集成约束

### kaogong-study-tracker

`src/main/skills/kaogong-study-tracker/` 是原样上游快照，固定 Commit：

```text
cf9fafd3c607650f48470c0faced14a2d165cf39
```

**禁止直接修改该目录。** 桌面适配写在 `src/main/ipc/study-tracker.ts`、preload、共享 IPC 和 React 页面中。每次构建后都要执行源码与产物校验。

### 花生十三

- Skill 文件位于 `src/main/skills/huasheng13/`。
- 路由与提示词适配位于 `src/main/ipc/huasheng13.ts`。
- AI 名师页面位于 `src/renderer/pages/RagChat.tsx`。
- 保留行测速解、基础讲解、申论审题、错因复盘和备考规划等题型化模式。

### human-skill-tree

只借鉴能力节点与成长路径的交互思路，实际桌面实现位于 `src/renderer/pages/SkillTree.tsx`；不要复制上游源码或素材。

## 设计与实现规则

- 使用现有 React、Tailwind 和 UI 组件，不迁移框架。
- 优先合并流程而不是新建侧栏入口。
- 不创建 `New`/旧版并行页面。
- 所有按钮必须有真实动作、禁用态或清晰错误反馈。
- 修改功能后同步更新 `tests/run-ipc-contract-tests.js` 的防回退断言。
- 不重新引入腾讯云 IM、recharts、Radix Dialog 等已删除专用依赖，除非产品边界明确改变。

## 验证顺序

```bash
npm run lint
npm run test
npm run build:all
node scripts/verify-kaogong-study-tracker.js
node scripts/verify-kaogong-study-tracker.js dist/main/skills/kaogong-study-tracker
```

打包后再运行：

```bash
node scripts/verify-packaged-study-tracker.js
```

## 发布

`.github/workflows/build.yml` 负责构建。Windows 产物输出到 `release/`。发布前必须保证 TypeScript、测试、构建、Skill 快照和安装包校验全部通过。
