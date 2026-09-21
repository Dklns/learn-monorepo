# 第 2 课：模块、包和 workspace 是什么关系？

日期：2026-09-19
状态：直接依赖归属文字题已作答，两题均通过；反馈更新于 2026-09-20，未开始工程实操。
前课：docs/mcp-monorepo-lesson-01.md
关联画像：docs/mcp-monorepo-learning-profile.md
关联路线：docs/mcp-monorepo-learning-plan.md

## 1. 从已确认的理解出发

用户已在前课文字题中正确区分源码更新与部署产物更新。教师补充：共享代码修改不一定改变 B 自身源码，但 B 构建产物中的共享逻辑要更新。

本课只建立模块、包与 workspace 的关系，不立即引入包发布、peerDependencies、exports 或构建工具的配置细节。前课的一道题通过不代表整个选型与权衡单元完成；更复杂的取舍将结合实践回访。

## 2. 三个概念

### 模块：代码层面的组织单元

在熟悉的 TS/React 场景中，可以先把一个使用 import/export 的源文件理解为一个模块。例如 formatPrice.ts 导出函数，Price.tsx 导入它使用。一个包可以包含很多模块。

### 包：具有身份、依赖声明等元信息的项目单元

在本课的 pnpm 项目中，用各自的 package.json 描述包。它可以声明包名、依赖和执行脚本等；只有目录名称并不能替代这些信息。

包不一定发布到 npm，也不一定只是工具库。React 应用本身也可以作为包管理。一个包可以是应用，也可以是供应用使用的库。

### Workspace：包管理器识别的一组本地包

Workspace 告诉包管理器：哪些目录属于一起管理的本地包集合。配合依赖声明和本地依赖协议，可以管理这些包并建立本地包之间的连接。

在 pnpm 中通常用 pnpm-workspace.yaml 描述成员路径，具体配置留到后续实践。成员识别不是依赖声明，加入 workspace 不等于所有包自动相互依赖。

## 3. 放到同一张图里

```text
一个 Git 仓库（monorepo 的源码组织边界）
├── package.json             根级脚本和配置等；不是替所有包声明依赖
├── pnpm-workspace.yaml      指定哪些路径属于 workspace
├── apps/
│   ├── a/
│   │   ├── package.json     A 自己的身份、依赖和脚本
│   │   └── src/...
│   └── b/
│       ├── package.json     B 自己的身份、依赖和脚本
│       └── src/...
└── packages/
    └── shared/
        ├── package.json    shared 自己的身份、依赖等
        └── src/
            └── formatPrice.ts  一个模块
```

apps 和 packages 是约定的目录名，不是强制语法。Monorepo 与 workspace 也不是同义词：前者是源码仓库组织方式，后者是包管理器管理本地多个包的机制；不同生态有不同工具。

## 4. 为什么各自声明依赖

原则：谁直接使用某个依赖，谁负责声明它。

共享代码放在一个仓库，不等于把所有 dependencies 都集中到根 package.json。各包的声明用来表达真实依赖边界，便于安装、构建、发布和理解变更影响。

注意：这是依赖归属规则，不保证漏声明时每种环境都会立刻报错。有些安装布局或配置可能让代码偶然运行，不能据此证明依赖声明正确。

Workspace 管理关系；pnpm 的存储与链接机制处理安装复用。因此，多个包声明相同依赖，也不必然意味着每个包都从网络重复下载一份。

本课只判断依赖应归哪个包，不考 dependencies、devDependencies、peerDependencies 的分类，也不要求具体版本号。

## 5. 理解检查（已作答）

有两个 React 应用 A、B 和公共包 shared，均处于同一 workspace。

- A 直接调用 shared 导出的校验函数，不直接导入第三方库 zod。
- shared 的校验函数内部直接使用 zod。
- B 目前不使用 shared，也不使用 zod。

请回答：

1. A 应直接声明依赖谁？zod 应声明在哪个包的 package.json 中？
2. 如果后来 B 的代码也直接 import zod，B 是否需要自己声明 zod？为什么？

允许用 A → shared 这样的箭头表达。这里只讨论直接依赖的归属，不要求安装或写配置。

## 6. 教学记录

- 本课目标：区分模块、包、workspace、monorepo，初步理解直接依赖归属。
- 用户原始回答 1：“A 应直接声明依赖 shared。zod 应声明在 shared 的 package.json 中”
- 用户原始回答 2：“B 需要自己声明 zod。因为这表明 B 有直接使用过 zod。”
- 掌握判断：两题正确，能够在本题中将直接使用关系对应到声明责任。不据此推断已能独立配置工程，也不推断已掌握所有依赖分类。
- 教师反馈：A → shared → zod；B 开始直接使用后形成 B → zod。A 不直接声明 zod，但它仍是 A 的传递依赖，变更可能影响 A。传递影响属于本轮新讲解内容，尚未独立验证。
- 后续：进入 docs/mcp-monorepo-lesson-03.md，阅读成员路径、包名和 workspace:* 的最小配置片段。
- 本轮没有安装工具、生成应用代码或执行构建／测试。
