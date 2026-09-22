# 第 15 课（第二阶段·收尾）：分支保护——把"PR 必须绿"变成机器强制

日期：2026-09-21
前课：docs/mcp-monorepo-lesson-14.md
状态：已下发，等待用户提交三道预测题。

## 1. 问题背景

单元 1 的结论：本地钩子可被 `--no-verify` 绕过；单元 3 把检查搬进了 CI，
但目前只对 **push 到 master** 生效——而你一直在直接 push master。
也就是说：CI 现在是"事后记录仪"，不是"事前门禁"。坏代码照样进了主干，
只是进得比较难看。

本课用一个 GitHub 仓库设置，把 lesson-10 的原则（边界要靠机器强制）
应用到**协作流程**本身：main/master 只接受"CI 绿的 PR"合入。

## 2. 概念图：门禁装在哪里

```text
现在的流：   本地 commit ──push──→ master ──→ CI 跑（记录结果，拦不住任何东西）
保护后的流： 本地 commit ──push──→ feature 分支
             ├─ 开 PR ──→ CI 在 PR 上跑 ──绿──→ 才允许 merge 进 master
             └─ 直接 push master ──→ 被 GitHub 拒绝（GH006 protected branch）
```

注意：规则执行者是 **GitHub 服务端**，不在你的机器上——没有任何本地手段能绕过，
这与 lint（本地可绕）形成本质对比。这是"强制执行点"的最终形态。

## 3. 预测题（只作答，先不配置）

1. 启用"require a pull request + require status check（ci）"后，你直接
   `git push` master 会发生什么？本地那条 commit 丢了吗，还是只是被拒？
2. 假如有人在 PR 里故意写坏 lint，CI 红了：merge 按钮会怎样？
   PR 合入后，master 上会再触发一次 CI 吗？结合缓存键模型，
   这次运行预计是 MISS 还是 FULL TURBO？（提示：merge commit 的 SHA ≠ PR 里任何一次 push 的 SHA）
3. 你是这个仓库的**管理员**。默认设置下，你自己能绕过这些规则吗？
   要做到"对包括管理员在内所有人都强制"，需要勾选哪个开关？
   这呼应了课程里哪条原则？

## 3.5 预测题作答与点评（2026-09-21）

### 用户回答（原话）

1. "直接 git push master 会被拒绝。本地那条 commit 保留。"
2. "merge 按钮会被禁用。会触发，FULL TURBO。"
3. "能吧。我不知道。所有人权限一致？"

### 教师判定

| 题 | 判定 | 说明 |
| --- | --- | --- |
| 1 | 通过 | 服务端拒绝（GH006 protected branch hook）且本地 commit 保留——拒绝发生在远端接受环节，回退 `git push` 即可，工作不丢 |
| 2 | 通过 | merge 禁用、master 再触发、FULL TURBO 全对。推理链：merge commit 的 SHA ≠ PR 里任何一次 push 的 SHA → 精确 key 不匹配 → restore-keys 前缀回退 → 任务输入哈希都没变 → 全命中。补充一个细节：Actions cache 按分支作用域隔离，PR 运行存下的快照 master 取不到；但不影响结果——master 自己最近一次快照（改 docs 那次累积下来的）已含全部任务条目 |
| 3 | 直觉对，开关未知 | 默认**能**：经典分支保护下管理员可绕过。开关是 "Do not allow bypassing the above settings"（新版为 ruleset 的 bypass 名单）。呼应的原则：强制执行点必须覆盖所有人，否则规则只约束协作者，对管理员退化为自觉——与 lesson-10 "没人强制时只剩自觉" 同源 |

- 记录性质：题为预测；拒绝报错与 PR 流程实测验证（第 4 节）。

## 4. 动手（预测点评后进行；界面措辞随 GitHub 演进，以实际为准）

1. 仓库页 Settings → Branches → Add branch protection rule（classic）：
   - Branch name pattern：`master`
   - Require a pull request before merging（approve 数量设 1 即可，单人项目走流程用）；
   - Require status checks to pass → 选中 `ci`（ci 已跑过多次，下拉里能找到）；
   - 视点评结论决定是否勾选 bypass 相关开关；
