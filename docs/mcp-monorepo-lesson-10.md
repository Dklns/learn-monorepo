# 第 10 课（第二阶段·单元 1）：依赖治理——谁能 import 谁

日期：2026-09-20
前课：docs/mcp-monorepo-lesson-09.md
关联速查：docs/mcp-monorepo-cheatsheet.md
状态：单元 1 结课（2026-09-20）：预测、A 实验与排障、B 独立迁移、双规则复验与清理全部完成；下一单元任务编排（lesson-11）。

## 1. 问题背景：边界从"硬"变"软"了

多仓库时代，共享代码在另一个仓库里，物理隔离本身就是边界：A 想用 B 的代码，
只能走"发版 → 声明依赖 → 安装"这条正门。

Monorepo 把所有文件放进同一个仓库，**物理上全部可达**。边界没有消失，
但从"物理隔离"变成了"逻辑约定"：包名、依赖声明、目录规范。
约定没人强制执行时，就只剩自觉。本课要解决的问题：

> 怎么让机器在代码合并之前，就把越界引用拦下来？

## 2. 当前 workspace 的边界图

```text
期望的依赖方向（唯一合法方向）：

  apps/a ──┐
           ├──包名导入──→ packages/shared ──→ zod 等第三方
  apps/b ──┘

现实里没人拦的越界方式：

  apps/a/src/App.tsx
    import { formatPrice } from "../../packages/shared/src"   ← 相对路径绕过 exports
    import { xxx } from "../b/src/utils"                      ← 跨应用引用
```

两条越界路径的共同点：**构建工具和 TypeScript 都很可能放行**。
它们能把相对路径解析到文件，类型也对得上。代价在后面：

- 相对路径绕过 exports：消费者越过公共入口直连内部文件，shared 的 dist 构建被架空，
  公共 API 形同虚设；
- 跨应用引用：A 的构建产物里混进了 B 的代码，B 改一行，A 的线上行为可能跟着变——
  部署边界被悄悄打通，这正是第一阶段反复强调要分清的东西。

## 3. 预测题（只作答，先不执行命令）

1. 在 A 里写 `import { formatPrice } from "../../packages/shared/src"`，
   不经过包名、也不重建 shared，Vite 开发服务器和构建能不能跑通？
   （可以实际想：文件就在磁盘上，TS 类型也能解析到。）
2. 在 A 里写 `import { xxx } from "../b/src/utils"`，能跑吗？
   这个仓库里**现在**有什么东西会阻止你这么写？
3. 如果团队里五个人协作，靠什么机制才能保证越界引用在合并之前就被拦下，
   而不是靠 code review 时人眼发现？

预测错了也有价值：这三题对应的三种现象，动手时都会逐一验证。

## 4. 动手（预测提交并点评后再开始）

给 A 加 ESLint 边界检查（B 同理，先只做 A）：

1. 在 apps/a 安装开发依赖（含 TS 解析器：ESLint 核心解析器不认 TS/TSX 语法，缺它连文件都解析不了）：

   ```bash
   pnpm --filter @dklns/app-a add -D eslint eslint-plugin-import typescript-eslint
   ```

2. 在 apps/a 新建 `eslint.config.js`（flat config），核心两条规则：

   ```js
   import importPlugin from "eslint-plugin-import";
   import tseslint from "typescript-eslint";

   export default tseslint.config(
     {
       files: ["src/**/*.{ts,tsx}"],
       extends: [tseslint.configs.base],
       plugins: { import: importPlugin },
       rules: {
         "import/no-relative-packages": "error",
         "no-restricted-imports": [
           "error",
           { patterns: [{ group: ["../b/**", "../b/*"], message: "禁止跨应用引用" }] },
         ],
       },
     },
   );
   ```

3. 在 apps/a 的 package.json 加 `"lint": "eslint src"`；
4. 故意犯案：在 App.tsx 里临时加一条相对路径 import shared 的语句；
5. 运行 `pnpm --filter @dklns/app-a run lint`，记录是否报错、报什么错；
6. 删掉犯案代码，再跑一次 lint，确认干净。

## 5. 本课要点

- Monorepo 里物理可达 ≠ 应该可达；边界要靠"声明 + 工具强制"维持。
- `import/no-relative-packages` 把"必须走包名"变成机器检查；
  `no-restricted-imports` 处理插件规则覆盖不到的跨应用场景。
- 第二阶段后续单元（任务编排、CI）会把这些检查放进流水线，让它在合并前自动运行。

## 6. 提交内容

- 三道预测题的原始作答；
- lint 对犯案代码的实际报错输出（粘贴关键行）；
- 删掉犯案代码后 lint 通过的确认。

## 7. 预测题作答与点评（2026-09-20）

