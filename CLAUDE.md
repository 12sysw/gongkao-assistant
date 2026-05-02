# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指引。

## 项目概述

公考小助手 — 基于 Electron 的桌面端公务员考试学习工具。React 18 + TypeScript 5.6 + Vite 6 渲染进程，better-sqlite3 + Drizzle ORM 主进程，Zustand + TanStack Query 状态管理，Tailwind CSS 样式。

## 常用命令

| 命令 | 作用 |
|------|------|
| `npm run electron:dev` | 开发模式 — Vite + Electron（带 DevTools） |
| `npm run electron:build` | 生产构建 + Windows 安装包 |
| `npm run build:all` | 构建渲染进程 + 主进程（不打包） |
| `npm run build` | 只构建渲染进程（tsc + vite） |
| `npm run build:main` | 只构建主进程 |
| `npm run lint` | TypeScript 类型检查（两个进程） |
| `npm run test` | 构建主进程 + 运行 IPC 契约测试 |

**日常开发：** 执行 `npm run electron:dev`。主进程编译到 `dist/main/`，渲染进程编译到 `dist/renderer/`。如果窗口白屏，先执行 `npm run build:main` 再重新启动。

## 架构

### Electron 双进程模式

- **主进程** (`src/main/`) — SQLite 数据库、IPC 处理、自动更新、preload 脚本。严格 `contextIsolation: true`、`nodeIntegration: false`。
- **渲染进程** (`src/renderer/`) — React 应用，以本地文件方式加载（开发时从 `localhost:5173`）。所有 Node/系统访问都通过 `window.api`（类型定义在 `src/shared/ipc.ts`）。

### IPC 通信

所有 IPC 通道使用 `命名空间:方法` 格式（不用点号，避免 asar 打包问题）。通道定义在 `src/shared/ipc.ts` 的 `IPC` 常量中，同一文件中的 `Api` 接口是完整 IPC 契约的唯一来源。

数据流：渲染进程调用 `window.api.模块.方法(参数)` → `ipcRenderer.invoke(通道, 参数)` → 主进程处理器在 `src/main/ipc/index.ts` → Drizzle 查询 → 返回。推送事件（更新通知）使用 `ipcRenderer.on`。

### 重要：snake_case IPC 契约

数据库使用 camelCase 列名（Drizzle 惯例），但渲染进程消费 snake_case 字段名。`src/main/ipc/contract-utils.ts` 在通过 IPC 返回之前对每个数据库结果进行转换。添加 IPC 处理器时，务必使用 `toLegacy*()` 转换函数。编写渲染进程页面时，使用 snake_case 访问字段。contract-utils 中的 `getValue()` 辅助函数可兼容处理两种命名方式。

### 状态管理

- **Zustand**（客户端状态）— 3 个 store：`app-store.ts`（全局 UI）、`chat-store.ts`（IM 连接、消息，持久化到 localStorage）、`mock-exam-store.ts`（考试状态机）。
- **TanStack Query**（服务端/IPC 状态）— 所有 IPC 数据获取都通过 `src/renderer/hooks/use-api.ts` 中的 hooks。默认 `staleTime: 5分钟`，`refetchOnWindowFocus: false`。变更操作成功后会使相关查询缓存失效。

### 路由

使用 `HashRouter`（Electron `file://` 协议必需）。所有路由定义在 `App.tsx`。布局：持久化 `Sidebar` + 主内容区 + `UpdateNotification` 浮层。

### 数据库

SQLite（better-sqlite3），WAL 模式，启用外键。数据表：`questions`、`wrong_records`、`mind_maps`、`study_plans`、`daily_records`、`achievements`、`flashcards`、`pomodoro_records`、`exam_config`、`encourage_quotes`。Schema 定义在 `src/main/db/schema.ts`。数据库文件位置：`C:\Users\<用户名>\AppData\Roaming\gongkao-assistant\gongkao.db`。

复杂操作（导入导出、成就解锁、数据迁移）使用原始 SQL（`sqlite.prepare()`）而非 Drizzle。思维导图有 JSON 文件备份（`mind_maps_fallback.json`）以保证容错性。

### 外部 API

**UAPI** (`https://uapis.cn`) — 免费公开接口，无需密钥。封装在 `src/renderer/lib/uapi.ts`，使用内存缓存（天气 30 分钟，节假日 24 小时，语录/答案之书 5 分钟）。所有 UAPI 调用都应做好降级处理，以应对接口限流或不可用的情况。

**腾讯云 IM** — 聊天 SDK 封装在 `src/renderer/lib/tencent-im.ts`。UserSig 通过部署在广州的云函数（SCF）签发。身份与设备绑定（一台设备 = 一个聊天账号）。UserSig 每 6 小时自动续期。

## 设计系统

**颜色**（Tailwind 主题在 `tailwind.config.js`）：
- `brand`（焦橙色 `#c2410c`）— 主要按钮、链接
- `surface`（暖色中性色阶 `#faf8f5`–`#0f0e0d`）— 背景、文字
- `success` / `warning` / `danger` / `info` — 语义颜色，各有 `light`/DEFAULT/`dark`/`text` 变体

**字体：** Outfit（标题，通过 `font-display`）、Plus Jakarta Sans（正文，通过 `font-body`）。

**工具类：** `cn()` 辅助函数在 `src/renderer/lib/utils.ts`（clsx + tailwind-merge）。自定义阴影：`soft`、`card`、`card-hover`、`elevated`、`sidebar`。UI 基础组件在 `src/renderer/components/ui/`。

## 测试

`tests/run-ipc-contract-tests.js` — 验证 contract-utils 转换逻辑：错题记录序列化、记忆卡片契约、连续天数计算、待复习比较、成就进度、学习计划排序。通过 `npm test` 运行（先构建主进程，再运行测试文件）。

## 自动更新与发布

通过 `electron-updater` 发布到 GitHub Releases。开发模式下不会检查更新。发布流程：
1. 修改 `package.json` 中的 `version`，提交
2. `git tag vx.y.z && git push origin master && git push origin vx.y.z`
3. GitHub Actions（`.github/workflows/build.yml`）自动构建并创建 Release

产物：便携版 `.exe` + NSIS 安装包，在 `release/` 目录下。
