# 第 5 课：最小实践，第 1 步——连接三个本地包

日期：2026-09-20
状态：第三次提交已审查，本步成员规则与本地依赖声明通过配置文件检查；尚未运行安装或验证链接。
前课：docs/mcp-monorepo-lesson-04.md
关联画像：docs/mcp-monorepo-learning-profile.md
关联路线：docs/mcp-monorepo-learning-plan.md

## 1. 本轮为什么只做这一小步

用户说“明白了，下一步吧”。记录为对构建配置和 exports 区别的理解确认，不当作独立配置或排错能力已通过验证。

此前提供的实操分工选择被跳过，用户再次要求继续。本轮采用可调整的默认方式：教师准备基础文件，用户补关键配置；不记录为用户明确选择过该选项。

最终仍然是两个 React 应用＋一个共享 TS 包。当前只准备它们的包身份与共享函数，还没有 React 页面、依赖、构建配置或开发服务器；分步完成，不声称骨架已经可运行。

## 2. 实际环境记录

通过 MCP 在远端 Windows 工作区执行只读版本检查：

- 工作区：D:/code/learn-monorepo。
- Node：v24.19.0。
- pnpm：10.11.0。
- 检查时目录只有 docs 下的学习文档。
- 检查 pnpm 版本时禁用了 Corepack 的网络下载；没有执行安装、构建或测试。

本轮随后在该工作区新建基础文件和教学文档。版本存在不等于已验证后续所有依赖兼容性；引入 React/构建工具前另行选择兼容版本。

## 3. 已准备的文件

```text
仓库根目录
├── .gitignore
├── package.json               根级身份、private 和已检查的 pnpm 版本
├── pnpm-workspace.yaml        暂为 packages: []，由你补成员规则
├── apps/
│   ├── a/package.json         @dklns/app-a；dependencies 暂为空
│   └── b/package.json         @dklns/app-b；dependencies 暂为空
└── packages/
    └── shared/
        ├── package.json      @dklns/shared；尚未配置入口或构建
        └── src/index.ts      示例 formatPrice 函数
```

packageManager 指定 pnpm@10.11.0，用于标明本练习选用的工具版本；不代表执行过安装。root 的 private 防止误发布，不代替成员包的身份和依赖声明。

空的 packages 列表和 dependencies 对象是明确的练习起点，不是配置完成。不要在完成检查前直接安装。

## 4. 你的任务：只改三个文件

### A. 根目录 pnpm-workspace.yaml

将 apps 下的两个应用、packages 下的共享包纳入 workspace。使用 glob 成员路径规则，注意 packages 的复数拼写。

### B. apps/a/package.json

在 dependencies 中声明对共享包的依赖，要求必须使用本 workspace 中的本地包，找不到就报错，不允许回退到远程同名包。

### C. apps/b/package.json

B 也要使用同一个共享包。在 B 自己的 dependencies 中补上相应声明，不依赖根 package.json 或 A 代为声明。

本步不添加 React、zod 或 TypeScript 编译器依赖，不配置 exports，也不执行 pnpm i。后续会按步骤补齐。

## 5. 完成标准与反馈方式

- 三个子包的目录都被成员规则涵盖。
- A、B 的依赖键与共享包的 name 一致。
- 依赖值明确要求 workspace 本地包。
- JSON/YAML 结构正确，保留已有字段。

完成后告诉教师“写好了”，教师将通过 MCP 重新读取这三个文件及 shared/package.json，逐项检查。不以教师预先写好的配置作为用户掌握的证据。

建议附上一句话：说明工作区路径规则、包名和本地依赖协议分别解决什么问题。可参考前课讲义，不要求背诵。

## 6. 后续步骤（本轮尚未执行）

1. 反馈这三处配置，必要时让用户自己修正。
2. 配置 shared 的编译输出和包入口，巩固“构建配置与 exports 独立但应一致”。
3. 为 A、B 添加最小 React 页面与兼容的依赖，确认具体安装操作后运行。
4. 观察两个应用使用共享函数的结果，并用入口缺失／缺少导出的实际状态复核排错理解。

## 7. 教学记录

- 用户理解确认：“明白了，下一步吧”。
- 当前证据：教师基础文件已完成，用户首次提交已审查；消费包名正确，成员列表和协议书写待修正。详见第 8 节，暂不标为独立搭建完成。
- 正在练习：workspace 成员识别、包名引用和直接依赖归属。
- 本轮没有修改现有业务代码，没有下载依赖、执行构建、启动服务或运行测试。

