# KG Studio — 知识图谱编辑管理 · 设计规格

- 日期：2026-09-13
- 设计稿：`KG Studio.dc.html`（Claude Design 项目 `7164fa2a-85a5-46f3-a07c-dd256ac6ad44`）
- 状态：已确认，待实施

---

## 1. 范围

把设计稿中的单屏知识图谱编辑器实现为可对接真实后端的前端应用。设计稿本身是一个把全量图数据放在内存里的原型，本次实现的核心变化是**把数据源换成后端接口**，并补齐原型中因为"数据全在手上"而不存在的那些问题（路径计算、统计、截断、空状态）。

左侧导航只实现当前这一个页面，其余留空白页但路由可切换。

---

## 2. 技术栈

| 关注点 | 选型 |
|---|---|
| 构建 | Vite 7 + TypeScript |
| UI | React 19 + Ant Design 5 |
| 图渲染 | @antv/g6 v5（npm 依赖，非 CDN） |
| 状态 | Zustand 5 + immer + devtools |
| 请求 | axios + 统一封装 |
| Mock | MSW 2（Service Worker 层拦截） |
| 路由 | react-router 7 |
| i18n | react-i18next，默认 en-US |
| 测试 | Vitest + Testing Library + Playwright |

---

## 3. 目录结构

    src/
    ├── api/           client.ts · types.ts · nodes.ts · links.ts · graph.ts
    ├── mocks/         browser.ts · node.ts · handlers.ts · db.ts · seed.ts
    ├── stores/        useKgStore.ts + slices/{graph,picker,selection,editor,ui}.ts
    ├── graph/         useG6Graph.ts · nodeCard.ts · graphOptions.ts · layout.ts
    ├── components/    按功能分目录，见 §7
    ├── layouts/       app-shell/
    ├── pages/         kg-studio/ · overview/ · placeholder/
    ├── locales/       en-US.json · zh-CN.json · zh-TW.json
    ├── styles/        tokens.css · global.css
    ├── theme/         antdTheme.ts
    └── lib/           request-seq.ts · format.ts · escape.ts

约束：单文件 200–400 行为常态，800 行为硬上限；按功能而非按文件类型分目录。

---

## 4. 数据模型

采用**属性图**（property graph），而非纯三元组。理由：节点属性随子图一次返回，卡片的 Type / Desc 不需要二次查询；边有稳定 id，反转 / 删除 / 改标签都可直接寻址。

```ts
interface KgNode {
  id: string
  label: string          // 卡片标题
  type: string           // 如 'Relational DB'
  domain: string         // 如 'Data Stores'，下拉树第一层
  desc: string
  degree?: number        // 服务端给出，用于空搜索词时按度数排序
  props?: Record<string, unknown>
}

interface KgEdge {
  id: string
  source: string
  target: string
  label: string          // 展示用
  predicate: string      // 语义标识，参与唯一性约束
  directed: true
  props?: Record<string, unknown>
}

// 下方连接列表用，端点已解析，避免 N 次查表
interface LinkDetail extends Omit<KgEdge, 'source' | 'target'> {
  source: { id: string; label: string }
  target: { id: string; label: string }
  createdAt: string
  updatedAt: string
}

interface GraphPayload {
  nodes: KgNode[]
  edges: KgEdge[]
  meta: {
    centerId: string
    hops: number
    truncated: boolean
    nodeCap: number
    totalNodes: number   // 未截断时的真实规模
  }
}
```

**图约束**

- 唯一性：`UNIQUE(source, target, predicate)` —— 同一对节点之间允许多条不同语义的关系
- 禁止自环：`source === target` 服务端返回 422
- 边有向；遍历邻域时按无向处理，展示时保留方向

---

## 5. API 契约

统一响应信封：

```json
{ "code": 0, "data": { }, "message": "" }
```

