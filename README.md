# 公考小助手

一款专为公务员考试备考设计的桌面端学习工具，帮助考生高效复习、智能分析薄弱环节。

## 功能特性

- 📊 **仪表盘** - 学习数据可视化，考试倒计时提醒
- 📝 **错题本** - 错题收集与管理，支持OCR图片识别
- 🎯 **套题测评** - 模拟真实考试，AI智能分析薄弱环节
- 🃏 **记忆卡片** - 科学记忆复习，间隔重复算法
- 🧠 **思维导图** - 知识点可视化整理
- 📅 **学习计划** - 目标管理，进度追踪
- ⏰ **番茄钟** - 专注学习，时间管理
- 🏆 **成就系统** - 学习激励，持续动力
- ⚙️ **AI配置** - 支持多种AI服务商（硅基流动、DeepSeek、智谱AI等）

## 技术架构

本项目采用现代化技术栈：

| 技术 | 说明 |
|------|------|
| Electron 33 | 跨平台桌面应用框架 |
| React 18 | 前端UI框架 |
| TypeScript | 类型安全 |
| Vite 6 | 快速构建工具 |
| better-sqlite3 | 原生SQLite数据库（持久化存储） |
| Drizzle ORM | 类型安全的数据库ORM |
| TanStack Query | 服务端状态管理，自动缓存刷新 |
| Zustand | 轻量级客户端状态管理 |
| Tailwind CSS | 原子化CSS框架 |

## 环境要求

- Node.js >= 18.x
- npm >= 9.x
- Windows 10/11（当前仅支持Windows）

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/12sysw/gongkao-assistant.git
cd gongkao-assistant
```

### 2. 安装依赖

```bash
npm install
```

### 3. 开发模式运行

```bash
npm run electron:dev
```

这将同时启动：
- Vite开发服务器（http://localhost:5173）
- Electron应用窗口

### 4. 构建生产版本

```bash
# 构建所有组件
npm run build:all

# 或一步完成打包
npm run electron:build
```

构建产物位于 `release/` 目录：
- `公考小助手 Setup 1.1.0.exe` - 安装程序
- `win-unpacked/公考小助手.exe` - 免安装版本

## 项目结构

```
gongkao-assistant/
├── src/
│   ├── main/                 # Electron主进程
│   │   ├── db/               # 数据库层（Drizzle ORM + better-sqlite3）
│   │   │   ├── schema.ts     # 数据库表定义
│   │   │   ├── index.ts      # 数据库连接
│   │   │   └igrations.ts    # 初始化和迁移
│   │   ├── ipc/              # IPC通信处理
│   │   │   └── index.ts      # 所有IPC处理器
│   │   ├── main.ts           # 主进程入口
│   │   └── preload.ts        # 预加载脚本（暴露API到渲染进程）
│   │
│   ├── renderer/             # React渲染进程
│   │   ├── components/       # 通用组件
│   │   │   └── Sidebar.tsx   # 侧边栏导航
│   │   ├── hooks/            # 自定义Hooks
│   │   │   └── use-api.ts    # TanStack Query数据获取hooks
│   │   ├── lib/              # 工具函数
│   │   │   └── utils.ts      # 通用工具
│   │   ├── pages/            # 页面组件
│   │   │   ├── Dashboard.tsx # 仪表盘
│   │   │   ├── WrongBook.tsx # 错题本
│   │   │   ├── MockExam.tsx  # 套题测评
│   │   │   ├── Flashcards.tsx# 记忆卡片
│   │   │   └── ...
│   │   ├── stores/           # Zustand状态管理
│   │   │   └── app-store.ts  # 全局状态
│   │   ├── styles/           # 样式文件
│   │   ├── App.tsx           # 应用根组件
│   │   └── main.tsx          # 渲染进程入口
│   │
│   └── shared/               # 主进程与渲染进程共享
│       └── ipc.ts            # IPC通道定义和类型
│
├── dist/                     # 构建输出
│   ├── main/                 # 主进程编译产物
│   └── renderer/             # 渲染进程编译产物
│
├── release/                  # 打包输出
│   ├── 公考小助手 Setup 1.1.0.exe  # 安装程序
│   └── win-unpacked/         # 免安装版本
│
├── package.json              # 项目配置
├── vite.config.ts            # Vite配置
├── tailwind.config.js        # Tailwind配置
├── tsconfig.json             # TypeScript配置（渲染进程）
└── tsconfig.main.json        # TypeScript配置（主进程）
```

## 数据存储

应用数据存储在用户目录：

```
Windows: C:\Users\<用户名>\AppData\Roaming\gongkao-assistant\
├── gongkao.db         # SQLite数据库文件（持久化）
├── gongkao.db-wal     # WAL日志文件
└── gongkao.db-shm     # 共享内存文件
```

## AI配置说明

套题测评的AI分析功能需要配置AI接口：

1. 进入 **设置** 页面
2. 选择服务商（推荐：硅基流动、DeepSeek）
3. 输入API密钥
4. 测试连接
5. 保存配置

支持的AI服务商：
- 硅基流动 (https://api.siliconflow.cn)
- DeepSeek (https://api.deepseek.com)
- OpenAI (https://api.openai.com)
- 智谱AI (https://open.bigmodel.cn)
- 月之暗面 (https://api.moonshot.cn)
- 自定义API地址

## 开发指南

### 添加新页面

1. 在 `src/renderer/pages/` 创建新组件
2. 在 `src/renderer/App.tsx` 添加路由
3. 在 `src/renderer/components/Sidebar.tsx` 添加导航项

### 添加新数据表

1. 在 `src/main/db/schema.ts` 定义表结构
2. 在 `src/main/db/migrations.ts` 添加建表语句
3. 在 `src/main/ipc/index.ts` 添加IPC处理器
4. 在 `src/shared/ipc.ts` 添加通道定义
5. 在 `src/main/preload.ts` 暴露API
6. 在 `src/renderer/hooks/use-api.ts` 添加React Query hooks

### IPC通信示例

```typescript
// 主进程 (ipc/index.ts)
ipcMain.handle('my-channel', (_, data) => {
  // 处理逻辑
  return result;
});

// 预加载脚本 (preload.ts)
myModule: {
  myMethod: (data) => ipcRenderer.invoke('my-channel', data)
}

// 渲染进程 (hooks/use-api.ts)
export function useMyData() {
  return useQuery({
    queryKey: ['myData'],
    queryFn: () => api.myModule.myMethod()
  });
}
```

## 常见问题

### Q: 构建时报错 "Cannot find module 'better-sqlite3'"

better-sqlite3 是原生模块，需要重新编译：

```bash
npm run electron:build
```

electron-builder 会自动执行 `@electron/rebuild`。

### Q: 开发模式下数据库操作失败

确保主进程已正确加载：

```bash
# 先构建主进程
npm run build:main

# 再运行开发模式
npm run electron:dev
```

### Q: 推送到GitHub失败

检查网络连接，或使用SSH：

```bash
git remote set-url origin git@github.com:12sysw/gongkao-assistant.git
git push origin master
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

---

**公考加油，上岸必胜！** 🎯