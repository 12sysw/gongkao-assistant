# 公考小助手

桌面端公务员考试学习工具，基于 Electron、React、TypeScript 和本地 SQLite 构建，适合日常刷题、错题整理、记忆巩固和复习节奏管理。

## 主要功能

- 仪表盘：学习概览、最近复习记录、推荐反馈
- 错题本：错题收集、分类、复习
- 统一复习：串联错题与记忆卡片，按天记录进度
- 记忆卡片：间隔重复记忆
- 学习计划：目标拆解与执行追踪
- 模拟测评：练习后生成分析结果
- 思维导图、番茄钟、打卡与成就系统

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
- React 18
- TypeScript 5
- Vite 6
- better-sqlite3 + Drizzle ORM
- Zustand + TanStack Query
- Tailwind CSS

## 数据位置

应用数据默认保存在：

`C:\Users\<用户名>\AppData\Roaming\gongkao-assistant\`

其中 `gongkao.db` 为主数据库文件。

## 项目文档

更完整的项目说明、架构和发布流程见 [PROJECT_DOC.md](./PROJECT_DOC.md)。
