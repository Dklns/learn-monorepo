# Monorepo 速查图 v2（第一、二阶段总结）

日期：2026-09-21（v1：2026-09-20）
依据：docs/mcp-monorepo-lesson-01.md 至 docs/mcp-monorepo-lesson-14.md 及其实验记录
用途：日常查阅；不是教程，每条背后都有课程证据，细节回看对应讲义。
v2 新增：第 8–12 节（依赖治理、任务编排、Turborepo 缓存、CI、第二阶段易错点）。

## 1. 一张图：两种布局

```text
多仓库                         Monorepo（pnpm workspace）
共享仓库 ──v1.2──→ 应用 A 仓库      一个 Git 仓库
        └─v1.2──→ 应用 B 仓库      ├── apps/a     ─┐
                                   ├── apps/b     ─┼─→ packages/shared
修复共享 → 发版/打 tag →           └── packages/shared
  消费方改版本号 → 重装 → 验证       改 shared → 重建 → 验证 A、B → 合入（同一次提交）
```

- 同仓 ≠ 同应用、同版本、同部署；A、B 依旧分别构建、分别部署。
- workspace 链接只是"本地代替远程"，不取消版本、构建、部署边界。
- Monorepo 是仓库组织方式的决策，不是新工具或脚手架。分三层看：①决策本身（放一个仓还是多个仓）；②机制（pnpm-workspace.yaml、workspace:*，现有工具的既有功能）；③规模工具（Turborepo/Nx，仓库大到痛了才需要）。讨论"该不该用 monorepo"时先分清在说哪一层。

## 2. 三件套各管什么

