# 第 16 课（单元 4）：版本与发布——workspace 之外的消费方

日期：2026-09-21
前课：docs/mcp-monorepo-lesson-15.md
状态：已结课（2026-09-21）：预测题与迁移小题均新知识，讲解＋实测两轮完成，白名单复测通过；唯一收尾项为 private 复位。详见第 8 节。

## 1. 问题背景

到目前为止，`@learn/shared` 从未"发布"过：A、B 通过 `workspace:*` 消费的
是本地源码链接，改了就用新的，版本号 `1.0.0` 形同虚设。这在仓库内完全成立。

但你在第一轮访谈里自己提出过另一条路："独立公共仓库 + tag 标识更新 +
消费方引用具体版本"——那是**仓库外消费**的方案。当消费方在仓库外面
（另一个仓库、另一个团队、npm 上的陌生人）时，本地链接失效，一切都要靠
版本号说话。

本课回答三个问题：

1. 同一个包，怎样同时服务仓库内、仓库外两种消费方？
2. `workspace:*` 在发布那一刻会发生什么？
3. monorepo 里版本号由谁、在什么时机决定？（对比：单仓库单包，每次发布手动改 version）

## 2. 概念图：一个包，两种消费方

```text
仓库内（现状）：
  apps/a ──"@learn/shared": "workspace:*"──→ packages/shared
  apps/b ──────────────────────────────────↗
  · pnpm 把它解析成本地链接，不看版本号
  · 锁文件记录的是"链接到本地目录"，不是某个远程版本

仓库外（假设 shared 要给别的项目用）：
  packages/shared ──pnpm publish──→ npm registry（打包成 tarball，带版本号）
  外部消费方 ──"@learn/shared": "^1.x"──→ npm registry 下载安装
```

关键不对称：

- **仓库内没有版本概念**：workspace 依赖永远是"本地最新源码"，这就是
  lesson-09 部署实验里"重建产物才生效"的另一半——源码层面连版本这道闸都没有。
- **仓库外全靠版本号**：semver 范围（^、~）、锁文件、破坏性变更规则都在这里生效。
- `pnpm publish` 是两个世界的翻译器：打包时把消费方声明里的 `workspace:*`
  **替换成真实版本号**，否则发布出去的包没人能解析这个协议。

## 3. 版本策略一页图

monorepo 的特有问题：仓库里有多个包，版本号怎么走？

```text
固定模式（fixed / locked）      独立模式（independent）
├─ shared      2.3.0           ├─ shared      1.4.0
├─ ui-kit      2.3.0           ├─ ui-kit      0.9.2
└─ utils       2.3.0           └─ utils       3.1.0
一次发版全体升号                谁改了升谁，各自独立
好处：版本号即"仓库快照"，      好处：版本号有真实语义，
     兼容矩阵一眼看清                 不发版的包不制造噪音
代价：没改的包也升版本，        代价：包之间兼容关系要额外
     版本号语义被稀释                 记录、验证
```

业界标准工具是 **changesets**：贡献者随 PR 提交"变更集"（改了什么、patch/minor/major），
发版机器人汇总变更集 → 开一个"版本 PR"（统一 bump + 生成 CHANGELOG）→ 合入即发版。
它把"版本号何时决定"从发布者手动操作变成流程的一部分——和 lesson-15 的思路同源：
**不靠自觉，靠流程**。

## 4. 预测题（只作答，先不动手）

1. `packages/shared/package.json` 里写着 `"private": true`。现在直接运行
   `pnpm publish` 会发生什么？另外：A、B 的版本号停在 `0.0.0`，为什么从来没
   造成过任何问题？（提示：想一想这两个包有没有"仓库外消费方"）
2. 假设去掉 private、把 shared 升到 `1.1.0` 并成功发布。发布时 pnpm 会把
   A、B 的 `package.json` 里的 `"@learn/shared": "workspace:*"` 处理成什么？
   发布到 npm 上的那个 tarball 里，这条依赖长什么样？为什么要处理，不处理会怎样？
3. 你改了 shared 某个函数的签名（破坏性变更），A、B 在同一次提交里同步改好、
   CI 绿、合入 master。发布 shared 时版本号该升哪一位？如果仓库里还有第三个包
   C 也依赖 shared 但没用到这个函数——"全仓库统一升版本（固定模式）"和
   "只升 shared（独立模式）"各自的代价是什么？

## 4.5 预测题作答与点评（2026-09-21）

