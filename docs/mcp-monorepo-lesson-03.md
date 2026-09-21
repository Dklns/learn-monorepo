# 第 3 课：pnpm 怎样找到仓库里的共享包？

日期：2026-09-20
状态：配置阅读题已作答；按题设理解，两项概念判断通过，配置拼写与结论范围已校准。没有在仓库中创建配置或运行安装。
前课：docs/mcp-monorepo-lesson-02.md
关联画像：docs/mcp-monorepo-learning-profile.md
关联路线：docs/mcp-monorepo-learning-plan.md

## 1. 前课反馈

用户正确判断 A 直接声明 shared，shared 声明 zod；B 直接使用 zod 后也应自己声明。依赖归属文字题通过。

```text
A → shared → zod
B → zod          （B 开始直接使用之后）
```

箭头表示直接依赖。对 A 而言，zod 是传递依赖；A 不直接声明它，不等于 zod 的变化不会影响 A。本轮仅补充这一点，不展开依赖分类与版本冲突。

## 2. 本课只连接三个概念

- 成员路径：哪些目录里的包被纳入 workspace。
- 包名：每个包的 package.json 中的 name，作为本课按名称声明依赖的标识。
- 本地依赖声明：消费者在自己的 package.json 中明确要求使用 workspace 内的包。

成员路径与包名不是同一件事，workspace 成员关系也不是包之间的依赖关系。

## 3. 三处最小配置片段

以下只展示理解本地依赖关系所需的字段，不是完整的 React 工程配置。

### 仓库根目录的 pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

这些 glob 路径指定 workspace 成员目录范围；例如 apps/a 和 packages/shared 中的包会被识别。不能仅凭普通目录的存在就认为它是可消费的包。

### packages/shared/package.json

```json
{
  "name": "@learn/shared",
  "version": "1.0.0",
  "private": true
}
```

shared 是目录名，@learn/shared 是包名。@learn 是此示例的包名作用域，不要求为了本地使用先注册远程组织。private: true 用于防止误发布，不阻止本地 workspace 消费；version 字段本身也不代表已发布。

### apps/a/package.json（片段）

```json
{
  "name": "@learn/app-a",
  "private": true,
  "dependencies": {
    "@learn/shared": "workspace:*"
  }
}
```

@learn/shared 标识要依赖哪个包。workspace:* 要求使用当前 workspace 中该名称的本地包；* 表示这里不增加具体版本范围限制。如果 workspace 中没有符合声明的包，安装会报错，不退回远程注册表寻找同名包。

这里只解释按包名使用 workspace:* 的情形；workspace 协议也有其他形式，暂不展开。普通版本范围在某些 pnpm 配置下也可能链接本地包，但本课选择显式的 workspace 协议以表达意图，不依赖那些配置默认值。

## 4. 一句话串起来

```text
pnpm-workspace.yaml 找到成员目录
              ↓
读取成员 package.json 的 name，识别包
              ↓
A 用 @learn/shared: workspace:* 声明本地依赖
```

目录解决“在哪里”，包名解决“是谁”，依赖声明解决“谁使用谁”。根配置发现包，不会代替 A 声明依赖。

重要边界：依赖安装可找到本地包，不等于 JavaScript 已经知道该从哪个文件导入代码。包入口、导出和 TS 编译策略还需要配置，将在后续课处理；不声称仅靠以上片段就能运行完整应用。

## 5. 理解检查（已作答）

假设使用上面的配置：

1. 将 packages/shared 目录改名为 packages/validators，package.json 中的 name 仍是 @learn/shared，其他内容不变，也没有额外写死旧路径。A 的依赖键 @learn/shared 需要跟着改名吗？为什么？
2. 另一个独立情境：根配置只保留 apps/*，不再包含 packages/*，也没有其他成员规则包含 shared。磁盘上仍有 packages/shared，但 A 仍声明 @learn/shared: workspace:*。在干净环境重新安装时，pnpm 会自动去远程下载同名包吗？为什么？

第一题检查目录名与包名的区别；第二题检查文件存在、workspace 成员身份与本地依赖要求的区别。两个情境分别判断，不累积修改，也不要求实际执行。

### 用户原始回答

1. A 的依赖键不需要跟着改名，因为 pnpm-workspace.yaml 中记录的是 'package/*'，这意味着 workspace 能够找到 packages/validators 目录下去，然后根据其 pacakge.json 中的 name 识别为包 @learn/shared。所以 A 的安装不会出错
2. 不会去远程下载同名包，因为已经指明了 workspace 协议，就代表要在 workspace 里找，如果 workspace 中找不到则会报错

### 教师反馈

- 判断：按题设 packages/* 理解，第一题的目录名与包名区分正确；第二题关于 workspace 协议不回退远程的判断正确。本课两项概念检查通过，保留配置拼写校准记录。
- 拼写校准：回答写的是 package/*，题设实际为 packages/*。若真实配置写成 package/*，且无其他规则纳入该包，就匹配不到 packages/validators。不能将这个拼写差异当成无影响的配置。文件名应为 package.json，而非 pacakge.json。
- 表述范围：本题能推出“不因这次目录改名而需要改变依赖键，也不因此失去包识别”，不能推出整个安装绝不报错；其他依赖、环境或脚本问题仍可能失败。
- 证据边界：文字题作答正确，不代表已经实际运行安装；配置拼写的纠正来自教师，尚未通过实践复核。

## 6. 教学记录

- 第 2 课的直接依赖归属判断已通过；本课解释配置与对应关系。
- 本课作答：已收到，按题设理解的两项概念判断通过。原文及拼写校准见第 5 节。用户重复发送的同一回答只记录为一次作答。
- 当前证据边界：尚未验证用户能独立编写、安装或排错 workspace，也未考察包入口配置。
- 下一步：学习包入口与导出，再推进最小工程实践。
- 本轮仅写教学文档，没有新建 package.json、改配置、安装依赖或运行测试。