2. 保存后直接 `git push` master，记录被拒的完整报错；
3. `git checkout -b ci/protect-test`，做一个微小改动（改 docs），push 分支、开 PR；
4. 观察：PR 上的 ci 是否自动运行、绿后 merge 按钮的变化；merge 后去 Actions
   看 master 上那次运行的结果与 restored key。

## 5. 本课要点（实验后回填，2026-09-21）

- 规则的服务端执行属性：配置在 GitHub，绕不过，与本地钩子本质不同；本地 commit 保留，拒绝发生在远端接受环节。
- 状态检查绑定的是 **check 名**（workflow 名/job 名 `CI / ci`），不是 workflow 文件路径；ruleset 报错为 GH013，会逐条列出违反的规则。
- 日常流从"直接 push"变为"分支 + PR"：单人项目也值得，门禁不看人数；但**门禁参数要匹配团队现实**——单人不能自批 PR，approvals 必须为 0，强制点 = CI 绿。
- 缓存作用域单向：PR 运行可读 base 分支的快照；PR 里存的快照（refs/pull/N/merge 作用域）master 取不到。
- 免费私有仓库不执行 rulesets（页面明示警告），需 public 或 Team 计划——配置前先确认执行前提。

## 6. 提交内容

- 三道预测题原始作答；
- 直接 push 被拒的报错原文；
- PR 合入后 master 上那次 CI 的关键输出（restored key、cached 数、FULL TURBO 与否）。

## 7. 结课后待办

- 讲义回填、路线第 10/11 节更新、速查图 v2 第 11 节补一行"分支保护"；
- 单元 4（版本与发布）、单元 5（规则与协作）保持需求触发。

## 8. 证据边界

- 分支保护界面字段与报错文案随 GitHub 版本演进，以实际为准；
- 截图/报错原文记录在案；管理员绕过行为以实测为准（预测题 3）。

## 9. 实验记录与结课（2026-09-21，用户截图）

### 配置过程（教师初审三处修正）

- 用户使用新版 **Rulesets**（非经典 branch protection）：内容选型正确（Require PR、Required status check `ci`、Block force pushes、Restrict deletions、Bypass list 空 = 对所有人强制）。
- 初审发现三处：①私有仓库不执行 rulesets（页面明示警告）→ 用户改为 public；②Enforcement status 为 Disabled → 改 Active；③Branch targeting 未配置 → 指向 master。
- 途中参数修正：Required approvals 1 → 0（单人无法自批 PR，门禁会死锁）；原则记入第 5 节。

### 直接 push 被拒（预测题 1 兑现）

- 报错 GH013: Repository rule violations found，逐条列出 "Changes must be made through a pull request" 与 "Required status check ci is expected"；`! [remote rejected]`，本地 commit 保留。
- 网络插曲：改可见性后一次 push 报 schannel SSL/TLS 握手失败，判定为连接层问题与可见性无关（第 13、14 课同机推送成功），重试后恢复。

### PR 流程与合入（预测题 2 兑现）

- PR #1（master ← ci/protect-test，docs 变更 +192 −17）：pull_request 触发，check 显示 `CI / ci (pull_request)` 带 Required 标签；Reviewers 为 No reviews 但 Ready to merge（approvals 0 生效）。
- merge 按钮两帧：评估中（灰）→ Ready to merge 徽章 + No conflicts + 蓝色可点。
- **合入后 master 运行：17s，Cache restored from key: turbo-943ec449b04b23b06250e655818f69d1affcf2b8（master 作用域最近快照，即 lesson-14 "只改 docs" 那次），turbo 5 successful, 5 cached, 15ms FULL TURBO。** merge commit 新 SHA → 前缀回退 → 哈希全命中，推理链与缓存键三层模型完全一致。
- 教师补充验证（推断）：PR 运行那次（18s）同样 FULL TURBO，且其恢复的 key 也是 943ec44——实证 PR 可读 base 分支缓存（单向作用域）。

### 结课判定

- 预测题 1、2 全对；题 3 直觉正确、开关名由教师补齐（ruleset 对应 bypass 名单留空）。
- 用户已完整走通"规则配置 → push 被拒 → 分支 + PR → 门禁绿 → 合入 → master 复验"全链路。
- **第二阶段全部收官**：单元 1–3 + 收官实验（lesson-14）+ 分支保护（本课）+ 速查图 v2。剩余单元 4（版本发布）、单元 5（规则协作）保持需求触发。
