# 第 14 课（第二阶段·收官实验）：哈希传染在 CI 重演

日期：2026-09-21
前课：docs/mcp-monorepo-lesson-12.md、docs/mcp-monorepo-lesson-13.md
状态：已下发，等待用户提交三道预测题。

## 1. 问题背景

第 12 课在本地验证了"改 shared 一字符 → 重建全 MISS"的哈希传染，但那是在
你自己的机器上——有完整历史、有旧缓存、有 node_modules。第 13 课的 CI 是
一台全新机器，只靠 actions/cache 恢复 .turbo。

本课要回答的问题：**哈希传染这套规则，在"干净机器 + 恢复的缓存"上是否原样重演？**
这是单元 2（输入哈希）与单元 3（CI）的最后一次合练，也是第二阶段主线
（依赖治理 → 任务编排 → CI）的收官实验。

## 2. 概念图：两条链路对比

```text
本地（第 12 课）
改 shared/src ──→ shared 哈希变 ──→ A、B 的哈希输入含依赖哈希 ──→ 全 MISS

CI（本课）
git push ──→ 全新机器 checkout ──→ actions/cache 按 restore-keys 恢复 .turbo
         ──→ turbo 逐任务算哈希 ──→ 与恢复的缓存比对 ──→ 决定 MISS / cached
```

要点：CI 上判断 MISS 还是 cached 的规则与本地完全相同（同样的输入哈希算法），
唯一差别是缓存从哪来——本地是 .turbo 里攒的，CI 是上一次运行存进 GitHub 缓存库的。

## 3. 预测题（只作答，先不执行）

1. 改 `packages/shared/src` 里一个字符（比如给 formatPrice 的注释加个字），
   提交并推送到 master。CI 上共 5 个任务（3 build + 2 lint），预计哪些 MISS？
   B 的源码一个字节没动，为什么它的 build / lint 也要重跑？
2. 之后只改 `docs/` 下一个 markdown 文件，再推送一次。预计 CI 输出什么？
   "仓库内容确实变了"，为什么 turbo 却一个任务都不重跑？
   这两题的分界线，对应第 12 课讲过的哪条"可见性边界"？
3. 第一次推送（改 shared）的运行结束时，actions/cache 会以什么 key 存入缓存？
   第二次推送（改 docs）的精确 key 能匹配上吗？它靠什么机制拿到缓存？

## 3.5 预测题作答与点评（2026-09-21）

### 用户回答（原话）

1. "CI 上 5 个任务都会重跑。因为 B 依赖 shared，shared 改变之后 B 的输入哈希改变。"
2. "FULL TURBO。因为发生修改的是 docs，与任务中涉及的文件没有关系，不会影响寻找缓存时的输入哈希。什么分界线？"
3. "turbo-${{第一次 commit 的哈希}}。不能。不清楚"

### 教师判定

| 题 | 判定 | 说明 |
| --- | --- | --- |
| 1 | 通过（后经实验修正，见第 9 节） | 5/5 MISS 的归因逻辑正确（B 的哈希输入含依赖哈希）；实测为 3/5 MISS + 2 cached：传染只沿任务依赖边传播，lint 无依赖边不传染。判定修正记录在第 9 节 |
| 2 | 结论与理由通过，追问合理 | FULL TURBO 与"docs 不影响输入哈希"正确。分界线即第 12 课的可见性边界：turbo 哈希的输入 = 各任务涉及的源码、相关配置、依赖的哈希；docs、README、.github 等不进入任何任务的输入，改多少字节都不传染。反过来，进入输入的文件哪怕改一个注释（改字节）也算变 |
| 3 | 两对一缺 | key 格式（turbo-<SHA>）与精确匹配失败均正确。缺的一环：restore-keys 前缀回退——key: turbo-<新SHA> 匹配不上时，按 restore-keys 的 `turbo-` 前缀取最近一次缓存，把上一次运行存下的 .turbo 恢复到机器上；turbo 再逐任务比对哈希，全命中 → FULL TURBO。即：**Actions cache 管"把缓存运到机器"，turbo 管"判断能不能用"，两层各司其职** |

- 记录性质：题为预测；MISS/cached 分布与 restore-keys 行为由两次推送实测验证（第 4 节）。

