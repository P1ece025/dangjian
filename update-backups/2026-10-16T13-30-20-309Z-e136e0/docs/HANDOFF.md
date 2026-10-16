# 开发交接说明

## 架构和执行顺序

网页先加载 `model.js`，再加载 `app.js`。`model.js` 将 API 暴露为 `globalThis.Qinghe`，同时支持 Node 的 `require()`，便于测试。

`app.js` 读取 localStorage；没有有效版本时调用 `Q.seed()`。页面由模板函数生成，统一通过 `render()` 更新，按钮使用 `data-action` 分发到 `actions`，表单使用全局 input/change 事件处理。

初始页面与字段保持原网页小样一致。新加的本地服务器和启动脚本只用于开发，不提供后台业务接口。

## 常改代码入口

| 需求 | 代码位置 |
| --- | --- |
| 改名称、导航、机构名 | `app.js` 的 `shell()`；`index.html` 的 title |
| 改主色、间距、响应式 | `styles.css` 的 `:root` 和媒体查询 |
| 替换学生与样本文本 | `model.js` 的 `seed()`、`createDoc()` |
| 改发展阶段、审核环节 | `model.js` 的 `STAGES`、`FLOW` |
| 改分阶段材料清单 | `model.js` 的 `required(stage)` |
| 加校验规则 | `model.js` 的 `analyze(student, rules)` |
| 改文档与问题并排展示 | `app.js` 的 `detail()`、`issueCard()` |
| 改反馈格式 | `app.js` 的 `feedbackText()` |
| 接入 OCR / 上传接口 | `app.js` 的 `uploadModal()`、`confirmUpload()` |
| 接入数据库 API | 替换 `state` 初始化、`persist()`、相关业务 actions |

## 主要数据结构

最外层状态为 `{ version, rules, students, logs }`，实际完整例子见 `data/demo-state.json`。

学生对象主要字段：

| 字段 | 类型与意义 |
| --- | --- |
| `id` | 稳定字符串 ID，如 DEMO-001 |
| `name`, `number` | 虚拟姓名、学号 |
| `college`, `branch` | 学院、党支部 |
| `stage` | 0—4，对应发展阶段 |
| `dates` | application、active、development、admitted、regularized；YYYY-MM-DD |
| `flow` | 0—4，对应自查、初审、交叉互查、复审、备案 |
| `status` | 待审核 / 需补正 / 待复核 / 材料已确认 |
| `checked` | 是否已运行辅助校验 |
| `docs` | 材料数组 |
| `overrides` | 以问题 ID 为键、人工核实说明为值的对象 |
| `feedback` | 已生成或编辑的整改草稿 |
| `revision` | 演示材料版本 |

材料对象：`{ id, type, title, date, signed, stamped, source, text }`。

- `type`：application、thought、cultivation、autobiography、volunteer、regularization。
- `signed` / `stamped`：true 为人工或样本字段已确认，false 为缺失，null 为待确认；并非真实图像识别结果。
- `source`：sample 为预置样本、registered 为仅登记文件、text 为 TXT 内容、manual 为人工校对。
- 文件上传当前只保存文本和元数据，不持久化二进制原件。

## 规则与反馈

`analyze()` 根据当前材料与规则即时产生问题数组，不调用外部 AI。问题含 `id / studentId / category / severity / title / detail / suggestion / docId / rule / handled / note`。

时间周期按日历月计算，月末取目标月份最后一天，闰年边界有测试。五阶段日期来自学生的结构化 `dates`；文档落款日期 `doc.date` 当前仅预览，不会自动抽取或回填到阶段时间线，也尚未做跨材料日期一致性校验。

`required()` 中的份数是演示设定，例如思想汇报为 2 份。替换时应使用学校提供的分阶段要求、适用范围与生效版本。

当前文本规则仅演示一个名称错字、空正文和模板占位检测。真实语义核查应返回证据片段、规则出处与可人工确认的建议，不能把模拟输出当作真实识别结果。

## 后续接入顺序

1. **确定规则**：把学校正式材料清单、规则版本、生效时间、例外情形整理成配置。
2. **上传与识别**：后台保存原件，OCR 返回页码、坐标、字段值和置信度；前端保留人工校对入口。
3. **规则引擎**：把确定性的日期、份数等校验放在服务端；文本语义核查附原文证据和来源。
4. **身份与流程**：接入真正的学生、支部、学院等账号权限，后台限制数据访问与状态流转。现有 `flow` 仅展示演示流程，不能当作完整审批引擎。
5. **记录与整改**：服务端保存原件版本、提取结果、修改差异、处理意见与通知记录。

原型后端接口可自行选择技术栈。初期可保持现在的界面，逐步把本地 actions 替换为 API 调用；无需为了对接数据先重写全部界面。

## 交付范围与验证

源码包不包含在线站点的 Git 历史、站点身份或部署配置，也不含任何凭据。它可以作为独立项目交给队友。

已有规则与状态检查不能代替浏览器验收。建议队友启动后验证 Chrome/Edge、移动端宽度、上传类型、导出、日期修正及多次刷新后的数据持久化。