| 文件 | 职责 | 常见错误 |
| --- | --- | --- |
| pnpm-workspace.yaml | 声明哪些目录是成员（如 `apps/*`、`packages/*`） | 路径写错（package/* vs packages/*）导致成员匹配不到 |
| 各包 package.json 的 name | 包的身份；依赖键写的是它，与目录名无关 | 目录改名后误以为要改依赖键 |
| 消费方 dependencies 的 `workspace:*` | 指定"在本 workspace 内解析"；找不到成员报错，不回退远程 | 混淆"产物内容变化"（不需重装）与"依赖声明变化"（才需重装） |

## 3. 依赖归属

- 谁直接 import，谁声明：A 用 shared → A 声明 shared；shared 用 zod → zod 写在 shared。
- B 直接 import zod → B 自己声明，哪怕 shared 已经声明过。
- zod 之于 A 是传递依赖：不声明 ≠ 不受其变更影响。

## 4. 包的入口与产物（因果方向）

```text
tsconfig（rootDir/outDir）决定 产物文件在哪 → package.json 的 exports 指向产物 → 消费者据此解析
```

- 普通 tsc 不会根据 exports 生成文件；两者要配置一致。
- 故障分层：入口产物文件不存在 ≠ 产物存在但缺少命名导出；先分清再修。

## 5. 变更链路（改 shared 以后）

```text
改 packages/shared/src/index.ts
  │  保存后什么都不会自动发生
  ├─ 开发预览链路：重建 shared（pnpm --filter @dklns/shared run build）
  │     → Vite 监听到产物文件变化 → 页面自动刷新（文件监听行为，不是"依赖热更新"）
  └─ 上线链路：重建 shared → 重建各应用产物（文件名哈希会变）→ 部署
        部署没发生，线上用户就拿不到任何东西
```

- 影响范围由消费方模块图决定：import 可达的代码变了才受影响。
  产物不变：新增 A 未引用的导出；产物变但行为不变：实现微调、可观察结果相同。
- 公共接口（导出名、参数、返回类型）不变时，消费方源码不用改；类型变了 TS 会先报错。

## 6. 取舍清单

| 收益 | 代价 |
| --- | --- |
| 省掉"发版/打 tag → 改消费方版本 → 重装"的往返 | 版本边界消失，验证责任前移：改 shared 的人合并前必须验证所有消费方 |
| 共享改动与消费方调整进同一次提交，一起评审 | 没有旧版本可退，只能回滚代码（如 git revert）；所有消费方同时面对变化 |
| 重构、排查跨应用问题时代码都在眼前 | 仓库变大：clone 慢、CI 要学会"只跑受影响项目"、公共文件易冲突 |

不适合合仓：需要仓库外消费的包、权限边界不同的团队、升级节奏必须完全独立的项目。

## 7. 学习中修正过的认知·第一阶段（个人易错点）

- "热更新" ≠ 依赖热更新：页面自动刷新源于 Vite 对产物文件的监听。
- 产物内容变化不需要重新安装依赖；只有依赖声明本身变化才需要。
- 同一次提交 ≠ 多个线上系统原子部署。

## 8. 依赖治理：谁能 import 谁（lesson-10）

```text
期望的依赖方向（唯一合法方向）：
  apps/a ──┐
           ├──包名导入──→ packages/shared ──→ zod 等第三方
  apps/b ──┘
越界方式：相对路径 ../../packages/shared/src（绕过 exports）、跨应用 ../../a/src/...
```

- 边界靠"声明 + 机器强制"维持；物理可达 ≠ 应该可达。
- 两条互补的 lint 规则：
  - `import/no-relative-packages`：强制包名导入。**规则挂载 ≠ 生效**——默认解析器不认 .ts 时静默跳过，需 `eslint-import-resolver-typescript` + flat config 的 `settings["import/resolver"]`。
  - `no-restricted-imports`：字符串模式匹配，拦跨应用路径；pattern 要覆盖正确写法（`../../a/**`）和笔误写法（`../a/**`）。
- 失效模式互补：解析型对解析失败的路径静默放过；匹配型不看路径是否存在。越界代码最好同时触网。

## 9. 任务编排：顺序与范围（lesson-11）

- 拓扑序：`pnpm -r run build` 按依赖图自动排队，无需手写顺序；不违反依赖关系的排队方式都合法。
- 选择器方向（实测）：
  - `--filter ...@dklns/shared` = shared 及其**依赖者**（A、B）→ 改共享包后的重建范围用这个；
  - `--filter @dklns/shared...` = shared 及其**依赖**（无本地依赖时仅 shared）。
- 任务图只含 workspace 内的包；zod 等外部依赖不进图。
- 失败传染方向：沿"被谁依赖"向消费方传播，不向它依赖的包传播；CI 中任一失败都阻塞合并。
- pnpm 解决"顺序"和"范围"，不解决"没变就跳过"——每次都真实执行。

## 10. Turborepo 缓存：输入哈希与传染边界（lesson-12、14）

```text
一次构建 = f(输入) → 输出
输入（做内容哈希）：包内源码 + 依赖版本/锁文件 + 相关配置 + 环境变量
                  + 依赖包的哈希（沿任务图 dependsOn 继承，链式）
命中 → dist 与日志都从 .turbo/cache 恢复（replaying logs），构建脚本不执行
```

- **内容哈希模型，不是差量比对**："改没改"是哈希比对的推论，不记录历史状态；这也是跨分支、跨机器（远程缓存）复用的前提。
- **传染沿任务依赖边，不沿包依赖盲目扩散**（lesson-14 实测：改 shared → build 链 3/5 MISS，lint 因 `lint: {}` 无依赖边而 cached）。想让某任务随依赖失效，需显式声明依赖边或扩大 inputs。
- 哈希输入可见性边界：源码、相关配置可见；docs/、README、.github/ 不可见——改注释（改字节）算变，改文档不算。
- 缓存键治理：键必须只含真正影响产物的输入。踩过的坑：`.turbo/turbo-build.log`（turbo 自写日志）污染哈希 → 自指死循环全 MISS；.gitignore 加 `.turbo/` 修复。turbo 为 git 仓库设计。
- dist 可再生：从 src 重构建、或从缓存恢复；src 才是事实源——也是 dist 能进 .gitignore 的原因。

## 11. CI：可复现安装 + 缓存接力（lesson-13、14）

```text
git push → 全新机器：checkout → pnpm/action-setup → setup-node
        → actions/cache（恢复 .turbo）→ pnpm install --frozen-lockfile
        → turbo build lint（按哈希比对决定 MISS/cached）→ 全绿才许合并
```

- `--frozen-lockfile`：锁文件与 manifest 不同步直接报错——"可复现安装"在 CI 的落点；CI 机器只有 git 里的东西，install 是必经第一步。
- 两层缓存：setup-node 的 pnpm 下载缓存 + actions/cache 持久化 .turbo。
- **缓存键三层模型（实测）**：
  1. `key: turbo-<SHA>` 是搬运地址（满足唯一性、便于人读），不是正确性来源；
  2. 精确 key 不匹配时 `restore-keys: turbo-` 前缀回退，取**最近一份**快照——快照是累积的，最新代 = 历代条目的超集，所以"只取最近一份"就够；
  3. 命中与否由 turbo 拿任务哈希进快照里比对决定：取错快照只慢不错，缓存是纯优化。
- 平台告警（如 Node 20 弃用）与自己的配置问题要分清。
- 推送即实验：任何一次 push 都在检验“哪些任务该重跑”。
- 分支保护/rulesets：master 只接受 CI 绿的 PR 合入；规则在服务端执行、bypass 名单留空则对所有人强制。免费私有仓库不执行 rulesets；单人仓库 approvals 设 0（不能自批），强制点 = CI 绿而非人审。缓存作用域单向：PR 可读 base 分支快照，反向不可。

## 12. 学习中修正过的认知·第二阶段（个人易错点）

- "改 shared → 全部任务重跑"被实测修正为"build 链重跑，lint 不传染"：传染范围 = 任务图里的边。
- "配置正确" ≠ "检查生效"：规则挂载了，解析器缺失时照样静默跳过（lesson-10）。
- 差量比对 ≠ 内容哈希：turbo 不记录"改没改"，只比对输入哈希（lesson-12）。
- 精确缓存 key 不匹配 ≠ 缓存没用上：key 管搬运，哈希管使用（lesson-14）。
- 本地钩子可被绕过，CI 才是强制执行点：规则要“合并前机器自动跑”才算数（lesson-10 → 13 主线）。
- “package.json 改动不影响哈希”被实测否定：哈希边界看文件在哪个目录，不看字段重不重要——docs 在所有包外 → FULL TURBO；包内 package.json 改一个字段 → 该包哈希变 + ^build 链传染 3/5 MISS（lesson-14、16）。

## 13. 版本与发布：两种消费方（lesson-16）

- 一个包，两种消费方：仓库内走 workspace 链接（永远最新源码，不看版本号）；仓库外走 registry（只认版本号）。`pnpm publish` 是翻译器：打包时把包自身声明里的 `workspace:*` 替换成真实版本（未实测：本包无 workspace 依赖）。
- 版本号只对仓库外消费方有意义：apps 停在 0.0.0 无害；`private: true` 是防误发保险栓，拦截发生在真实发布那一步，dry-run 不检查（实测）。
- 打包清单规则（实测）：默认全收；`"files": ["dist"]` 白名单收窄到 3 个文件；npm 只读包目录内的 .gitignore/.npmignore，父目录规则不计入——根 .gitignore 的 `dist/` 不会把产物排出 tarball。
- monorepo 特有污染：`.turbo/turbo-build.log` 混进过 tarball（默认黑名单不认识工具产物目录），白名单一并解决。
- semver 与模式取舍：改函数签名 = major；fixed（全仓库同号，版本即仓库快照，代价是无关包也被推号）vs independent（谁改升谁，代价是声明可能与仓库内“永远最新源码”的现实脱节）；changesets 把“版本何时定”变成流程而非自觉。
- registry：本机指向腾讯镜像（只读代理），真实发布需切 registry.npmjs.org + 账号；保持可选需求。
