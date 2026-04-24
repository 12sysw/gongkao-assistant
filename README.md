# 公考小助手

> 一款专为公务员考试备考设计的桌面端学习工具

## 功能一览

| 功能 | 说明 |
|------|------|
| 仪表盘 | 学习数据统计、考试倒计时 |
| 错题本 | 错题收集管理，支持OCR图片识别 |
| 套题测评 | 模拟真实考试，AI分析薄弱环节 |
| 记忆卡片 | 间隔重复算法，科学记忆 |
| 思维导图 | 知识点可视化整理 |
| 学习计划 | 目标管理与进度追踪 |
| 番茄钟 | 专注学习计时 |
| 打卡系统 | 连续学习天数统计 |
| AI分析 | 接入多种AI服务商分析测评报告 |

---

## 环境准备

### 1. 安装 Node.js

下载地址：https://nodejs.org/

建议版本：**Node.js 18.x 或更高**

安装完成后验证：

```bash
node -v    # 应显示 v18.x.x 或更高
npm -v     # 应显示 9.x.x 或更高
```

### 2. 安装 Git

下载地址：https://git-scm.com/download/win

安装时全部默认选项即可。

---

## 获取代码

### 方式一：git clone（推荐）

```bash
git clone https://github.com/12sysw/gongkao-assistant.git
cd gongkao-assistant
```

### 方式二：下载 ZIP

1. 打开 https://github.com/12sysw/gongkao-assistant
2. 点击绿色 **>> Code** 按钮
3. 选择 **Download ZIP**
4. 解压到任意目录
5. 进入解压后的文件夹

---

## 安装依赖

在项目根目录（包含 package.json 的文件夹）打开命令行，执行：

```bash
npm install
```

这一步会自动下载所有需要的依赖包，可能需要几分钟时间。

**国内用户如果下载慢**，可以先设置 npm 镜像：

```bash
npm config set registry https://registry.npmmirror.com
npm install
```

---

## 运行程序

### 开发模式（带热更新，改代码自动刷新）

```bash
npm run electron:dev
```

执行后会：
1. 启动 Vite 开发服务器
2. 自动打开 Electron 窗口
3. 修改代码保存后会自动刷新

### 构建生产版本

```bash
npm run electron:build
```

构建完成后，产物在 `release/` 目录：

```
release/
├── 公考小助手 1.1.0.exe          # 便携版（免安装，直接运行）
├── 公考小助手 Setup 1.1.0.exe    # 安装程序（推荐给用户）
└── win-unpacked/
    └── 公考小助手.exe            # 解压版（直接运行）
```

**免安装版**可以直接复制到别的电脑上运行，不需要安装。

### 只构建不打包

```bash
npm run build:all
```

这只会编译代码，不生成安装包，产物在 `dist/` 目录。

---

## 项目结构

```
gongkao-assistant/
├── src/
│   ├── main/              # Electron 主进程（Node.js 环境）
│   │   ├── db/            # 数据库（better-sqlite3 + Drizzle ORM）
│   │   ├── ipc/           # 进程间通信处理
│   │   ├── main.ts        # 主进程入口
│   │   └── preload.ts     # 安全桥接脚本
│   │
│   ├── renderer/          # 前端页面（浏览器环境）
│   │   ├── pages/         # 各个功能页面
│   │   ├── hooks/         # 数据获取 Hooks
│   │   ├── stores/        # Zustand 状态管理
│   │   ├── components/    # 公共组件
│   │   ├── App.tsx        # 路由配置
│   │   └── main.tsx       # 渲染进程入口
│   │
│   └── shared/            # 主进程和渲染进程共享的代码
│       └── ipc.ts         # IPC 通道定义
│
├── dist/                  # 编译输出（自动生成）
├── release/               # 打包输出（自动生成）
├── package.json           # 项目配置和依赖
└── README.md              # 本文档
```

---

## 常用命令

| 命令 | 作用 |
|------|------|
| `npm run dev` | 只启动前端开发服务器 |
| `npm run build` | 只构建前端代码 |
| `npm run build:main` | 只构建主进程代码 |
| `npm run build:all` | 构建前后端所有代码 |
| `npm run electron:dev` | 开发模式运行（推荐开发时用） |
| `npm run electron:build` | 构建安装包（推荐分发时用） |

---

## AI 配置

套题测评支持接入外部 AI 进行分析，配置步骤：

1. 打开应用，进入**>> 设置** 页面
2. 选择 AI 服务商（推荐：**硅基流动** 或 **DeepSeek**）
3. 填入从服务商官网获取的 API 密钥
4. 点击**>> 测试连接** 验证
5. 点击**>> 保存配置**

密钥只保存在本地，不会上传到任何服务器。

---

## 常见问题

### Q1: `npm install` 报错 / 卡住

**解决：** 设置国内镜像后重试

```bash
npm config set registry https://registry.npmmirror.com
npm install
```

### Q2: `npm run electron:build` 报错 "better-sqlite3" 找不到

**解决：** 这是正常的，electron-builder 会自动重新编译原生模块。如果还是失败：

```bash
npx electron-rebuild
npm run electron:build
```

### Q3: 开发模式下界面空白

**解决：** 先确保主进程已编译

```bash
npm run build:main
npm run electron:dev
```

### Q4: 如何更新到最新代码

```bash
cd gongkao-assistant
git pull origin master
npm install
npm run electron:build
```

### Q5: 数据保存在哪里

应用数据保存在用户目录：

```
C:\Users\<你的用户名>\AppData\Roaming\gongkao-assistant\
├── gongkao.db         # 数据库文件
└── gongkao.db-wal     # 数据库日志
```

重装系统前可以备份这个目录。

---

## 设计系统

v1.2 统一了全新的设计系统，采用 warm burnt-orange 主色调 + 温暖中性色阶：

| Token | 用途 | 示例 |
|-------|------|------|
| `brand-50`..`brand-900` | 主色调 | 按钮、链接、强调 |
| `surface-0`..`surface-950` | 中性色阶 | 背景、文字、边框 |
| `success` / `success-light` / `success-dark` | 成功状态 | 完成标记、打卡记录 |
| `warning` / `warning-light` / `warning-dark` | 警告状态 | 提醒、进度中间态 |
| `danger` / `danger-light` / `danger-dark` | 危险状态 | 错误、删除操作 |
| `info` / `info-light` / `info-dark` | 信息状态 | 提示、通知 |

字体：**Outfit**（标题）+ **Plus Jakarta Sans**（正文）

---

## 技术栈

| 技术 | 用途 |
|------|------|
| Electron 33 | 桌面应用框架 |
| React 18 | 前端 UI |
| TypeScript | 类型安全 |
| Vite 6 | 构建工具 |
| better-sqlite3 | 本地数据库 |
| Drizzle ORM | 数据库 ORM |
| TanStack Query | 服务端状态管理 |
| Zustand | 客户端状态管理 |
| Tailwind CSS v3 | 样式框架 |

---

## License

MIT

---

**公考加油，上岸必胜！** 🎯
