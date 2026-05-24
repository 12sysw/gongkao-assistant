# 公考小助手

桌面端公务员考试学习工具，基于 Electron、React、TypeScript 和本地 SQLite 构建，集刷题、错题整理、记忆巩固、AI 辅导和复习节奏管理于一体。

## 主要功能

- **仪表盘**：学习概览、天气信息、每日语录、智能推荐
- **题库管理**：题目导入、分类、OCR 图片识别
- **错题本**：错题收集、分类、统一复习
- **记忆卡片**：间隔重复算法，科学记忆
- **知识图谱**：LLM 驱动的知识点提取与可视化（力导向布局、缩放平移、搜索高亮）
- **知识库**：RAG 向量检索，智能问答
- **申论 AI 批改**：流式反馈，逐段点评
- **套题测评**：模拟真实考试，AI 分析薄弱环节
- **思维导图**：知识点可视化整理
- **学习计划**：目标管理与进度追踪、法定假日标记
- **番茄钟**：专注学习计时
- **打卡系统**：连续学习天数统计
- **聊天室**：多人在线交流，支持文字/图片/文件
- **鼓励语录**：随机语录、答案之书，备考激励
- **自动更新**：检测新版本，后台下载，一键安装

## 快速开始

```bash
npm install
npm run electron:dev
```

开发模式会启动 Vite 和 Electron，并自动打开调试窗口。

## 常用命令

| 命令 | 作用 |
|------|------|
| `npm run electron:dev` | 开发模式运行 |
| `npm run build` | 构建渲染进程 |
| `npm run build:main` | 构建主进程 |
| `npm run build:all` | 构建主进程和渲染进程 |
| `npm run electron:build` | 生成 Windows 安装包和便携版 |
| `npm run lint` | TypeScript 校验 |
| `npm run test` | IPC 契约测试 |

## 技术栈

- Electron 33
- React 18 + TypeScript 5.6
- Vite 6
- better-sqlite3 + Drizzle ORM
- Zustand + TanStack Query
- Tailwind CSS
- ChromaDB（向量检索）
- 腾讯云 IM（聊天室）

## 数据位置

应用数据默认保存在：

`C:\Users\<用户名>\AppData\Roaming\gongkao-assistant\`

其中 `gongkao.db` 为主数据库文件。

## 项目文档

更完整的项目说明、架构和发布流程见 [PROJECT_DOC.md](./PROJECT_DOC.md)。