### 用户回答（原话）

1. “不懂”；2. “也不懂”；3. “不知道”。

### 教师判定与处理

| 题 | 判定 | 说明 |
| --- | --- | --- |
| 1 | 新知识，未接触 | private 字段与“版本号只对仓库外消费方有意义”此前均未入课 |
| 2 | 新知识，未接触 | 发布期 workspace 协议替换从未讲过；且题干本身有陷阱（A、B 不会被发布），讲解时已修正题干 |
| 3 | 新知识，未接触 | semver 升位规则与 fixed/independent 取舍均为首次接触 |

记录性质：三题均记为新知识首次接触，不判定为能力不足；处理方式为讲解＋复述/迁移小题，小题作答后再进入动手。

## 4.6 复述与迁移小题作答（2026-09-21）

### 用户回答（原话）

- 复述题：“因为 A B 是本地链接的 shared。”
- 迁移题：“不知道怎么回答”。

### 教师判定

| 题 | 判定 | 说明 |
| --- | --- | --- |
| 复述题 | 通过 | 抓住核心因果链：workspace 本地链接不被 publish 触动，发布只改变仓库外世界的坐标。教师补充一句精确表述：publish 的输入是 packages/shared 目录，A、B 目录根本不进打包流程 |
| 迁移题 | 新知识，未接触 | npm/pnpm 打包清单规则（默认收录、files 白名单、.gitignore 的间接影响）从未入课；讲解后由 dry-run 实测验证 |

### 迁移题讲解：tarball 清单从哪来

- 默认规则：包目录下所有文件都进 tarball，只排除固定名单（node_modules、.git 等）。
- `"files"` 字段是白名单：列出后只有名单内条目 + 必带文件（package.json、README、LICENSE、main/exports 指向的入口）进包。
- 无 files、无 .npmignore 时，npm 会借用 .gitignore 规则——本仓库根 .gitignore 含 `dist/`，而 shared 的 exports 指向 `./dist/index.js`：最坏情况是 tarball 里混着 src/、tsconfig.json，却缺了唯一需要的 dist/，发布即坏包。
- 父目录 .gitignore 是否被 npm/pnpm 计入存在实现差异，不做断言，以 dry-run 实测清单为准（见第 7 节证据边界）。

状态：讲解完成，进入动手验证（第 5 节）。

## 5. 动手预告（小题点评后进行，不联网也能做）

1. 先 `pnpm publish --dry-run`（会因 private 报错，观察报错原文——预测题 1 兑现）；
2. 临时去掉 `private: true` 再 `--dry-run`：观察打包文件清单（哪些进了 tarball，
   dist、tsconfig 有没有混进去）与替换后的依赖声明；
3. 真实发布到 npm 为可选项（需要 npm 账号与 @learn scope），不做也不影响本课结论。

## 5.5 dry-run 实测记录与点评（2026-09-21，用户输出）

### 实测现象

- 第 1 次（含 private）：dry-run 未报错，完整走完打包模拟；第 2 次为用户删除 private 后追加 `--no-git-checks`，清单一致（package.json 247B→228B = 用户手删的 private 行）。
- 清单：dist/index.js、dist/index.d.ts、package.json、src/index.ts、tsconfig.json、**.turbo/turbo-build.log**，共 6 个文件。
- registry 指向腾讯镜像 mirrors.cloud.tencent.com。

### 预测 vs 实测

| 预测 | 判定 | 实测结论 |
| --- | --- | --- |
| private 会让 pnpm publish 报错 | 未兑现（dry-run 范围内） | dry-run 不执行发布期检查——检查属于真实发布动作，预演模式直接跳过。与 lesson-15 的强制执行点分层同源：检查在哪一层拦得住，取决于动作在哪一层发生。真实发布拦截未验证（无 npm 账号，不强求） |
| src/、tsconfig.json 会混入 tarball | 兑现 | 白名单缺失时默认全收 |
| dist 可能被根 .gitignore 排除 | 未兑现 | 打包规则只读包目录内的 .gitignore/.npmignore（shared 下都没有），父目录规则不计入——“实现差异”的悬念以“不计入”方向落定 |
| （未预测） | 新发现 | turbo 缓存日志 .turbo/turbo-build.log 混入包——默认黑名单不认识 monorepo 工具的产物目录，属 monorepo 特有污染 |
| （未预测） | 新发现 | registry 为腾讯镜像（只读代理），真实发布需切换 registry.npmjs.org + 账号；真实发布保持可选，不入本课主线 |

