# 第 6 课：最小实践，第 2 步——让共享包生成入口产物

日期：2026-09-20
状态：用户报告安装、构建和 A 的 Node 导入调用成功，并提供 12.30 输出；教师已读取对应 JS 与类型产物，进入 React 应用接入。
前课：docs/mcp-monorepo-lesson-05.md
关联画像：docs/mcp-monorepo-learning-profile.md
关联路线：docs/mcp-monorepo-learning-plan.md

## 1. 前一步的检查结果

重新读取保存文件后确认：

- pnpm-workspace.yaml 包含 packages/* 与 apps/*，顺序不影响本例。
- apps/a/package.json 和 apps/b/package.json 都在 dependencies 中声明 @learn/shared: workspace:*。
- shared 的 name 为 @learn/shared，exports 根入口指向 ./dist/index.js。

第 1 步通过配置文件审查。这是用户在反馈后完成的配置，不是无提示独立完成；也尚未执行安装来验证链接。

本轮另行列目录确认 shared 下目前只有 package.json 和 src/index.ts，没有 tsconfig.json 或 dist。下一步由用户补配置，不由教师代写工程文件。

## 2. 本步目标

```text
packages/shared/src/index.ts
              ↓ TypeScript 编译器 tsc
packages/shared/dist/index.js
packages/shared/dist/index.d.ts
```

已有 exports 读取 dist/index.js；我们让编译配置产生这个文件，而不是要求 exports 驱动编译。

index.d.ts 是类型声明，供 TypeScript 类型检查与编辑器使用，不是运行时代码。完整类型入口解析会在应用接入时验证，本步不展开复杂条件导出。

## 3. 任务 A：给共享包添加构建工具与脚本

编辑 packages/shared/package.json，保留已经正确的 name、type、exports 等字段，新增以下两个顶层字段：

```json
"scripts": {
  "build": "tsc -p tsconfig.json"
},
"devDependencies": {
  "typescript": "5.9.2"
}
```

这是待合并的字段片段，不是完整文件，注意前后逗号和 JSON 结构。

- 这里固定 TypeScript 5.9.2 作为练习版本，不声称它是最新版；当前未下载或验证完整构建。
- tsc 是 TypeScript 编译器命令；-p tsconfig.json 指定使用哪份项目配置。
- 以后在 shared 包上下文执行 build 脚本，其配置路径按包目录解析。
- shared 的构建直接使用 TypeScript，所以由 shared 声明编译器依赖；本练习用 devDependencies 表达开发／构建工具，不把 TypeScript 当作 formatPrice 的运行时依赖。
- 写入 devDependencies 不等于已安装，写入 scripts 也不等于已经构建。

## 4. 任务 B：创建 shared 的 tsconfig.json

新建 packages/shared/tsconfig.json，先使用以下基础配置：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "noEmitOnError": true
  },
  "include": ["src"]
}
```

然后由用户在 compilerOptions 中补上 rootDir 和 outDir 两个字段，使输入与输出对应本步目标。

- rootDir：源文件目录结构的根，用于计算输出相对路径；不是用来筛选输入文件的开关。
- outDir：编译产物的输出目录。
- include：本例用它选择 src 下的源文件。
- 这些路径相对于 packages/shared/tsconfig.json 所在目录，不是相对于仓库根目录。

其余固定项的作用：target 控制 JS 目标级别；NodeNext 按 Node 模块规则处理并配合 shared 的 type: module；strict 打开严格类型检查；declaration 生成 .d.ts；noEmitOnError 避免有编译错误时继续生成本次产物。

本轮重点只在输入、输出和入口对齐，不要求一次掌握所有 TypeScript 编译选项。

## 5. 完成标准

1. shared/package.json 保留原有信息并新增构建脚本和精确版本的编译器开发依赖。
2. shared/tsconfig.json 符合 TypeScript 的配置语法（支持注释与尾随逗号），rootDir、outDir 能使 src/index.ts 输出到 dist/index.js，且声明文件输出到对应位置。
3. 明白生成路径由 tsconfig 决定，exports 只指向产物。

完成后回复“配置写好了”，教师读取并检查以上两个文件。可附一句说明 rootDir 与 outDir 的选择。

不要手动创建 dist/index.js；不要把 TypeScript 源文件复制过去冒充编译；本轮先不执行 pnpm i 或 build。检查配置后再给出明确的安装、构建步骤。

## 6. 教学记录与待验证项

- 已完成：第 1 步配置审查通过，实际链接仍未验证。
- 当前任务：用户在给定基础项下补构建脚本、工具依赖与输入／输出目录，属于引导式实践。
- 用户本步首次提交：已读取，脚本和依赖声明正确；输出布局待修正，详见第 7 节。
- 后续：配置通过后安装并构建，观察实际产物；然后连接 React 应用。
- 本轮教师仅修改教学文档，不修改用户工程配置、不安装依赖、不执行构建或测试。

## 7. 第一次编译配置审查

用户提交：“配置写好了”。本轮重新读取 shared/package.json、shared/tsconfig.json 与 src/index.ts，未运行安装或编译。

### 已正确的部分

- shared 保留了 name、type: module 和 exports 根入口 ./dist/index.js。
- scripts.build 为 tsc -p tsconfig.json，devDependencies 声明 typescript: 5.9.2，符合本练习。
- target 写为 es2022 是 TypeScript 接受的大小写形式，无须因此修改。
- tsconfig 的其他给定选项已填入，include 为 src。
- tsconfig.json 允许注释和尾随逗号。用户在 include 数组后留了尾随逗号，不应按严格 JSON 规则误判为 TypeScript 配置错误；package.json 则应保持严格 JSON。

### 本轮需要修正：输出路径与入口不一致

读取到的配置：

```json
"rootDir": ".",
"outDir": "./dist/index"
```

对于本例的普通 .ts → .js 输出，可以这样计算：

```text
输出路径 = outDir + 源文件相对于 rootDir 的路径（改为 .js 扩展名）
```

按当前文件和配置，预计路径为：

```text
rootDir: packages/shared
源文件:  packages/shared/src/index.ts
相对路径: src/index.ts
outDir:  packages/shared/dist/index
预计产物: packages/shared/dist/index/src/index.js
```

注意这是根据配置推导的路径，不是已经执行编译后看到的产物。

outDir 是目录，不是输出文件名；即使目录最后一段叫 index，也不会因此把它当成 index.js 的文件名。

### 用户要修改的两项

在 compilerOptions 中改为：

```json
"rootDir": "./src",
"outDir": "./dist"
```

此时源文件相对于 rootDir 的路径是 index.ts，预计产物为 dist/index.js，类型声明为 dist/index.d.ts，与既有 exports 指向一致。

保留其他字段与 include，不修改 exports 来迁就错误的目录层级，不手动创建 dist 产物。rootDir 用于输出布局，include 在本例中负责选取源文件，两者职责不同。

### 教学判断与下一步

- 已观察到用户能按指导把构建工具、脚本及包入口写入正确位置。
- 需巩固的具体知识：rootDir 的相对路径计算，以及 outDir 是目录而非文件名。
- 教师只更新教学记录，不替用户修改工程配置。
- 等待用户修改并保存这两个字段后重读检查；本轮未安装依赖、运行编译或测试。

## 8. 第二次编译配置审查：通过

用户提交：“修好了”。重新读取文件确认：rootDir 为 ./src、outDir 为 ./dist，其他编译选项保留；shared 的构建脚本、TypeScript 5.9.2 开发依赖和 exports 仍正确。

结论：编译配置文件检查通过，预计产物路径与 exports 对齐。记录为在教师反馈后完成，不代表独立推导已经复测，也不代表实际构建成功。

## 9. 下一步：由用户执行安装、构建与消费验证

以下命令在 D:/code/learn-monorepo 仓库根目录执行，不是在 packages/shared 目录。教师本轮没有代为运行。

逐条执行，上一条成功后再执行下一条；任何一步报错就先停下，保留错误信息反馈，不盲目删除锁文件、清空缓存或使用强制选项。

### 第 1 条：安装

```bash
pnpm install
```

从 workspace 根目录安装各成员声明的依赖。此操作可能联网下载 TypeScript 等依赖，将建立本地包链接，生成或更新 node_modules 和 pnpm-lock.yaml。没有执行发布或全局工具安装。

本项目没有配置安装时自动构建 shared 的流程，因此不能把安装完成当作 dist 已生成。

### 第 2 条：构建共享包

```bash
pnpm --filter @learn/shared run build
```

--filter 按包名选择 shared，run build 在这个包的上下文执行 package.json 的构建脚本，即 tsc -p tsconfig.json。本条不构建 A、B，也不启动 React 页面。

预期生成（未验证）：

```text
packages/shared/dist/index.js
packages/shared/dist/index.d.ts
```

用户可打开这两个文件：JS 中原来的 TS 参数与返回类型应已去除；.d.ts 描述公开函数的类型而非执行实现。这是观察项，不要求修改产物。

### 第 3 条：从 A 的上下文消费共享包

```bash
pnpm --filter @learn/app-a exec node --input-type=module -e "import { formatPrice } from '@learn/shared'; console.log(formatPrice(12.3));"
```

--filter 选择 A，exec 在 A 的包上下文启动 Node；--input-type=module 让 -e 中的代码按 ES 模块处理。该方式可以在添加 React 页面前验证 A 的真实依赖解析、shared 的入口映射及命名导出，不是直接用相对路径绕过包配置。

预期打印：

```text
12.30
```

这是预期，不是本轮已经观测到的结果。也不代表 React 应用已创建、类型声明接入已验证，或 B 的独立消费已经验证。

## 10. 本轮反馈要求与记录

- 用户执行后，报告三条命令是否成功，并贴出最后一条的输出；若中途失败，贴出那一步的错误即可。
- 后续教师会通过 MCP 检查实际产物和链接相关文件，不把用户报告与工具实际观测混为同一证据。
- 本轮已完成：修正后的编译配置静态审查。
- 本轮待完成：用户执行安装、构建和 A 消费验证。
- 教师本轮仅更新文档与任务状态，没有安装依赖、运行构建、启动服务或修改用户代码。

## 11. 执行结果与产物核对

用户贴出的命令：

```bash
pnpm --filter @learn/app-a exec node --input-type=module -e "import { formatPrice } from '@learn/shared'; console.log(formatPrice(12.3));"
```

用户贴出的输出：12.30。用户同时报告“成功了”。

教师随后通过 MCP 实际读取到 packages/shared/dist/index.js 和 packages/shared/dist/index.d.ts：JS 包含去除类型标注后的 formatPrice 实现，声明文件包含参数 number、返回 string 的签名。

证据区分：用户报告了调用成功并给出输出；教师核实了实际产物，但没有重跑该命令或追溯每条安装日志。可记录为本练习的构建与 A 包消费链路已在引导下跑通，不代表 B 或 React 浏览器页面已验证。

下一步见 docs/mcp-monorepo-lesson-07.md：教师准备两个 React 页面基础文件，用户通过包名接入 shared。新增的 React/Vite 依赖仍需用户安装，不能沿用上一步的成功结论声称已安装。
