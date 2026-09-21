# 第 13 课（第二阶段·单元 3）：CI——把检查搬进"真正的强制执行点"

日期：2026-09-21
前课：docs/mcp-monorepo-lesson-12.md
状态：单元 3 结课（2026-09-21）：首次运行 25s 全 MISS，第二次 17s 缓存恢复 + FULL TURBO（5/5 cached）；用户自供两张 Actions 截图。

## 1. 问题背景

依赖治理课的结论：本地钩子可被 `--no-verify` 绕过，也没法约束没装钩子的人。
本课把 lint、build、turbo 缓存搬进 CI：代码一推上来，流水线在**另一台机器**上
自动执行全部检查，不过就不许合并。这是第二阶段前两个单元的会师：
单元 1 造好的检查 × 单元 2 造好的缓存。

## 2. 概念图：CI 是什么

```text
你的机器                          CI 机器（全新环境）
git push ───────────────────→  触发器收到事件（push / PR）
                                1. clone 仓库（干净副本，只有 git 里的东西）
本地有：源码+依赖+缓存+产物      2. 装 Node、pnpm
CI 只有：git 里的东西            3. pnpm install --frozen-lockfile
                                4. 跑 lint、build（turbo，含缓存）
                                全绿 → 允许合并；红了 → 拦下
```

要点：CI 机器从零开始，**没有任何本地状态**。你在本地踩过的每一课——
依赖声明、锁文件、构建顺序、缓存——都会在"全新机器能否复现"这件事上受到检验。

## 3. 预测题（只作答，先不执行）

1. CI 机器 clone 仓库后、跑 build 之前，必须先执行什么？
   为什么 CI 上要用 `pnpm install --frozen-lockfile` 而不是普通 `pnpm install`？
2. 本地的 `.turbo` 缓存目录会进版本库吗？那 CI 上第一次跑 `turbo build`
   会命中缓存吗？有什么办法让 CI 也能享受缓存？
3. 流水线应该在什么事件时触发？"push 到 main"和"开一个 PR"分别意味着什么？
   为什么团队协作通常要求"PR 上必须绿"？

## 4. 动手（预测点评后进行；需要 GitHub 账号）

1. 在 GitHub 创建一个空仓库（public 即可），本地 `git remote add origin <url>` 后推送；
2. 新建 `.github/workflows/ci.yml`：push 与 PR 触发；装 Node + pnpm；
   `pnpm install --frozen-lockfile`；跑 `pnpm turbo build lint`（lint 配置在包内）；
3. 推送 workflow 文件本身，去 GitHub Actions 页看第一次运行；
4. 观察：构建耗时、turbo 是否 MISS；随后开一个只改注释的 PR，
   对比第二次运行的缓存情况。

具体 YAML 以点评后下发的版本为准；字段随 GitHub Actions 与 turbo 版本演进，
报错原样贴回。

## 5. 本课要点（先留白，实验后回填）

- frozen-lockfile 是"可复现安装"在 CI 的落点：CI 不接受锁文件与 manifest 不同步。
- CI 的缓存不是本地 .turbo，需要显式机制（远程缓存或 Actions cache）——
  单元 2 的"输入哈希"在这里决定缓存键。
- PR 门禁是把团队规则变成机器规则的地方：红了不许合，没有例外。

## 6. 提交内容

- 三道预测题原始作答；
- 第一次 CI 运行的关键输出（安装、构建、缓存状态、总耗时）；
- 第二次（PR 或重复触发）的缓存对比。

## 7. 预测题作答与点评（2026-09-21）

### 用户回答（原话）

1. “先执行 lint。为保证 CI 校验结果与本地一致”
2. “本地的 .turbo 缓存目录不会进入版本库。第一次不会命中缓存。没办法。”
3. “在 push 或者 pr 时才触发。‘push 到 main’ 意味着推送新的版本。‘开一个 PR’意味着在推送新版本前做一次检查。因为这代表迭代没有问题”

### 教师判定

| 题 | 判定 | 说明 |
| --- | --- | --- |
| 1 | 缺关键步骤 | 漏了最核心的一步：`pnpm install`（CI 机器只有 git 里的东西，node_modules 不在其中）。frozen-lockfile 的意义：安装严格按锁文件执行，与 manifest 不同步时直接报错，保证可复现；普通 install 会按当前时间重新解析版本。与用户访谈第 3 轮对锁文件的回答相呼应 |
| 2 | 两对一错 | 不进版本库、首次不命中均正确；“没办法”错误：可远程缓存（turbo link）或 Actions cache 持久化 .turbo，让后续运行命中 |
| 3 | 方向对，措辞需校准 | push/PR 触发正确；“推送新版本”混淆了合并与发布——push 到 main 是主干历史前进，PR 是合并前的评审门禁；“必须绿”的原因：main 是部署的事实源，红灯不许合，坏代码进不了共享历史 |

- 呵护点：题 1 暴露“CI 环境 = 全新机器”的意识尚未落地，动手环节从 clone 后机器上有什么开始验证。
- 记录性质：题为预测；frozen-lockfile 与 CI 缓存由实验验证。

## 9. 首次 CI 运行（2026-09-21，用户截图）

- 运行结果：ci job 成功，总耗时 25s。步骤：checkout(1s) → pnpm/action-setup(2s) → setup-node(1s) → actions/cache(1s) → pnpm install --frozen-lockfile(3s) → turbo build lint(8s) → Post 步骤（含 cache 保存）。
- 教学判定：首跑 turbo 必为 MISS（本地 .turbo 不在 git 里，且远端无缓存），但 actions/cache 在 Post 阶段已将 .turbo 存入 GitHub 缓存库，为下次运行命中创造条件——待用户第二次运行验证。
- 截图中两条 Annotation 均为平台层通知（actions 的 Node 20 弃用、ubuntu-latest 将迁移 Ubuntu 26），与用户配置无关；引导用户区分“自己的配置问题”与“平台告警”。
- 记录：截图仅证实 Actions 页面显示；各步骤内部日志未展开，第二次运行时补充验证。

## 10. 第二次运行与单元 3 结课（2026-09-21，用户截图）

- 运行结果：succeeded in 17s（首跑 25s）。
- 缓存验证：actions/cache 步骤显示 “Cache restored from key: turbo-7ff09d02...”（首跑的 commit SHA key）；本次 push 是新提交，精确 key 不匹配，靠 restore-keys 前缀回退命中——教师预设的 “turbo-” 前缀起效。
- turbo 输出：Tasks 5 successful（3 build + 2 lint），5 cached，31ms FULL TURBO；共享包无 lint 故 2 而非 3。
- install 从 3s 降至 2s：setup-node 的 pnpm 下载缓存也在起效（两层缓存：依赖下载缓存 + turbo 任务缓存）。
- 教学判定：CI 缓存闭环验证通过；用户完成“本地缓存 → CI 缓存 → 自动流水线”的全链路。
- 单元 3 成果：frozen-lockfile 可复现安装、workflow 触发规则、job/steps 关系、Actions cache 保存与恢复、平台告警分辨。
- 待后续：分支保护（强制 PR 绿）为可选配置；远程缓存、版本发布（单元 4）视需求启动。

## 8. 证据边界

- GitHub Actions 与 turbo 在 CI 的配置细节随版本演进，以实际运行为准；红了就陪同读日志，这是本课的正常部分。
- 分支保护规则（强制 PR 绿）需要仓库设置操作，视用户意愿决定是否配置。