补充：本包无 workspace 依赖，workspace:* 替换规则无法在 dry-run 中观察，维持文档结论、标注未实测（证据边界第 7 节）。

## 6. 提交内容

- 三道预测题原始作答；
- `--dry-run` 两次运行的报错/输出关键行（文件清单 + 依赖替换结果）。

## 7. 证据边界

- npm scope、账号、registry 配置不在本课必需范围；
- changesets 本课只建立模型，实际接入视用户需求另开一课；
- tarball 清单与替换行为以 `--dry-run` 实测输出为准，不凭记忆断言。

## 9. 结课后缓存模型检验（2026-09-21，进行中）

背景：文档回填 + private 复位需提交，master 受 ruleset 门禁，用户需走分支 + PR 流。教师顺势出题：合入后 master 上那次 CI，FULL TURBO 还是全 MISS？

### 用户预测（原话）

“FULL TURBO。因为 package.json 的修改不在 turbo 的输入哈希内。”

### 教师反预测（待实测裁决）

- 用户的哈希边界理解有误：docs 能拿 FULL TURBO（lesson-14）是因为 docs 在**所有包目录之外**；package.json 恰恰相反——它是包目录内的一等哈希输入（根 package.json 甚至在全球哈希里），内容变化即改变 shared 的任务哈希。
- 预计：shared build MISS → A、B build 经 ^build 依赖边传染 MISS（3/5）；A、B lint 无依赖边、自身输入未变，restore-keys 前缀回退后命中（2/5）。即与 lesson-14 “改 shared 源码”同构：3/5 MISS + 2/5 命中。
- 分歧点聚焦：package.json 是否在 turbo 任务哈希内。实测以 master 合入后那次运行为准。

### 实测记录与裁决（2026-09-21，用户截图 + 教师核对）

- PR #4（docs/lesson-16，含 private 复位）合入后 CI：succeeded 18s；restore-key 前缀回退命中 turbo-c46b438e…（14MB 快照恢复）；turbo 5 successful，**2 cached, 5 total**，3.389s，无 FULL TURBO。
- 分布：app-a:lint、app-b:lint 命中；shared:build、app-a:build、app-b:build MISS——与教师反预测（3/5 MISS + 2/5 命中）完全一致。
- 裁决：用户的“package.json 不在 turbo 输入哈希内”被实测否定；package.json 是包目录内的一等哈希输入。
- 教益：哈希边界看**文件在哪个目录**，不看字段“重不重要”；docs 在所有包外 → 全命中，包内任何字节变化 → 该包哈希变 + ^build 链传染。命中者来自 restore-keys 恢复的快照（快照累积模型，lesson-14）。

### 状态：裁决完成，本课全部收尾（private 复位 + 门禁流复练 + 缓存模型复验）。

## 8. 白名单复测与结课（2026-09-21，用户输出）

- 复测：`"files": ["dist"]` 生效，tarball 精确收缩到 3 个文件（dist/index.js、dist/index.d.ts、package.json），.turbo 日志、src、tsconfig 全部消失；包体积 835B→555B。教师核对最终 package.json 通过。
- 收尾待办（教师核对发现）：`"private": true` 尚未加回，提醒用户复位（A、B 暂无仓库外消费方，保险栓应保留；files 字段保留，属永久卫生）。

### 本课要点

- 版本号是仓库外消费方的坐标；仓库内消费只有源码，没有版本闸门。
- publish 是两个世界的翻译器：替换包自身的 workspace 协议依赖；只打包包目录，消费方仓库不进流程。
- dry-run 是预演，不执行发布期检查；强制执行点在哪一层，取决于动作在哪一层发生（与 lesson-15 同源）。
- 打包清单默认全收，files 白名单收窄；父目录 .gitignore 不计入（实测修正预测）；.turbo 日志混包是 monorepo 特有污染。
- fixed vs independent 的取舍本质：仓库内永远最新源码的现实，与对外版本声明之间的对账成本归谁。

### 结课判定

- 本课知识点均为新知识，经讲解＋实测两轮，白名单复测通过；workspace:* 替换与真实发布拦截两项留档未实测，不作为掌握内容记录。
- 单元 4（版本与发布）结课。速查图 v2 新增第 13 节；路线第 10、11 节已更新。
- 下一步待用户选择：单元 5（规则与协作）需求触发；或停留整理；或真实发布需求出现时续接（需 npm 账号）。

