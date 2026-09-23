# 第 4 课：找到包之后，import 如何找到文件和函数？

日期：2026-09-20
状态：理解题已反馈，exports 职责已澄清；用户确认理解并进入第 5 课实践，精确故障分层仍待复核。
前课：docs/mcp-monorepo-lesson-03.md
关联画像：docs/mcp-monorepo-learning-profile.md
关联路线：docs/mcp-monorepo-learning-plan.md

## 1. 本课范围

前课解决了成员识别、包名及 workspace 本地依赖。本课连接“包在哪里”和“能导入其中的函数”。

只讲一种策略：共享包的 TypeScript 源码先构建为 JavaScript，再由应用消费。直接让应用工具链处理共享包 TS 源码也是可选策略，但不在本课同时展开。

配置只用于阅读，不是完整的 TypeScript 工程模板；类型声明、tsconfig、构建脚本与开发监听留待实践。

## 2. import 的概念链路

```ts
import { formatPrice } from '@dklns/shared';
```

```text
A 声明并安装了 @dklns/shared 的 workspace 依赖
                  ↓
消费者的模块解析器定位到 shared 包
                  ↓
读取 package.json 的 exports，确定包入口文件
                  ↓
加载存在且可处理的 JavaScript 文件
                  ↓
该入口模块提供名为 formatPrice 的导出
```

pnpm 负责依赖安装与连接；应用的构建工具或运行时负责模块解析和加载。以上是本例的概念链路，不暗示每次 import 都由 pnpm 执行。

## 3. 目录、元信息与产物

```text
packages/shared/
├── package.json
├── src/
│   └── index.ts       源码
└── dist/
    └── index.js       构建产生的 JavaScript
```

### package.json 片段

```json
{
  "name": "@dklns/shared",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./dist/index.js"
  }
}
```

- name：包身份，A 的依赖键与它对应。
- type: module：在本例的包内，将 .js 文件按 ES 模块解释，便于使用 import/export。
- exports 中的点号 .：包根入口，即 import '@dklns/shared' 这种不带子路径的导入。
- ./dist/index.js：相对于该包目录的目标文件，不是相对于仓库根目录或应用 A。
- exports 是入口路径声明，不会生成 dist，也不会自动编译 TypeScript。

包入口也存在 main 等其他字段或机制；本课选用 exports 的简单形式，不声称它是所有生态里唯一的入口方案。

### dist/index.js 中的示例产物

```js
export function formatPrice(amount) {
  return amount.toFixed(2);
}
```

这只是用于观察模块导出的示例，不是完整的金额处理方案。实际开发修改 src 源码，再构建产物，不把手改 dist 当作维护方式。

若该产物存在，且消费环境支持本例的解析方式，则运行时入口和命名导出的关系已对应。TS 类型解析和完整应用构建还需要相应配置，不能凭此宣称工程已可运行。

## 4. 两个相似词，职责不同

| 位置 | 作用 |
| --- | --- |
| package.json 的 exports | 对外导入某个包路径时，对应哪个入口文件 |
| JavaScript 的 export | 该模块向外提供哪些函数、变量或其他绑定 |

可以记为：exports 先找文件，export 再提供函数。

函数只存在于内部文件，或者只从那个内部文件导出，不代表它已经从包根入口导出。包根入口可以定义并导出函数，也可以显式重新导出内部模块的函数。

## 5. 构建顺序的起点

采用本课的先构建策略时，需要让 shared 的产物在 A 解析入口之前就绪：

```text
shared 源码 → 构建 shared → dist/index.js → A 构建时消费
```

并不要求每次都手工执行；将来可以使用任务编排或监听自动化。也不能由此断言所有 monorepo 都必须先独立构建共享包；这里的顺序来自本课选定的产物入口策略。

## 6. 理解检查（已作答并反馈）

两个情境独立考虑。假设 workspace 成员、包名与依赖声明正确，安装与链接已成功；应用解析器遵循上面 exports，不存在额外路径别名或源码回退。

1. shared 只有 src/index.ts，尚未构建出 dist/index.js。也没有安装生命周期脚本或其他步骤自动生成产物。此时 A 能仅凭安装成功就正常 import 并使用 formatPrice 吗？卡在哪一步，需要补上什么？
2. dist/index.js 已存在，但它只导出了 parsePrice。formatPrice 虽然在内部文件中定义并导出，却没有从包根入口导出。A 写 import { formatPrice } from '@dklns/shared' 能成功吗？应检查、修改哪一层，并在本课策略下完成什么后续步骤？

不用写命令。分别说明“包定位”“入口文件”“模块导出”哪一层出了问题即可；不要求知道具体错误消息。

### 用户原始回答

1. 此时的 A 并不能正常使用 formatPrice。卡在了 import { formatPrice } from "@dklns/shared"，@dklns/shared 并没有导出 formatPrice，需要补充 @dklns/shared 的构建产物
2. 不能这样使用，应该修改 src/index.js 先从内部文件中导入进来，再导出，修改之后需要构建产物

### 教师反馈