## 8. 第一次文件审查

用户提交：“写好了”。以下依据 MCP 本轮实际读取到的已保存文件，不假设编辑器未保存内容与磁盘一致。没有执行安装或构建。

| 文件 | 读取到的内容 | 反馈 |
| --- | --- | --- |
| pnpm-workspace.yaml | packages: [] | 列表仍为空，尚未涵盖三个子包；如果用户在编辑器里已改，需确认保存 |
| apps/a/package.json | @dklns/shared: "workspace: ." | 包名正确；本任务应使用 workspace:*。点号不表示任意本地版本，不应把 exports 中的根入口点号套到依赖协议上 |
| apps/b/package.json | @dklns/shared: "workspace: *" | 方向正确；统一写成规范的 workspace:*，去掉冒号后空格，不依赖工具对范围字符串的容错。本轮未实测，不断言这个空格本身必然导致安装失败 |
| packages/shared/package.json | exports 的根入口映射到 ./dist/index.js | 提前写出的入口映射形式合理，可以保留；尚未配置并执行构建，不能把入口声明当成产物已经存在或应用已可运行 |

### 请用户自行修改并保存

pnpm-workspace.yaml 应涵盖：

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

A 和 B 的 package.json 中，保留其他字段，把共享依赖统一为：

```json
"dependencies": {
  "@dklns/shared": "workspace:*"
}
```

三处星号所处语境不同：apps/*、packages/* 中是匹配成员目录的 glob；workspace:* 中表示本地包版本要求不额外限定具体范围。exports 中的点号 . 则指包根公开入口，不能跨字段套用含义。

### 教学判断与下一步

- 已有实物证据：用户在两个消费包中分别声明了正确的共享包名，并新增了合理形式的根入口映射。
- 当前缺口：空成员列表尚未补齐；依赖协议精确书写需要纠正。文字题中的概念判断和实际配置完成度分别记录，不据此否定已确认的概念理解。
- 本步尚未通过，等待用户自行修改并保存后回复“改好了”，再重新读取三处配置。
- 教师本轮只更新教学记录，不改用户配置，也不删除用户提前添加的 exports。
- 本轮没有安装依赖、执行构建或运行测试。

## 9. 第二次文件审查

用户提交：“改好了”。重新读取保存文件后的结果：

- pnpm-workspace.yaml 已包含 packages/* 和 apps/*，两个规则的先后顺序不影响本例的成员匹配。本项静态检查通过。
- A 已把原来的点号改为星号，A、B 当前都写为 "@dklns/shared": "workspace: *"，包名与本地协议方向正确。
- 尚待统一的小细节：将两个文件中字符串值内部的空格删除，写为 "@dklns/shared": "workspace:*"。依赖键后、值引号前的 JSON 排版空格可以保留；引号内的空格属于字符串内容，普通 JSON 格式化不会自动删除它。
- 本轮没有运行 pnpm，仍不把该空格断言为已验证的安装失败；本练习统一使用明确、规范的协议写法。
- 教师未修改用户工程配置，只记录检查结果。请用户保存两处修改后再次提交；暂不安装依赖。
- 已确认的进展：workspace 成员路径规则已落到真实文件；不因剩余空格问题重新评定用户整体能力。

## 10. 第三次文件审查：配置检查通过

用户提交：“改好了”。本轮重新读取保存文件确认：

- pnpm-workspace.yaml 中 packages/* 与 apps/* 正确涵盖三个子包。
- A、B 均声明 "@dklns/shared": "workspace:*"，和 shared 的 name 对应。
- shared 已有 exports 根入口 ./dist/index.js，可保留进入下一步。
- 结论：第 1 步配置审查通过。这是用户在教师反馈后完成的实践，不能表述为无提示独立搭建。
- 尚未执行 pnpm 安装，因此不声称链接、模块解析或应用运行已经成功。
- 下一步：docs/mcp-monorepo-lesson-06.md，由用户补 shared 构建脚本、编译器开发依赖及 tsconfig 输入／输出目录，使声明的入口有对应产物。
- 教师本轮未修改用户工程配置，没有安装依赖、执行构建或测试。
