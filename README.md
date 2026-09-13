# KG Studio — 知识图谱编辑管理

一个知识图谱的可视化编辑器。左右两块画布分别以**起点**和**终点**节点为中心展开 N 跳邻域子图，中间显示两者之间的连接状态，下方列出选中元素的全部关系并可直接编辑。

界面按 Claude Design 的 `KG Studio.dc.html` 设计稿实现。

> **当前只实现了「知识图谱」这一个页面。** 左侧导航的其余入口是占位空白页，路由已可正常切换。

---

## 目录

- [快速开始](#快速开始)
- [技术栈](#技术栈)
- [架构](#架构)
- [文件夹结构](#文件夹结构)
- [配置与环境切换](#配置与环境切换)
- [接口契约](#接口契约)
- [测试](#测试)
- [命令速查](#命令速查)
- [实现要点](#实现要点)

---

## 快速开始

环境要求：**Node 22.12+ 或 24.x**、npm ≥ 10（开发时使用 Node 24.6 / npm 11.5）。

> Vite 8 本身只要 Node ≥ 20.19，但 Vitest 5 要求 `^22.12 || ^24 || >=26`。
> 在 Node 20 上可以 `npm run dev`，但 `npm run test` 跑不起来。

```bash
npm install
npm run dev
```

打开 **http://localhost:5173** 即可。根路径会自动跳转到 `/kg`。

默认就是 **mock 模式**，全部接口由 MSW 在本地拦截，**不需要任何后端**，开箱就能跑通搜索、编辑、反转、删除等所有功能。种子数据是设计稿里那 14 个节点、15 条关系。

### 先试试这些

| 操作 | 效果 |
|---|---|
| 在左侧输入框输入 `data` | 下拉出现 域 ▸ 类型 ▸ 节点 三层树 |
| 点树里的叶子节点 | 左侧画布以它为中心重新展开，URL 同步变化 |
| **单击**画布里的节点卡片 | 下方列出该节点的全部关系 |
| **双击**节点卡片 | 以该节点为中心重新展开，**并同时选中它**（下方立即列出它的关系） |
| **右键**节点或连线 | 打开编辑弹窗 |
| 按住**鼠标中键**拖动 | 在节点上＝移动该节点；在别处＝平移画布（左键不做拖拽） |
| 滚轮 | 缩放画布 |
| 改跳数输入框 | 试试输入 `0`、`3.9`、`abc`、`42` |
| 点关系行的「⇄ Reverse」 | 弹出确认框，写明反转前后的方向对比 |
| 复制地址栏 URL 到新标签页 | 视图完整还原 |

---

## 技术栈

| 关注点 | 选型 | 说明 |
|---|---|---|
| 构建 | **Vite 8** + TypeScript 6 | |
| UI | **React 19** + **Ant Design 6** | AntD 用于 Modal / Input / Tree / Select 等；画布、路径栏、关系行为手写，以贴合设计稿 |
| 图渲染 | **@antv/g6 5** | npm 依赖，非 CDN；动态 import，不进首屏包 |
| 状态 | **Zustand 5** + immer + devtools | 五个 slice 组成单一 store |
| 请求 | **axios** | 统一信封与错误归一 |
| Mock | **MSW 2** | Service Worker 层拦截，业务代码零感知 |
| 路由 | **react-router 7** | |
| 国际化 | **react-i18next** | 默认 en-US，另备 zh-CN / zh-TW |
| 测试 | **Vitest** + Testing Library + **Playwright** | |

---

## 架构

### 分层

```
┌──────────────────────────────────────────────────────────┐
│  组件层  components/ · pages/ · layouts/                  │
│  只负责渲染与派发动作，不发请求                              │
└───────────────────────────┬──────────────────────────────┘
                            │ useKgStore(selector)
┌───────────────────────────▼──────────────────────────────┐
│  状态层  stores/                                          │
│  graph · picker · selection · editor · ui 五个 slice       │
│  全部异步动作在这里，组件内不出现任何请求代码                  │
└───────────────────────────┬──────────────────────────────┘
                            │ api/*
┌───────────────────────────▼──────────────────────────────┐
│  接口层  api/                                             │
│  axios 实例 · 信封解包 · 错误归一 · token 注入位              │
└───────────────────────────┬──────────────────────────────┘
                            │ HTTP
              ┌─────────────┴─────────────┐
              ▼                           ▼
     ┌─────────────────┐         ┌─────────────────┐
     │  MSW（mock）     │         │   真实后端       │
     │  mocks/db.ts    │         │                 │
     └─────────────────┘         └─────────────────┘
```

**关键点：mock 与真实后端的切换只翻一个环境变量，上面三层代码完全不变。** 因为 MSW 拦截发生在网络层，axios、拦截器、错误信封、重试逻辑在两种模式下走的是同一条路径，请求在浏览器 devtools 的 Network 面板里照常可见。

### 数据流

以「单击一个节点」为例：

```
GraphPanel 收到 DOM 点击事件
   → selectNode('L', 'dbb')            [selection slice]
   → GET /nodes/dbb/links              [api/nodes.ts]
   → axios 拦截器解开 { code, data, message } 信封
   → 请求序号校验（过期响应直接丢弃）
   → set(state => state.links = data)  [immer 不可变更新]
   → RelationList 重新渲染
```

### 状态管理：五个 slice

| Slice | 职责 |
|---|---|
| `graph` | 两侧中心节点、跳数、两份子图、路径、统计；邻域与路径的加载 |
| `picker` | 两个搜索框的文本、下拉树、键盘高亮、搜索解析 |
| `selection` | 当前选中的节点或连线，以及它的关系列表 |
| `editor` | 编辑弹窗草稿、确认框、分类候选项，**以及全部写操作** |
| `ui` | 全局蒙层开关、提示消息 |

写操作集中在 `editor` slice，全部走同一条骨架：

```ts
const mutate = async (work) => {
  await withBlocking(async () => {
    await work()          // 写请求
    await refreshAll()    // 受影响的读并行刷新
  })
}
```

### 并发策略：读写分开处理

这是整个项目最需要理解的一点。

**写操作**（保存节点、新建节点、删除节点、删除关系、反转关系、连接/断开）：

```
点击 → 二次确认弹窗 → 确认
  → 全局蒙层 ON（延迟 250ms 显示，快请求不闪）
  → await 写请求
  → 并行拉取受影响的读：左子图 · 右子图 · 路径 · 统计 · 关系列表
  → 全部返回后蒙层 OFF → toast
```

蒙层挡住全部交互，保证同一时刻只有一个写请求在飞。**正因为用户被挡住，写路径不需要乐观更新与回滚** —— 直接落服务端返回值即可，少了一整块快照/还原代码。

后续的读也圈在同一个蒙层窗口内。一次写会同时波及左图、右图、路径栏标签、关系列表的端点名、顶部计数五处，蒙层提前撤掉的话用户会看到「左图已更新、右图还是旧的」这种半截状态。

**读操作**（搜索、切中心、改跳数、点节点、点连线）：

高频且由用户主动触发，**不上全局蒙层**（总不能一边打字一边糊层遮罩），只在对应面板内做局部 Spin，靠请求序号防竞态：

```ts
const ticket = seq.next('neighborhood:L')
const data = await getNeighborhood(...)
if (!seq.isCurrent('neighborhood:L', ticket)) return   // 过期响应，丢弃
```

没有这层守卫的话，快速切换中心节点时先发的慢请求会后返回，把新数据覆盖成旧的 —— 界面标着 B，画的却是 A 的邻居。

### URL 即状态

```
/kg?start=a101&end=dbb&hops=3
```

起点、终点、跳数三个视图参数同步在 URL 里，所以视图**可分享、可收藏、刷新不丢**。用 `replaceState` 而非 `pushState` 写回，否则每调一次跳数都会在浏览器历史里堆一条。

---

## 文件夹结构

```
kgedit/
├── public/
│   ├── config.js               运行期配置（部署时替换即可切环境）
│   └── mockServiceWorker.js    MSW 生成，勿手改
├── e2e/                        Playwright 端到端测试
│   ├── smoke.spec.ts           真实浏览器里 G6 能否画出节点
│   ├── kg-studio.spec.ts       完整交互链路
│   └── responsive.spec.ts      六档断点 + 视觉回归
├── docs/superpowers/
│   ├── specs/                  设计规格（接口契约的完整版本）
│   └── plans/                  实施计划
└── src/
    ├── api/                    ── 接口层 ──
    │   ├── types.ts            全部实体类型与业务错误码
    │   ├── client.ts           axios 实例、resolveBaseUrl、信封与错误归一
    │   ├── graph.ts            stats / neighborhood / path
    │   ├── nodes.ts            tree / taxonomy / links / 节点 CRUD
    │   └── links.ts            关系 CRUD + reverse
    │
    ├── mocks/                  ── 本地 mock ──
    │   ├── seed.ts             设计稿的 14 节点 15 关系
    │   ├── db.ts               内存图数据库（纯函数，可单测）
    │   ├── handlers.ts         MSW 路由 → db
    │   ├── browser.ts          浏览器 worker
    │   └── node.ts             测试用 server
    │
    ├── stores/                 ── 状态层 ──
    │   ├── useKgStore.ts       组合五个 slice
    │   ├── urlSync.ts          URL ⇄ store 双向同步
    │   └── slices/
    │       ├── graph.ts        中心 · 跳数 · 子图 · 路径 · 统计
    │       ├── picker.ts       搜索与下拉树
    │       ├── selection.ts    选中项与关系列表
    │       ├── editor.ts       编辑草稿 · 确认框 · 全部写操作
    │       └── ui.ts           蒙层 · 提示消息
    │
    ├── graph/                  ── G6 封装 ──
    │   ├── nodeCard.ts         节点卡片 HTML（全部插值经转义）
    │   ├── graphOptions.ts     布局与样式配置、简化阈值
    │   └── useG6Graph.ts       实例生命周期 · 差量更新 · 事件绑定
    │
    ├── components/             ── 按功能分目录，每个目录自带 CSS ──
    │   ├── node-picker/        搜索框 + 层级树下拉
    │   ├── path-status/        路径状态栏
    │   ├── graph-panel/        画布外壳 · 跳数输入 · 截断提示
    │   ├── link-toggle/        中间的连接/断开按钮
    │   ├── relation-list/      下方关系列表
    │   ├── editor-modals/      节点弹窗 · 关系弹窗 · 确认框
    │   └── blocking-overlay/   写操作蒙层
    │
    ├── layouts/app-shell/      侧边导航 · 顶栏 · 图标
    ├── pages/
    │   ├── kg-studio/          知识图谱编辑页（唯一实现页）
    │   ├── overview/           大盘概览（空白）
    │   └── placeholder/        通用占位页
    ├── router/                 路由表
    ├── locales/                en-US（默认）· zh-CN · zh-TW
    ├── theme/antdTheme.ts      AntD 主题令牌 + 两侧强调色
    ├── styles/
    │   ├── tokens.css          设计令牌（颜色 · 字体 · 圆角 · 动效）
    │   └── global.css          全局样式
    ├── hooks/                  useDebouncedCallback
    ├── lib/                    requestSeq（竞态守卫）· escape（HTML 转义）
    └── test/                   测试环境 setup 与共用 render 封装
```

**组织原则**：按功能而非按文件类型分目录，组件与其样式放在一起。单文件常态 200–400 行，硬上限 800 行。

---

## 配置与环境切换

### mock ↔ 真实后端

```bash
# 本地 mock（默认）
npm run dev

# 接真实后端
VITE_USE_MOCK=false VITE_API_BASE_URL=https://kg.example.com/api npm run dev
```

环境文件：

| 文件 | 用途 |
|---|---|
| `.env.development` | `npm run dev` 默认值，mock 开启 |
| `.env.production` | `npm run build` 默认值，mock 关闭 |
| `.env.test` | Vitest 使用 |
| `.env.example` | 带注释的模板 |

### base URL 的两层配置

CI/CD **不需要为每个环境重新构建**：

| 层 | 位置 | 优先级 |
|---|---|---|
| 运行期 | `public/config.js` 的 `window.__APP_CONFIG__.apiBaseUrl` | **高**（非空则生效） |
| 构建期 | `VITE_API_BASE_URL` | 兜底 |

推荐做法 —— 构建一次，部署时只替换 `config.js`：

```bash
npm run build
echo "window.__APP_CONFIG__={apiBaseUrl:'$API_BASE'};" > dist/config.js
```

确实需要为每个环境单独构建时才用构建期变量：

```bash
VITE_API_BASE_URL=https://staging.example.com/api npm run build
```

---

## 接口契约

统一信封：

```jsonc
{ "code": 0, "data": { /* ... */ }, "message": "" }
```

`code !== 0` 由拦截器抛 `ApiError(code, message, status)`；HTTP 非 2xx、网络中断也归一到同一种错误类型，**调用方只需处理 `ApiError` 一种**。

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/graph/stats` | 顶部 `14 NODES · 15 RELATIONS` |
| GET | `/nodes/tree?q=&limit=` | 搜索框下拉的三层树 |
| GET | `/graph/neighborhood?centerId=&hops=&limit=` | N 跳邻域子图 |
| GET | `/graph/path?from=&to=` | 路径状态栏 + 两端已有关系 |
| GET | `/nodes/:id/links` | 单击节点 → 关系列表 |
| GET | `/links/:id` | 单击连线 → 单条关系 |
| GET | `/meta/taxonomy` | 编辑弹窗的 DOMAIN / TYPE 候选项 |
| POST / PATCH / DELETE | `/nodes` · `/nodes/:id` | 节点增改删 |
| POST / PATCH / DELETE | `/links` · `/links/:id` | 关系增改删 |
| POST | `/links/:id/reverse` | 反转方向 |

### 图模型：属性图，而非纯三元组

```jsonc
{
  "nodes": [{
    "id": "a101", "label": "A101 System", "type": "Core Server",
    "domain": "Applications", "desc": "Frontend app tier…"
  }],
  "edges": [{
    "id": "e0", "source": "a101", "target": "auth",
    "label": "invokes", "predicate": "invokes", "directed": true
  }],
  "meta": {
    "centerId": "a101", "hops": 2,
    "truncated": false, "nodeCap": 200, "totalNodes": 6
  }
}
```

选它而非三元组的理由：节点属性随子图一次返回，卡片的 Type / Desc 不需要二次查询；边有稳定 id，反转、删除、改标签都能直接寻址。

**约束**：`UNIQUE(source, target, predicate)` —— 同一对节点之间允许多条不同语义的关系；**禁止自环**，服务端返回 422。

完整契约见 [`docs/superpowers/specs/2026-09-13-kg-studio-design.md`](docs/superpowers/specs/2026-09-13-kg-studio-design.md)。

---

## 测试

```bash
npm run test        # 单元 / 集成，watch 模式
npm run test:cov    # 带覆盖率报告
npm run e2e         # 端到端（Chromium）
```

当前状态：**279 个单元/集成测试，66 个 E2E，行覆盖率 91%**（阈值 80%）。

### 三层测试

**单元与集成（Vitest，25 个文件）**

| 位置 | 覆盖 |
|---|---|
| `src/mocks/__tests__/db.test.ts` | 邻域展开与截断、逆向路径标记、平行边唯一性、反转撞重复、连带删除 |
| `src/api/__tests__/` | 信封解包、错误归一、运行期/构建期 base URL、**经 MSW 的完整请求链路** |
| `src/stores/__tests__/` | 跳数钳制、**过期响应丢弃**、写操作蒙层与回滚、删除后的空状态 |
| `src/components/**/__tests__/` | 各组件的可访问性、交互与边界 |
| `src/graph/__tests__/` | 节点卡片的 **XSS 转义**（实际解析 DOM 断言无注入） |

E2E 之外的测试都跑在 **MSW 的 node server** 上，走的是和浏览器一致的 handler 与内存数据库。

**端到端（Playwright，Chromium）**

`e2e/smoke.spec.ts` 验证真实浏览器里 G6 确实画出了节点卡片 —— 组件测试里 G6 是被 mock 掉的，这是唯一的真实渲染验证。
`e2e/kg-studio.spec.ts` 跑完整链路：搜索 → 选中 → 查看关系 → 编辑 → 反转 → 删除 → 刷新还原。
`e2e/responsive.spec.ts` 覆盖 320 / 375 / 768 / 1024 / 1440 / 1920 六档，断言无横向溢出，并做视觉回归。

E2E 跑在**构建产物 + MSW** 上，不依赖任何后端。首次运行会自动构建并启动预览服务器。

### 两个已知的测试注意事项

- **视觉回归基线是平台相关的**（当前是 `*-darwin.png`）。在 Linux CI 上首次运行会重新生成，需要提交一份对应基线。画布区域用 `mask` 遮掉了 —— 力导向布局每次节点位置都不同，不遮会一直假报警。
- **E2E 并发限制为 2，并保留一次重试**。力导向布局很吃 CPU，并发下图渲染的等待偶发超时；这类用例单独跑都稳定通过。真实缺陷在重试后依然会失败。
- **只跑 Chromium**。本项目只面向 Chrome，Playwright 的 projects 里没有配 Firefox / WebKit。要加回来在 `playwright.config.ts` 里补上 project 并重新生成对应的视觉基线即可。

---

## 命令速查

| 命令 | 说明 |
|---|---|
| `npm run dev` | 开发服务器，http://localhost:5173 |
| `npm run build` | 生产构建到 `dist/` |
| `npm run preview` | 本地预览构建产物 |
| `npm run test` | 单元测试（watch） |
| `npm run test:cov` | 单元测试 + 覆盖率 |
| `npm run e2e` | 端到端测试（Chromium） |
| `npm run lint` | ESLint |
| `npm run format` | Prettier 格式化 |

首次跑 E2E 需要先装浏览器：

```bash
npx playwright install chromium
```

---

## 实现要点

### 性能

首屏 JS **274.7 KB gzip**（预算 300 KB）。G6（402 KB gzip）与编辑页（55 KB）通过路由懒加载与动态 import 排除在首屏之外。

画布数据更新走 `graph.setData()` **差量更新**而非销毁重建 —— 否则每次编辑后力导向布局都会重新散开，用户会丢失对图的心智位置。

节点数超过 **120** 时自动降级为简化渲染（只画标题的 canvas 节点）：G6 的 HTML 节点是每节点一个真实 DOM 元素，几百个卡片加力导向会卡到不可用。

### 安全

节点卡片经 `innerHTML` 注入 G6，内容来自用户输入，因此**每一处插值都过 `escapeHtml`**。对应的测试不是字符串匹配，而是真正解析 DOM 断言没有多出任何属性或元素。

axios 拦截器预留了 token 注入位与 401 处理钩子，接真实后端时不必逐个请求改。

### 可访问性

画布对键盘用户不可达，因此**下方的关系列表是访问全部关系与操作的唯一键盘路径**，三个动作都是真 `<button>`。搜索下拉支持方向键 / Enter / Esc 完整键盘操作。弹窗的焦点陷阱由 E2E 在真实浏览器中验证（jsdom 不触发 rc-dialog 依赖的过渡事件，验证不了）。

### 鼠标操作的分工

| 操作 | 行为 |
|---|---|
| 左键单击 | 选中节点 / 连线 |
| 左键双击 | 以该节点为中心重新展开，并同时选中 |
| 右键 | 打开编辑弹窗（图区域内不弹浏览器菜单） |
| 路径栏节点 · 左键 | 聚焦到**起点**面板，并同时选中 |
| 路径栏节点 · 右键 | 聚焦到**终点**面板，并同时选中 |
| **中键拖动节点** | 只移动这一个节点，其余节点不动，连线跟着被拉扯 |
| **中键拖动别处** | 平移整张图（空白画布与连线上都算） |
| 滚轮 | 缩放 |

**左键刻意不参与任何拖拽。** 这不只是偏好问题，它顺带根除了一个真实缺陷：右键的 `pointerdown` 会让 G6 进入拖拽跟踪，紧接着 `contextmenu` 打开编辑弹窗，`pointerup` 被弹窗吞掉，G6 永远等不到抬起 —— 弹窗一关，鼠标一动节点就跟着跑。

判定逻辑收敛在 `graph/graphOptions.ts`，分成正交的两半：

- **按哪个键** —— `isMiddleButtonDrag`。G6 合成的 `dragstart` 事件上 `button` 恒为 `-1`，能区分按键的只有 `buttons` 位掩码（1=左 / 2=右 / 4=中）；上面那个补发的 dragstart 发生时 `buttons` 为 `0`，因此一并被挡掉。
- **拖的是谁** —— `canDragNode`（命中节点）与 `canPanCanvas`（命中节点以外）。两者互斥，分别喂给 `drag-element` 和 `drag-canvas`。

第二半容易被忽略：G6 内置的 `enable` 默认值本身就带命中类型判断（`drag-canvas` 只认 `canvas`，`drag-element` 只认 `node`/`combo`），一旦传入自定义 `enable`，这层判断会被整个替换掉。只按按键过滤的话，中键拖节点会同时满足两个行为 —— 节点在动，整张图也跟着平移。

`canPanCanvas` 用的是「非节点」而非「等于 canvas」：连线又细又难躲，蹭到一条边就平移失灵的手感不可接受。

画布容器上还挡掉了中键的浏览器默认行为（Windows / Linux 的自动滚动、X11 的主选区粘贴）。

**右键菜单的屏蔽范围仅限两块图区域。** 在画布内右键点节点、连线或空白处，一律只弹应用自己的编辑弹窗；页面其余部分（搜索框、路径栏、关系列表、导航）的右键保持浏览器默认行为，复制粘贴等仍可正常使用。

**「聚焦」是一个动作，不是两个。** 双击节点、点击路径栏上的节点，语义都是「把它设为某侧中心，并选中它」，因此收敛到 store 的 `focusNode(side, id)` 一个 action，两个请求并行发出。双击前置的那次单击由 250ms 去重窗口挡掉，所以关系接口只会被请求一次。

右键菜单的屏蔽以「该处右键是否有应用动作」为准：图区域内与路径栏节点上有（打开弹窗 / 聚焦终点），故屏蔽；关系列表、搜索框、导航等处没有，保留浏览器默认。

### 相比设计稿原型的修正

设计稿是把全量图放在内存里的原型，有几个问题只有搬到服务端才暴露：

| 问题 | 处理 |
|---|---|
| 路径遍历按无向走，渲染却一律画向右箭头，逆向段箭头方向是错的 | 服务端返回 `reversed` 标记，逆向段渲染为 `◀──(label)──` |
| `domain` 是前端硬编码的映射表，用户新建的类型只能掉进 Uncategorized | 升为节点一等字段，编辑弹窗可输入并带候选 |
| 新建节点先落库再弹框，点取消会在库里留下空壳 | 先弹空白弹窗，**点保存才 POST** |
| 中间连接按钮是二元的「已连接/未连接」 | 允许平行边后二元状态表达不了，改为：0 条时新建，≥1 条时列出让用户选断哪条 |
| 路径与统计在前端算 | 客户端只持有两份子图，改为接口 |

### 明确不做的

软删除与撤销 · 乐观锁与冲突合并（多人同时编辑为后写覆盖）· 自环 · 登录页 · 除知识图谱编辑页外的页面实现。