### 追问：回退到旧版本，restore-keys 取到的还是"上一次"的缓存，会不会找不到正确的缓存？（2026-09-21）

用户疑问：若仓库回退到之前的版本，对应的缓存不只是上一次提交的，而是更早的；现在的 key/restore-keys 设计会找不到正确的缓存。

教师解答（三层，从安全到高效）：

1. **取"错"快照不会产生错误结果，只会产生 MISS。** .turbo 内部的缓存条目按任务输入哈希存取，turbo 拿到任何一份 .turbo 都先逐任务算哈希再比对；哈希对不上就重跑。缓存是纯优化，缺命中最坏只是慢，永远不会输出错误产物。
2. **.turbo 是累积的，不是每 commit 一份快照。** 每次运行 restore 上一次的 .turbo → 新增条目 → 整体存回。因此最新快照里同时包含新旧代码的条目：回退后 restore 到最新 .turbo，turbo 对旧代码算出的哈希仍能在里面找到早前运行存下的条目 → FULL TURBO。
3. **真正的丢失场景是驱逐，且后果只是重建。** GitHub 缓存有 10GB/仓库上限与 7 天未用回收；被驱逐的条目导致 MISS，重跑后重新写入。正确性依旧不受影响。

设计再评价：key 里的 commit SHA 主要满足 actions/cache 的唯一性要求，并便于人读"这份缓存来自哪次运行"；真正的命中凭据是 .turbo 里的任务哈希，与 key 无关。写成固定前缀（如 turbo-<runner.os>）同样正确，可见 key 不是这套机制的正确性来源。

### 追问二：为什么 restore-keys 只回退到最近一次？（2026-09-21）

用户疑惑：既然精确 key 找不到时按前缀回退，为什么只取最近一份，而不是更早的某一份？

教师解答：

1. **机制层面：actions/cache 的回退语义就是"取最近一份"。** 同一前缀下的多个缓存按创建时间排序，restore-keys 命中其中最新的一个快照恢复到机器上；一次 restore 只恢复一份目录快照，不会把多份快照拼接起来。
2. **为什么这样够用：每个快照都是此前所有条目的超集（近似）。** .turbo 按代际累积，最新一代包含历代条目（除非被驱逐）：

   ```text
   turbo-SHA1: { A, B, C }              （旧代码的任务条目）
   turbo-SHA2: { A, B, C, A', B' }      （改 shared 后新增，旧的还在）
   turbo-SHA3: { A, B, C, A', B', … }   ← restore-keys 取的总是这份
   ```

   旧版本代码对应的条目不是单独躺在缓存库里的另一份东西，而是最新快照内部的若干条目。要找旧条目，最新快照里就有，无需回退到旧快照。
3. **真正会丢的场景与局限：** 条目被 GitHub 驱逐（10GB/7 天）后最新快照里没有，而 actions/cache 只给一次 restore，不会再去更早的快照里搜——这是该机制的已知局限，代价只是 MISS 重跑，正确性不受影响；远程缓存（turbo 官方）按任务哈希直接存取单条条目，不存在"整份快照"的回退问题。

心智模型校准：用户原模型是"每个 commit 对应一份自己的缓存，回退就该取那份"；实际是"一份不断长大的缓存，SHA key 只是它的历代存档标签"。

记录性质：概念答疑，未执行实验。

记录性质（前问）：概念答疑，未执行回退实验；如需实证可另推送一个 revert 提交观察 FULL TURBO。

## 4. 动手（预测点评后进行）

1. 修改 `packages/shared/src/index.ts` 一个字符，commit + push；
2. 打开 Actions 页，记录：总耗时、`Cache restored from key: ...`、
   turbo 输出的 `X successful, Y cached, FULL TURBO 与否`；
3. 再只改 `docs/` 下任一 markdown，commit + push，记录同样三项；
4. 把两次的关键输出（或截图）贴回。

预期现象与判读以实际运行为准；红了就原样贴日志，陪同读。

## 5. 本课要点（实验后回填，2026-09-21）