### 用户回答（原话）

1. “能跑通”
2. “能。没有”
3. “先要配置 eslint 然后配置提交钩子，提交钩子里执行 eslint 检查”

### 教师判定

- 题 1 正确。补充机制：Vite 直接解析磁盘文件并即时编译 TS，shared 的 dist 与 exports 被绕过；“能跑”≠“无代价”，产物入口和公共 API 失效。
- 题 2 正确。补充：相对路径完全不经过 node_modules，依赖声明管不到它；仓库里确实没有任何机制阻止。
- 题 3 方向正确（ESLint ＋ 提交钩子）。教师补充：本地钩子可被 --no-verify 绕过且只保护提交者本机，强制执行点是 CI（合并前自动运行），这正是单元 3 的主题。
- 记录性质：三题为预测，动手环节以实验验证题 1、2。

## 9. 犯案实验与故障排查（2026-09-20）

### 实验现象

- 用户未按“新增一行”而是将 App.tsx 的包名导入整体替换为相对路径 `../../../packages/shared/src`；首跑 lint 零报错。
- 教师本机复现（exit 0），并经 `--print-config` 确认规则已挂载、TS 解析器就位，排除配置层。
- 读插件源码定位根因：`no-relative-packages` 在 `resolve()` 解析失败时静默跳过；默认 Node 解析器不认 `.ts`，而目标目录只有 `index.ts`，故规则形同虚设。
- 修复：加装 `eslint-import-resolver-typescript` 并在 flat config 增加 `settings["import/resolver"]["typescript"]`；修复后 lint 报 1 error（Relative import from another package is not allowed...），用户恢复包名导入后干净通过。

### 教学要点

- “配置正确”与“检查生效”是两回事：规则挂载≠规则能触发，解析器是隐形前提。
- 报错自动建议（`@dklns\shared\src\src`）在 Windows 路径分隔符与目录导入场景下并不精准，但方向正确；规范写法以 exports 根入口 `@dklns/shared` 为准。
- 本课未验证：`no-restricted-imports` 拦截跨应用 `../b/**` 的分支（用户未犯此案）；留给 B 迁移练习时顺带验证。

### 课后练习

- 用户独立为 B 迁移相同配置（依赖、eslint.config.js、lint 脚本），并用跨应用 import 验证规则；完成后教师审查。

## 10. B 迁移审查与路径错误修正（2026-09-20）

### 审查结果

- B 的迁移配置（依赖、config、lint 脚本、settings）全部正确。
- 犯案验证：shared 源码相对路径被 `import/no-relative-packages` 拦下；但跨应用 import `../../a/src/App` 也由该规则报错，`no-restricted-imports` 未响。
- 教师发现并纠正自身错误：讲义及建议中的跨应用路径 `../b/src/utils`、`../a/src/App` 层级计算错误（自 apps/x/src 出发需 `../../` 才能到达兄弟应用），用户凭“无法寻址”质疑成立。
- 教师本机验证：pattern 加入 `../../a/**` 后，`no-restricted-imports` 对该路径报错生效。

### 教学要点

- 两条规则失效模式互补：解析型（no-relative-packages）对解析失败的路径静默跳过；匹配型（no-restricted-imports）只做字符串模式匹配，不关心路径是否存在。用户实验中 `../a/src/App`（不可达）仅被后者拦截，构成实证。
- pattern 按实际书写形式设计，覆盖正确写法 `../../a/**` 与笔误写法 `../a/**`。
- 用户以运行现象质疑教师断言并促成修正，记为独立的验证意识表现，予以肯定。

### 待用户完成

- pattern 修正后用 `../../a/src/App` 复验两条规则同时报错；随后清理犯案代码、恢复包名导入、lint 干净；单元 1 结课。

## 11. 单元 1 结课记录（2026-09-20）

- 用户完成 pattern 修正（group 含 `../../a/**` 与 `../a/**`），用真实可达路径复验：第 3 行双规则同时报错（no-restricted-imports 3:1 + no-relative-packages 3:20），两张独立网络的拦截均得到实证。
- 清理犯案代码、恢复包名导入后 lint 干净（exit 0），B 迁移完成。
- 单元 1 成果：依赖边界从约定变为机器检查；用户亲历“规则挂载但静默失效”→“解析器修复”→“双网互补”完整链条。
- 记录边界：lint 通过为本机实际运行结果，教师本机同样复现过；pre-commit 钩子与 CI 集成留待单元 3。

## 8. 证据边界

- ESLint 版本与 flat config 写法可能随版本变化；以用户实际安装版本为准，
  报错信息与预期不符时教师再排查，不预先断言配置一次通过。
- 本课只给 A 加检查；B 的配置作为课后迁移练习，用户独立完成，教师审查。
