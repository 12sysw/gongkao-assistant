# 第三方功能参考与许可边界

更新日期：2026-07-18

公考小助手不会复制第三方项目的题库、付费课程材料或受版权保护的解析文本。除下文明确标注的 MIT 许可快照外，其他项目仅用于产品流程、信息架构和开源实现方式的对标。

## human-skill-tree

- 项目：https://github.com/24kchengYe/human-skill-tree
- 当前仓库许可证：AGPL-3.0（以其仓库最新 LICENSE/README 为准）
- 本项目使用方式：仅借鉴“能力节点、前置关系、掌握状态可视化”的产品思路。
- 未使用内容：未复制其 Web App 源码、技能正文、样式代码或构建配置。
- 本项目重新实现：`civil-service-skill-tree.ts` 中的公考节点、题型关键词、建议用时和教师模式由公考小助手按自己的题库字段与公开公考方法体系重新编写。

## kaogong-study-tracker

- 项目：https://github.com/KaguraNanaga/kaogong-study-tracker
- 许可证：MIT，原版 `LICENSE` 与快照一同打包。
- 上游版本：`0.1.0`，Commit `cf9fafd3c607650f48470c0faced14a2d165cf39`。
- 原版快照：上游 Git 跟踪的 28 个文件完整放在 `src/main/skills/kaogong-study-tracker/`，不修改该目录内任何源码或素材。
- 完整性证据：`docs/KAOGONG_STUDY_TRACKER_SNAPSHOT.json` 记录全部 28 个文件的 SHA-256；`copy-skills.js` 会在复制前和复制到 `dist` 后各校验一次。
- 外置适配：Electron IPC 位于 `src/main/ipc/study-tracker.ts`，桌面页面位于 `src/renderer/pages/StudyTracker.tsx`，均在快照目录之外。
- 精简范围：桌面端只开放快速打卡、核心统计、每日总结和二刷提醒；不对外暴露 Excel 高级筛选、数据目录和源码链接等低频入口。上游快照本身仍完整保留。
- 数据位置：继续使用上游默认的 `~/.kaogong-study-tracker/data` 本地目录。

## 公考教学内容边界

- 行测讲解按“题型识别 → 思路 → 计算/推理 → 答案 → 易错点 → 同类迁移”输出。
- 资料分析、数量关系必须展示速算过程，不只给答案。
- 申论大作文只给立意、结构、分论点、素材方向和修改建议，不代写完整范文。
- 示例仅使用公开真题或自编数据，不收录付费课程原题、讲义或逐字稿。

## huasheng13-skill

- 项目：https://github.com/WangJunqing-coder/huasheng13-skill
- 当前仓库许可证：MIT（以其仓库 README 为准）。
- 接入内容：主 Skill 文档、20 份方法参考和 5 组练习文档随应用离线打包，用于可选的“花生十三名师模式”。
- 运行方式：根据用户问题与所选教学模式，在本地选择相关章节后加入 AI 上下文；不会执行第三方代码，也不会上传整个技能目录。
- 内容边界：不收录付费课程原题或讲义；大作文不代写全文；时政、法律变化和考试公告必须另行核验最新日期。
- 许可证文本：`src/main/skills/huasheng13/LICENSE-MIT.txt`。