- 第 1 题：不能正常使用及补构建产物的方向正确。准确故障层是 exports 指向的入口文件不存在，尚未到检查命名导出这一步。
- 第 2 题：修改源入口导出并重新构建的方向正确。按题设应修改 src/index.ts；直接重新导出内部函数也是可行写法，不一定要分开写 import 和 export。
- 判断范围：已观察到正确修复方向，但不能把第一题混合故障层级的表述当成精确排错能力已验证；等待后续实践巩固。

## 7. 教学记录

- 用户请求：“下一步”。
- 本轮讲解：依赖安装、模块解析、包入口与命名导出的关系；先构建共享包的条件。
- 用户作答：已收到，原文与反馈见第 6 节；追加追问“共享包的 exports 一般是手写的吗？”，答疑见第 8 节。
- 掌握判断：两题的修复方向正确；第一题仍需区分入口缺失与命名导出缺失，第二题源码扩展名已校准。实际配置与构建能力尚未验证。
- 下一步：优先处理 exports 配置维护方式的疑问，再通过最小实践巩固故障分层；执行安装前确认环境和具体操作。
- 本轮仅保存教学文档，不创建真实 package.json 或 tsconfig，不安装依赖、不执行构建或测试。

## 8. 追问：共享包的 exports 一般是手写的吗？

用户原话：“共享包的 exports 一般是手写的吗？”

### 回答

如果指 package.json 的 exports，通常由开发者维护，初始内容也可以由脚手架或模板生成。有些构建工具或自定义脚本可以根据配置生成它，但必须有相应机制，不能因为项目执行了构建就假定它自动出现。

本课采用两份独立配置：开发者在编译／打包配置中指定输入、输出，在 package.json 的 exports 中指定公开入口映射；构建工具按前者生成文件，消费者按后者解析导入。开发者负责让两者一致，不默认由 exports 驱动产物生成。

```json
{
  "exports": {
    ".": "./dist/index.js"
  }
}
```

这不是函数名清单，它声明的是包入口路径。因此：

- 从同一个根入口增加 parsePrice 等函数时，通常修改 src/index.ts 的模块导出并重新构建，不需要在 package.json 的 exports 中逐一添加函数名。
- 如果想新增 @dklns/shared/price 这样的公共导入子路径，或改变目标产物路径，才需要相应调整 exports。
- 例如新增子路径可以配置 "./price": "./dist/price.js"，但必须同时让构建产生这个文件，不能只写映射。
- TypeScript 编译器 tsc 默认不会因为编译源码而自动给 package.json 写入 exports；它生成哪些 JS 和声明文件取决于编译配置。
- package.json 的 exports 通常由开发者／模板／特定生成工具维护；源码里的 export 或重新导出通常由开发者编写；dist 里的对应 JS 导出通常来自编译／打包产物。
- 不建议以手动修改 dist 修复入口导出，源代码不改则下一次构建会覆盖临时修改。

### 本轮教学边界

暂不引入多条件导出、CommonJS 双格式、类型声明入口或发布自动化。用户本轮主动询问配置的维护方式，应先解释清楚，不直接推进更多配置。

区分入口文件缺失与命名导出缺失的精确性反馈已给出，尚未收到独立复述。后续在最小实践中用真实文件状态校准，不能把教师讲解当成新增掌握证据。

## 9. 追问：编译／打包工具会根据 exports 的配置来生成文件？

用户原话：“编译/打包工具会根据 exports 的配置来生成文件？”

### 教师澄清

通常不会默认如此。上一轮“开发者维护 exports，构建工具生成对应文件”的说法容易让人误以为 exports 是生成依据，这是教师表述不够明确，已修正文档，不将此追问简单归因于用户能力不足。

两条不同方向的链路：

```text
源码 + 编译／打包配置 → 生成 dist/index.js
消费者 import 包名 + exports 映射 → 定位 dist/index.js
```

例如在启用 JS 输出且其他配置有效的 tsc 项目中，rootDir: src、outDir: dist 可以使 src/index.ts 对应输出 dist/index.js；输出位置来自 tsconfig.json，而不是 exports。打包工具通常由自己的入口、输出目录、文件命名等选项决定产物。

如果只把 exports 的目标改为 ./dist/other.js，却不改变构建配置及其他相关输入，普通 tsc 构建不会因此改为生成 other.js；消费者会转而查找 other.js，文件不存在便解析失败。

例外：某些工具或插件可显式读取 exports 来推导构建入口，或根据构建配置反向生成 exports。必须确认该工具的约定，不能将其视为通用行为。另外，打包工具解析所消费依赖的导入时可能读取那个依赖的 exports，这和依据自己包的 exports 生成产物是两件事。

记忆句：构建配置决定“造什么、放哪里”，exports 决定“别人从哪里取”。它们应当对齐，但不会天然自动同步。

### 记录状态

解释后用户回复“明白了，下一步吧”。记录为理解确认，尚非独立复述或实践验证。随后进入 docs/mcp-monorepo-lesson-05.md 的最小练习；故障分层将在实践中复核。
