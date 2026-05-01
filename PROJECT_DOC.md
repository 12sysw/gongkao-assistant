# 公考小助手 - 项目维护文档

> 版本：v1.2.0 | 最后更新：2026-05-02

---

## 目录

1. [项目概述](#项目概述)
2. [技术架构](#技术架构)
3. [目录结构](#目录结构)
4. [开发环境搭建](#开发环境搭建)
5. [常用命令](#常用命令)
6. [功能模块说明](#功能模块说明)
7. [聊天室功能](#聊天室功能)
8. [自动更新功能](#自动更新功能)
9. [打包与发布](#打包与发布)
10. [数据存储](#数据存储)
11. [常见问题](#常见问题)

---

## 项目概述

公考小助手是一款基于 Electron 的桌面端公务员考试学习工具，集成了错题本、记忆卡片、思维导图、学习计划、番茄钟、聊天室等功能。

### 核心功能

| 功能 | 说明 |
|------|------|
| 仪表盘 | 学习数据统计、考试倒计时 |
| 错题本 | 错题收集管理，支持 OCR 图片识别 |
| 套题测评 | 模拟真实考试，AI 分析薄弱环节 |
| 记忆卡片 | 间隔重复算法，科学记忆 |
| 思维导图 | 知识点可视化整理 |
| 学习计划 | 目标管理与进度追踪 |
| 番茄钟 | 专注学习计时 |
| 打卡系统 | 连续学习天数统计 |
| AI 分析 | 接入多种 AI 服务商分析测评报告 |
| 聊天室 | 多人在线交流，支持文字/图片/文件/撤回 |
| 自动更新 | 检测新版本，后台下载，一键安装 |

---

## 技术架构

```
┌─────────────────────────────────────────────┐
│                  Electron                    │
│  ┌──────────────┐  ┌──────────────────────┐  │
│  │  主进程       │  │  渲染进程             │  │
│  │  (Node.js)   │  │  (Chromium)          │  │
│  │              │  │                      │  │
│  │  - 数据库    │  │  - React 18          │  │
│  │  - IPC 处理  │←→│  - Tailwind CSS      │  │
│  │  - 自动更新  │  │  - Zustand 状态管理   │  │
│  │  - 文件系统  │  │  - TanStack Query    │  │
│  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────┘
         ↕                    ↕
   better-sqlite3       腾讯云 IM SDK
   (本地数据库)          (聊天室)
```

### 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Electron | 33 | 桌面应用框架 |
| React | 18.3 | 前端 UI |
| TypeScript | 5.6 | 类型安全 |
| Vite | 6.0 | 构建工具 |
| better-sqlite3 | 12.9 | 本地数据库 |
| Drizzle ORM | 0.45 | 数据库 ORM |
| Zustand | 5.0 | 客户端状态管理 |
| TanStack Query | 5.99 | 服务端状态管理 |
| Tailwind CSS | 3.4 | 样式框架 |
| @tencentcloud/chat | 3.6 | 腾讯云 IM SDK |
| electron-updater | 6.8 | 自动更新 |
| tesseract.js | 7.0 | OCR 图片识别 |
| sonner | 2.0 | Toast 通知 |

---

## 目录结构

```
gongkao-assistant/
├── .github/
│   └── workflows/
│       └── build.yml          # GitHub Actions 自动打包
│
├── scf-usersig/               # 腾讯云 SCF 云函数
│   ├── index.js               # 云函数入口
│   ├── package.json           # 依赖
│   └── scf_bootstrap          # Web 函数启动脚本
│
├── src/
│   ├── main/                  # Electron 主进程
│   │   ├── db/                # 数据库（better-sqlite3 + Drizzle ORM）
│   │   │   ├── index.ts       # 数据库连接
│   │   │   ├── schema.ts      # 表结构定义
│   │   │   └── migrations.ts  # 数据库初始化
│   │   │
│   │   ├── ipc/               # 进程间通信
│   │   │   ├── index.ts       # IPC 处理器注册
│   │   │   └── contract-utils.ts # 数据转换工具
│   │   │
│   │   ├── main.ts            # 主进程入口
│   │   ├── preload.ts         # 安全桥接脚本
│   │   └── updater.ts         # 自动更新模块
│   │
│   ├── renderer/              # 前端页面
│   │   ├── components/        # 公共组件
│   │   │   ├── Sidebar.tsx    # 侧边栏导航
│   │   │   └── UpdateNotification.tsx # 更新提示
│   │   │
│   │   ├── hooks/             # 数据获取 Hooks
│   │   │   └── use-api.ts     # API 调用封装
│   │   │
│   │   ├── lib/               # 工具库
│   │   │   ├── tencent-im.ts  # 腾讯云 IM SDK 封装
│   │   │   └── utils.ts       # 通用工具函数
│   │   │
│   │   ├── pages/             # 功能页面
│   │   │   ├── Dashboard.tsx  # 仪表盘
│   │   │   ├── WrongBook.tsx  # 错题本
│   │   │   ├── Flashcards.tsx # 记忆卡片
│   │   │   ├── MindMap.tsx    # 思维导图
│   │   │   ├── StudyPlan.tsx  # 学习计划
│   │   │   ├── Pomodoro.tsx   # 番茄钟
│   │   │   ├── DailyCheckin.tsx # 打卡
│   │   │   ├── ChatRoom.tsx   # 聊天室
│   │   │   ├── Achievements.tsx # 成就
│   │   │   ├── Encourage.tsx  # 鼓励语录
│   │   │   ├── Settings.tsx   # 设置
│   │   │   └── MockExam.tsx   # 套题测评
│   │   │
│   │   ├── stores/            # Zustand 状态管理
│   │   │   └── chat-store.ts  # 聊天室状态
│   │   │
│   │   ├── App.tsx            # 路由配置
│   │   ├── main.tsx           # 渲染进程入口
│   │   └── vite-env.d.ts      # 类型声明
│   │
│   └── shared/                # 共享代码
│       └── ipc.ts             # IPC 通道定义 + Api 类型
│
├── dist/                      # 编译输出（自动生成）
├── release/                   # 打包输出（自动生成）
├── package.json               # 项目配置
├── tsconfig.json              # TypeScript 配置（渲染进程）
├── tsconfig.main.json         # TypeScript 配置（主进程）
├── vite.config.ts             # Vite 配置
├── tailwind.config.js         # Tailwind CSS 配置
└── PROJECT_DOC.md             # 本文档
```

---

## 开发环境搭建

### 前置要求

- Node.js 18+（推荐 22）
- Git
- Windows 10/11

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/12sysw/gongkao-assistant.git
cd gongkao-assistant

# 2. 安装依赖
npm install

# 3. 启动开发模式
npm run electron:dev
```

### 国内用户加速

```bash
npm config set registry https://registry.npmmirror.com
npm install
```

---

## 常用命令

| 命令 | 作用 |
|------|------|
| `npm run dev` | 只启动前端开发服务器 |
| `npm run build` | 构建前端代码 |
| `npm run build:main` | 构建主进程代码 |
| `npm run build:all` | 构建全部代码 |
| `npm run electron:dev` | 开发模式运行（推荐） |
| `npm run electron:build` | 构建安装包 |
| `npm run lint` | TypeScript 类型检查 |

---

## 功能模块说明

### IPC 通信架构

渲染进程通过 `window.api` 调用主进程功能：

```
渲染进程                    主进程
(window.api)               (ipcMain.handle)
    │                           │
    ├── api.question.add() ──→  IPC.QUESTION_ADD
    ├── api.wrongBook.getAll()→ IPC.WRONG_BOOK_GET_ALL
    ├── api.chat.generateUserSig() → IPC.CHAT_GENERATE_USER_SIG
    └── api.update.check() ──→ IPC.UPDATE_CHECK
```

所有 IPC 通道定义在 `src/shared/ipc.ts`。

### 数据库

使用 better-sqlite3 + Drizzle ORM，数据库文件位于：

```
Windows: C:\Users\<用户名>\AppData\Roaming\gongkao-assistant\gongkao.db
```

主要数据表：
- `questions` - 题目
- `wrong_records` - 错题记录
- `mind_maps` - 思维导图
- `study_plans` - 学习计划
- `daily_records` - 每日记录
- `achievements` - 成就
- `flashcards` - 记忆卡片
- `pomodoro_records` - 番茄钟记录
- `exam_config` - 考试配置
- `encourage_quotes` - 鼓励语录

---

## 聊天室功能

### 架构

```
客户端 (Electron)
  │
  ├── 腾讯云 IM SDK (@tencentcloud/chat)
  │     ├── 文字/图片/文件消息
  │     ├── 消息撤回
  │     └── 群组管理
  │
  └── 云函数 (SCF)
        └── 生成 UserSig（登录凭证）
```

### 预设频道

| 频道 ID | 名称 | 用途 |
|---------|------|------|
| gk001exchange | 行测交流 | 行测题目讨论 |
| gk002essay | 申论讨论 | 申论写作交流 |
| gk003interview | 面试经验 | 面试技巧分享 |
| gk004general | 综合闲聊 | 备考日常交流 |

### 关键文件

| 文件 | 作用 |
|------|------|
| `src/renderer/lib/tencent-im.ts` | IM SDK 封装（登录、发消息、撤回等） |
| `src/renderer/pages/ChatRoom.tsx` | 聊天室页面（登录、注册、消息列表） |
| `src/renderer/stores/chat-store.ts` | 聊天状态管理（Zustand） |
| `src/main/ipc/index.ts` | UserSig 云函数调用 |

### 云函数部署

代码位置：`scf-usersig/`

部署步骤：
1. 登录腾讯云 SCF 控制台
2. 新建事件函数，Node.js 18，入口 `index.main_handler`
3. 上传 `scf-usersig/` 目录（含 node_modules）
4. 配置环境变量：`SDK_APP_ID`、`SECRET_KEY`
5. 启用函数 URL（免鉴权）
6. 将公网 URL 填入 `src/main/ipc/index.ts`

### UserSig 自动续期

- 每 6 小时自动刷新 UserSig
- 防止 24 小时过期导致断线
- 代码在 `ChatRoom.tsx` 的 `refreshTimerRef`

---

## 自动更新功能

### 工作流程

```
发布新版本                    用户端
   │                           │
   ├── git tag v1.2.0          ├── 启动 5 秒后检查更新
   ├── git push --tags         ├── 发现新版本 → 弹窗提示
   ├── GitHub Actions 自动打包  ├── 点击下载 → 后台下载
   └── 发布到 GitHub Releases   └── 下载完成 → 点击安装 → 重启
```

### 相关文件

| 文件 | 作用 |
|------|------|
| `src/main/updater.ts` | 更新器核心（仅打包后启用） |
| `src/main/main.ts` | 启动时初始化更新器 |
| `src/main/ipc/index.ts` | 注册更新 IPC 处理器 |
| `src/main/preload.ts` | 暴露更新 API 给前端 |
| `src/renderer/components/UpdateNotification.tsx` | 更新提示 UI |
| `.github/workflows/build.yml` | GitHub Actions 自动打包 |

### 发布新版本

```bash
# 1. 修改 package.json 版本号
# 2. 提交
git add package.json
git commit -m "chore: bump version to x.y.z"

# 3. 打 tag 并推送
git tag vx.y.z
git push origin master
git push origin vx.y.z

# 4. GitHub Actions 自动打包发布
```

---

## 打包与发布

### 本地打包

```bash
npm run electron:build
```

产物在 `release/` 目录：
- `公考小助手 x.y.z.exe` - 便携版（免安装）
- `公考小助手 Setup x.y.z.exe` - 安装版

### GitHub Actions 自动打包

推送到 `v*` tag 后自动触发，流程：
1. Windows 环境安装依赖
2. 构建渲染进程和主进程
3. electron-builder 打包
4. 创建 GitHub Release 并上传 exe

---

## 数据存储

### 应用数据

```
C:\Users\<用户名>\AppData\Roaming\gongkao-assistant\
├── gongkao.db              # SQLite 数据库
├── gongkao.db-wal          # 数据库日志
├── ai_config.json          # AI 配置
└── mind_maps_fallback.json # 思维导图备份
```

### 数据导入导出

通过设置页面可以：
- **导出**：将所有数据导出为 JSON 文件
- **导入**：从 JSON 文件恢复数据（会覆盖现有数据）

### 备份建议

重装系统前备份 `AppData\Roaming\gongkao-assistant\` 目录。

---

## 常见问题

### Q: npm install 报错

```bash
npm config set registry https://registry.npmmirror.com
npm install
```

### Q: better-sqlite3 编译失败

```bash
npx electron-rebuild
npm run electron:build
```

### Q: 开发模式白屏

先编译主进程：
```bash
npm run build:main
npm run electron:dev
```

### Q: 聊天室连接失败

检查：
1. `.env` 文件中 `VITE_TENCENT_SDK_APP_ID` 是否正确
2. 云函数是否部署成功
3. 云函数 URL 是否填入 `src/main/ipc/index.ts`

### Q: 自动更新不工作

- 开发模式下不会检查更新（设计如此）
- 只有打包后的 exe 才会检查更新
- 需要推送到 GitHub Releases 才能触发

---

## 设计系统

主色调：warm burnt-orange + 温暖中性色阶

| Token | 用途 |
|-------|------|
| `brand-50`..`brand-900` | 主色调（按钮、链接） |
| `surface-0`..`surface-950` | 中性色（背景、文字） |
| `success` / `warning` / `danger` / `info` | 状态色 |

字体：Outfit（标题）+ Plus Jakarta Sans（正文）

---

**公考加油，上岸必胜！**