- 哈希传染沿**任务依赖边**传播，不沿包依赖盲目扩散：build 因 `dependsOn: ["^build"]` 链式失效；lint 是空配置（无依赖边、默认输入），哈希只含本包源码，shared 改动不传染 lint。
- restore-keys 前缀回退两次实测生效：两次推送的精确 key 均不存在，均取到上一次运行的快照。
- Actions cache（搬运，按 key/前缀）与 turbo（使用，按任务哈希）分工得到实测支持：第二轮精确 key 不匹配仍 FULL TURBO 5/5。
- CI 残余耗时在环境准备（checkout/setup/install 约 8s），turbo 本身仅 25ms；再快需远程缓存或更细的 setup 缓存，收益有限。

## 6. 提交内容

- 三道预测题原始作答；
- 两次推送各自的关键输出（缓存 key、任务数、cached 数、耗时）。

## 7. 收官后的分流（实验结课时确认）

- 速查图升级 v2：补依赖治理、任务图、缓存键、CI 四节（现版本止于第一阶段）；
- 分支保护规则：把"PR 必须绿"从约定变成 GitHub 强制（可选，需仓库设置操作）；
- 单元 4（版本与发布）/ 单元 5（规则与协作）：需求触发型，有真实需求再启动。

## 8. 证据边界

- GitHub Actions 缓存行为与 turbo 版本相关，以实际输出为准；
- 截图证实页面显示，关键日志（Cache restored、turbo Tasks 行）需展开核对；
- 实验结果记入本文件与路线第 10 节，作为第二阶段主线收官证据。

## 9. 第一轮运行：改 shared 源码（2026-09-21，用户截图）

- commit 0be20fd“改 shared 源码”（同次提交还包含 docs 讲义更新，不影响判断：docs 非任何任务的输入）。
- 缓存：Cache hit for restore-key: turbo-9c038066638800dd575fbb083ca5cb2133ae2f2 = 上一提交 9c03806“修改 .gitignore”的存档；本次精确 key 不存在，前缀回退生效。
- turbo 输出：Tasks 5 successful，**Cached: 2 cached, 5 total**，Time 5.238s；运行总时长 20s（turbo 步骤 6s）。
- 实际分布：MISS 的 3 个为 learn/shared:build、learn/app-b:build、learn/app-a:build（沿 `dependsOn: ["^build"]` 链）；cached 的 2 个为 app-a:lint、app-b:lint。
- **预测修正（教师与用户同错）**：双方均预测 5/5 MISS，实测 3/5。原因：turbo.json 中 `lint: {}` 为空配置——无 dependsOn、默认输入，其哈希只含本包源码；哈希传染只沿任务依赖边传播。第 12 课“改 shared 一字符全 MISS”的表述修正为“build 链全 MISS；无依赖边的任务不传染”。
- 教益：传染范围 = 任务图里的边，而非“改了共享包就全部重跑”。这本身是设计优点：lint 检查源码、不消费 build 产物，理应不重跑；若希望 lint 随依赖失效，需显式声明依赖边（如 `dependsOn: ["^build"]`）或扩大 inputs——按需设计，不是默认行为。

## 10. 第二轮运行与收官结课（2026-09-21，用户截图）

- commit 943ec44“只改 docs”（cheatsheet +2 行）。
- 缓存：Cache restored from key: turbo-0be20fd1a9bea14a1151380b4a58365c7fd3e26b1 = 第一轮 commit 0be20fd 的存档；本次精确 key 不匹配，前缀回退。
- turbo 输出：5 successful，**5 cached**，25ms FULL TURBO；运行总时长 17s（turbo 步骤 1s，其余为 checkout/setup/install 等环境准备）。
- 收官判定：
  - 三道预测题 + 两次实测闭合；预测 1、3 的偏差已在实验中归因修正（第 3.5、9 节）；
  - “干净机器 + restore 快照”下 MISS/cached 规则与本地一致，哈希传染在 CI 复演成功（范围按任务图修正）；
  - 用户掌握了精确 key 与前缀回退、快照累积、缓存纯优化三层模型，两次追问（回退回退、为何只取最近一份）均指向机制本质。
- **第二阶段主线（依赖治理 → 任务编排 → CI）收官。** 待用户选择：速查图 v2 / 分支保护规则 / 单元 4（版本发布）、单元 5（规则协作）需求触发。
