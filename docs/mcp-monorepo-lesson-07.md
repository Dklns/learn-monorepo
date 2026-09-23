# 第 7 课：两个 React 应用使用同一个共享包

日期：2026-09-20
状态：用户完成两个页面的 shared 接入，报告构建与页面显示符合预期；教师已实际读取两个 App.tsx 核对导入方式。
前课：docs/mcp-monorepo-lesson-06.md
关联画像：docs/mcp-monorepo-learning-profile.md
关联路线：docs/mcp-monorepo-learning-plan.md

## 1. 前一步的证据

用户提供从 @dklns/app-a 上下文执行 Node 导入 @dklns/shared 的命令和输出 12.30，并报告“成功了”。

教师随后通过 MCP 读取到：

- shared/dist/index.js 实际存在，包含 formatPrice 的 JS 实现，参数及返回值类型标注已经去除。
- shared/dist/index.d.ts 实际存在，声明 formatPrice(amount: number): string。
- shared 的源码与 exports 映射保留正确。

记录为：用户报告包导入调用成功，教师实际观察到符合配置的产物。教师没有重跑用户命令；尚未验证 B、React 页面或两个应用的生产构建。实际执行是引导下完成，不冒充无提示独立排错。

## 2. 本轮分工

教师准备 HTML、React 启动文件、简单页面样式、应用 tsconfig、脚本和第三方依赖声明；保留用户已正确写入的 @dklns/shared: workspace:*。

用户负责把两个 App.tsx 接到共享函数，不把 formatPrice 实现复制进应用，也不从相对路径穿越到 packages/shared/src。

目标链路：

```text
React 应用 A ── 包名导入 ──┐
                          ├── @dklns/shared → dist/index.js
React 应用 B ── 包名导入 ──┘
```

当前共享包仍采用先构建产物再消费的策略。页面接入成功不等于共享源码会自动编译；本轮还没有共享包监听或构建任务编排。

## 3. 新增基础文件

每个应用都有：

```text
apps/a/ 或 apps/b/
├── package.json
├── tsconfig.json
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx        ← 用户本轮编辑此文件
    └── styles.css
```

A 的 amount 为 12.3，B 的 amount 为 99.9；displayPrice 暂时是“待接入 shared”的提示文字。基础页面不会因为这个占位内容报错，但显示占位文字不算完成共享包接入。

本轮没有抽离 UI 和样式包，也没有加入 React 额外插件或任务编排工具；先把共享纯函数的链路跑通。

## 4. 第三方依赖与构建说明

本轮通过 npm registry 元数据确认并固定以下版本，不使用浮动 latest 写入工程：

| 依赖 | 版本 | 所属位置 |
| --- | --- | --- |
| react | 19.3.0 | A、B 各自的 dependencies |
| react-dom | 19.3.0 | A、B 各自的 dependencies |
| vite | 8.3.0 | A、B 各自的 devDependencies |
| @types/react | 19.3.0 | A、B 各自的 devDependencies |
| @types/react-dom | 19.3.0 | A、B 各自的 devDependencies |
| typescript | 5.9.2 | A、B 各自的 devDependencies，与 shared 使用版本一致 |

元数据来源为 registry.npmjs.org 对应包的版本信息。已检查 react-dom 的 React peer 范围匹配；Vite 声明 Node ^20.19.0 或 >=22.12.0，当前已观察到的 Node v24.19.0 满足该范围。这只是声明层面的兼容性检查，不是已成功安装或运行的证明。

React 应用的 tsconfig 使用 Bundler 模块解析、react-jsx 和 noEmit，交由 Vite 生成应用产物；shared 使用 NodeNext、tsc 输出 JS。两种配置分工不同，不需要为了“统一”强行写成完全一样。

应用的 build 脚本是 tsc --noEmit && vite build：先检查类型，再打包。dev 脚本只负责启动开发服务，不等同于生产构建或发布。

## 5. 用户任务：修改两个 App.tsx

1. 在 apps/a/src/App.tsx 中，通过包名 @dklns/shared 导入 formatPrice。
2. 将 displayPrice 的占位文字替换为调用 formatPrice(amount) 得到的结果。
3. 对 apps/b/src/App.tsx 做同样的接入，保留 B 自己的 amount。

不修改共享函数实现，不把 toFixed 逻辑复制到应用。目标是两个应用消费同一份公共实现。

## 6. 接入后的执行步骤

以下命令都从 D:/code/learn-monorepo 根目录执行。逐条成功后再继续；遇到错误先反馈，不强制清缓存或忽略错误。

### 安装新增依赖

```bash
pnpm install
```

会根据新的应用依赖声明下载依赖并更新锁文件。教师本轮只改了声明，没有执行该安装。

### 先确保共享包产物存在，再检查并构建两个应用

```bash
pnpm --filter @dklns/shared run build
pnpm --filter "@dklns/app-*" run build
```

第二条用包名模式匹配 A、B，执行两者的类型检查与 Vite 构建；不把同名目录等同于包名选择。若失败，停下反馈对应错误。

### 两个终端分别启动开发页面

终端一：

```bash
pnpm --filter @dklns/app-a run dev
```

终端二：

```bash
pnpm --filter @dklns/app-b run dev
```

在运行这些命令的同一台电脑的浏览器中打开：

- A：http://localhost:5173
- B：http://localhost:5174

开发服务使用 Vite 默认的本机监听，不是 Arena 沙箱的预览服务；无需公开到外网。脚本使用 strictPort，如果端口占用将报错而不是悄悄换端口，届时反馈具体错误。

## 7. 结果与核对记录

用户反馈：构建成功，两个页面显示的数字符合预期。

教师随后实际读取两个 App.tsx，核对结果如下：

| 检查点 | A | B |
| --- | --- | --- |
| 导入语句 | `import { formatPrice } from "@dklns/shared";` | 同左 |
| 调用方式 | `const displayPrice = formatPrice(amount);` | 同左 |
| 输入值 | 12.3 | 99.9 |
| 页面显示（用户报告） | 12.30 | 99.90 |

- 两个文件都通过包名导入，没有使用相对路径或跨目录引用 shared 源码。
- 没有复制共享函数实现，显示值来自函数调用结果。
- 结论：包名接入方式已按实际文件核对通过，与页面显示互相印证。

证据边界：构建成功与浏览器显示是用户报告，教师没有重跑构建、没有启动开发服务器、也没有亲自查看浏览器画面。页面基础样板由教师提供，因此仍属引导式完成。

## 8. 教学记录

- shared 的生成产物已经实际读取；A 的 Node 消费成功有用户提供的命令输出。
- React 基础文件由教师准备，不计为用户独立搭建能力。
- 用户本轮完成两个 App.tsx 的包名导入与函数调用；教师实际读取文件核对通过，未改动用户代码。
- 用户报告构建成功、两个页面显示 12.30 与 99.90；教师未重跑构建、未启动开发服务器、未查看浏览器。
- 本轮没有代替用户下载新增依赖、执行构建、启动服务器或部署。
- 第一阶段尚未完成：架构取舍复述、共享改动的影响范围与完整变更链路仍待检验，下一步见 docs/mcp-monorepo-lesson-08.md。