`code !== 0` 时 axios 拦截器抛 `ApiError(code, message)`。HTTP 层非 2xx 同样归一成 `ApiError`。

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/graph/stats` | 顶部 `14 NODES · 15 RELATIONS` |
| GET | `/api/nodes/tree?q=&limit=` | ① 输入框下拉的层级树 |
| GET | `/api/meta/taxonomy` | 编辑弹窗的 DOMAIN / TYPE 候选项 |
| GET | `/api/graph/neighborhood?centerId=&hops=&limit=` | ② N 跳邻域子图 |
| GET | `/api/graph/path?from=&to=` | 路径状态栏 + Start/End 间已有关系 |
| GET | `/api/nodes/:id/links` | ③ 单击节点 → 下方连接列表 |
| GET | `/api/links/:id` | ④ 单击连线 → 单条关系详情 |
| POST | `/api/nodes` | 新建节点 |
| PATCH | `/api/nodes/:id` | 编辑节点 |
| DELETE | `/api/nodes/:id` | 删除节点（连带关系） |
| POST | `/api/links` | 新建关系 |
| PATCH | `/api/links/:id` | 编辑关系标签 |
| POST | `/api/links/:id/reverse` | 反转方向 |
| DELETE | `/api/links/:id` | 删除关系 |

**层级树响应**（服务端完成分组，前端不再自己算 domain）

```json
{
  "total": 14,
  "tree": [{
    "key": "d:Applications", "label": "APPLICATIONS", "count": 5,
    "children": [{
      "key": "d:Applications|t:Service", "label": "Service", "count": 2,
      "children": [
        { "key": "n:appc", "nodeId": "appc", "label": "Application C",
          "meta": "Order orchestration service…" }
      ]
    }]
  }]
}
```

- `q` 为空时不返回全量，按 `degree` 取 Top 50
- 有 `q` 时全部展开；无 `q` 时默认折叠到第二层

**路径响应**

```json
{
  "found": true,
  "segments": [
    { "node": { "id": "a101", "label": "A101 System" } },
    { "node": { "id": "gwd", "label": "Gateway D" },
      "edge": { "id": "e7", "label": "reads", "reversed": false } }
  ],
  "directLinks": []
}
```

`reversed` 解决设计稿的一个语义缺陷：原型遍历时把边当无向走，渲染却一律画向右箭头，逆向段的箭头是错的。逆向段渲染为 `◀──(label)──`。

`directLinks` 是 Start 与 End 之间已存在的关系数组，供中间那颗连接按钮使用。

**删除节点响应**

```json
{ "deletedNodeId": "dbb", "deletedLinkIds": ["e8", "e9", "e10"] }
```

前端据此就地剪枝，不必重新拉取。

---

## 6. 状态管理

单一 Zustand store，按 slice 组织。所有异步动作走 `src/api/*`，组件内不发请求。

| Slice | 内容 |
|---|---|
| `graph` | startId · endId · hops · leftSub · rightSub · path · stats |
| `picker` | qStart · qEnd · openSide · treeL · treeR · highlighted · collapsedKeys |
| `selection` | sel {side, kind, id} · links · loading |
| `editor` | nodeDraft · linkDraft · confirm · dirty |
| `ui` | blocking · locale |

**读写分离的并发策略**

*写操作*（保存节点、新建节点、删除节点、删除关系、反转关系、连接 / 断开）：
二次确认 → 全局蒙层 → 串行执行。因为用户被挡住，**不需要乐观更新与回滚**，直接落服务端返回值。蒙层延迟 250ms 显示，避免快请求闪烁；蒙层期间屏蔽 ESC。

*读操作*（搜索树、切中心、改 hops、单击节点、单击连线）：
高频且用户主动触发，不上全局蒙层，只在对应面板内做局部 Spin。用请求序号防竞态：

```ts
const seq = ++state.seqNeighborhood
const data = await api.neighborhood(...)
if (seq !== get().seqNeighborhood) return   // 过期响应直接丢弃
```

**写操作完整时序**

    点击 → 确认弹窗 → 确认
      → 蒙层 ON（延迟 250ms）
      → await 写请求
      → 并行拉取受影响的读：左子图 · 右子图 · 路径 · 统计 · 连接列表
      → 全部返回后蒙层 OFF → toast

后续读圈在同一个蒙层内，避免出现"左图已更新、右图还是旧的"的半截状态。失败则蒙层撤下、弹错误、状态不动。

**URL 即状态**

`/kg?start=a101&end=dbb&hops=2`。store 初始化从 URL 读取，变更时 `replaceState`。视图可分享、可收藏、刷新不丢。

---

## 7. 交互规格

### 7.1 节点选择器（左右各一）
输入框 + 下拉层级树（域 ▸ 类型 ▸ 节点）。输入防抖 300ms 触发 `/nodes/tree`。方向键上下在叶子节点间移动，Enter 选中，Esc 关闭。两条入口互不相同：**从树上点选叶子**直接以该节点为中心重新拉取子图；**点 Search 按钮**则拿输入框里的文本去解析（先精确匹配 label，再退回模糊匹配），命中才居中，未命中显示黄色提示行。左侧强调色 `#4ade80`，右侧 `#60a5fa`。

### 7.2 路径状态栏
展示 Start → End 最短路径，逆向段箭头反向。节点标签左键点击 → 设为 Start，右键 → 设为 End。无路径时显示提示文案。

### 7.3 图面板（左右各一）
G6 v5，`d3-force` 布局，参数沿用设计稿（link distance 260 / manyBody -520 / collide 118）。节点为 HTML 类型，卡片 184×112，内容经 HTML 转义后注入。中心节点带强调色描边与光晕并加 ★。

- 数据更新走 `graph.setData()` 差量，不销毁重建，避免每次编辑后布局重新散开
- 边类型 `quadratic`，平行边按弧度错开
- 单击节点 → 拉取该节点全部连接，填充下方列表
- 双击节点 → 以该节点重新居中（与单击加 250ms 去重，避免白发一次请求）
- 右键节点 / 连线 → 打开编辑弹窗
- 单击连线 → 拉取该条关系详情
- 超过 `nodeCap`（默认 200）时面板头部显示「已截断，显示 200 / 1,243」；超阈值自动降级为 canvas 简化节点（仅标题），不再渲染 HTML 卡片

### 7.4 中间连接按钮
设计稿的二元 linked / not-linked 在允许平行边后已无法表达，改为：

- `directLinks.length === 0`：显示断链图标，点击 → 弹关系标签编辑框，保存才 POST
- `directLinks.length >= 1`：显示连接图标 + 条数，点击 → 弹出列表逐条选择断开，每条各自二次确认

### 7.5 连接关系列表
选中节点时列出其全部关系，选中连线时只列该条。每行：序号 · `[源]` ══ 标签 ══▶ `[目标]` · 编辑 / 反转 / 删除。源与目标若正好是 Start / End，用对应强调色高亮。

反转与删除均需二次确认，确认框展示具体变化：

    Reverse this relation?
      Now    [Gateway D] ──stores──▶ [Database B]
      After  [Database B] ──stores──▶ [Gateway D]

（文案默认 en-US，本文档中的中文示例仅为说明）

### 7.6 节点编辑弹窗
字段：TITLE · TYPE · DOMAIN · DESCRIPTION。DOMAIN 为可输入下拉，候选取自现有 domain 列表 —— 设计稿缺这个字段，导致新类型只能掉进 Uncategorized 且界面上无法归类。

新建节点：先弹空白弹窗，**点保存才 POST**。取消则什么都不发生，不会在库里留下空壳节点。

面板头部的 `+` 按钮走同一条新建流程：弹空白弹窗 → 保存 → POST → 成功后把新节点设为该侧中心。取消则该侧中心不变。

关闭时若有未保存改动，二次确认。

### 7.7 hops 输入
`InputNumber`，`min={1}`，`precision={0}`，整数，无上限。≤0 或非法输入回弹为 1。上限交由服务端 `nodeCap` 兜底并通过 `meta.truncated` 反馈。左右两个面板共用同一个 hops（沿用设计稿）。

### 7.8 空状态
- 删除的节点正好是另一侧中心：那一侧清空为"请选择节点"，不自动跳到别的节点
- 新建的孤立节点：面板只显示单张卡片，正常
- Start 与 End 为同一节点：连接按钮禁用并提示

---

## 8. 配置与环境切换

两层，CI/CD 不需要为每个环境重新构建：

```
VITE_API_BASE_URL                 构建期默认值（.env.development / .env.production）
window.__APP_CONFIG__.apiBaseUrl  运行期覆盖（public/config.js）
VITE_USE_MOCK=true                启动前挂载 MSW
```

`resolveBaseUrl()` 优先取运行期值。构建一次、换 `config.js` 即可部署到任意环境。

Mock 模式只翻一个开关，**业务代码零改动** —— axios、拦截器、错误信封在 mock 与真实模式下完全一致，请求在 devtools Network 面板照常可见。

---

## 9. 国际化

react-i18next，默认 `en-US`（设计稿英文文案原样作为 en 包），另备 `zh-CN`、`zh-TW`。AntD 的 `ConfigProvider locale` 随之切换。语言选择持久化到 localStorage。

---

## 10. 错误处理

| 类别 | 处理 |
|---|---|
| 网络不可达 | toast「网络连接失败」+ 面板内重试按钮 |
| 401 | 拦截器预留钩子（当前无登录页，先记录并提示） |
| 422 业务校验（自环、重复关系） | 弹窗内联字段错误 |
| 5xx | toast + 保留当前状态不动 |
| 写失败 | 蒙层撤下、状态不动（未提前修改过） |

axios 拦截器预留 token 注入位，接真后端时不必逐个请求改。

**不做并发控制**：多人同时编辑同一节点为后写覆盖。以后要加乐观锁只需给实体加 `version` 字段、PATCH 回传、处理 409，api 层形状不变。

---

## 11. 性能

- JS 预算 < 300kb gzip（应用类页面）。G6 动态 import，不进首屏包
- 动画只走 transform / opacity
- 图数据更新差量化，避免布局重算
- 独立读请求并行发出，不串成瀑布

---

## 12. 可访问性

- 弹窗焦点陷阱（AntD 提供）
- 选择器支持完整键盘操作（方向键 / Enter / Esc）
- 图本身对键盘用户不可达，**下方连接列表是访问全部关系与操作的键盘可达路径**，需保证其可 Tab 可操作
- 强调色与背景对比度校验

---

## 13. 测试

单元（Vitest）：树构建 · 邻域归一化 · hops 钳制 · 信封解包 · 请求序号丢弃 · store 各 action（配 MSW node server）。
E2E（Playwright）：搜索 → 选中 → 查看关系 → 编辑 → 反转 → 删除 全链路；320 / 768 / 1024 / 1440 视觉回归。
覆盖率目标 80%。

---

## 14. 明确不做

软删除与撤销 · 乐观锁与冲突合并 · 自环 · 登录页 · 除知识图谱编辑页外的任何页面实现（仅留空白页与路由）
