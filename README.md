# KG Studio — 知识图谱编辑管理

基于 `KG Studio.dc.html` 设计稿实现的知识图谱编辑器。左右两个以 Start / End 节点为中心的 N 跳子图，下方是连接关系列表。

**Vite 8 · React 19 · TypeScript 6 · Ant Design 6 · @antv/g6 5 · Zustand 5 · axios · MSW 2**

```bash
npm install
npm run dev          # 默认 mock 模式，无需任何后端即可跑通全部功能
```

---

## 切换 mock 与真实后端

**业务代码零改动** —— axios、拦截器、错误信封在两种模式下完全一致，mock 由 MSW 在 Service Worker 层拦截，请求在 devtools 的 Network 面板照常可见。

```bash
# 本地 mock（默认）
VITE_USE_MOCK=true npm run dev

# 接真实后端
VITE_USE_MOCK=false VITE_API_BASE_URL=https://kg.example.com/api npm run dev
```

## 配置 base URL

两层配置，**CI/CD 不需要为每个环境重新构建**：

| 层 | 位置 | 何时生效 |
|---|---|---|
| 构建期 | `.env.production` 的 `VITE_API_BASE_URL` | 兜底默认值 |
| 运行期 | `public/config.js` 的 `window.__APP_CONFIG__.apiBaseUrl` | **优先**，非空则覆盖构建期值 |

推荐做法：构建一次，部署时只替换 `config.js`。

```bash
npm run build
echo "window.__APP_CONFIG__={apiBaseUrl:'$API_BASE'};" > dist/config.js
```

需要为每个环境单独构建时才用构建期变量：

```bash
VITE_API_BASE_URL=https://staging.example.com/api npm run build
```

---

## 接口契约

统一信封 `{ code, data, message }`；`code !== 0` 由拦截器抛 `ApiError`，调用方只需处理这一种错误类型。

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/graph/stats` | 顶部 `14 NODES · 15 RELATIONS` |
| GET | `/nodes/tree?q=&limit=` | 搜索框下拉的 域 ▸ 类型 ▸ 节点 三层树 |
| GET | `/graph/neighborhood?centerId=&hops=&limit=` | N 跳邻域子图 |
| GET | `/graph/path?from=&to=` | 路径状态栏 + 两端已有关系 |
| GET | `/nodes/:id/links` | 单击节点 → 下方连接列表 |
| GET | `/links/:id` | 单击连线 → 单条关系详情 |
| GET | `/meta/taxonomy` | 编辑弹窗的 DOMAIN / TYPE 候选项 |
| POST · PATCH · DELETE | `/nodes` · `/nodes/:id` | 节点增改删 |
| POST · PATCH · DELETE | `/links` · `/links/:id` | 关系增改删 |
| POST | `/links/:id/reverse` | 反转方向 |

**图模型**：属性图而非纯三元组。节点属性随子图一次返回（卡片的 Type / Desc 不必二次查询），边有稳定 id（反转 / 删除可直接寻址）。

```jsonc
{
  "nodes": [{ "id": "a101", "label": "A101 System", "type": "Core Server",
              "domain": "Applications", "desc": "…" }],
  "edges": [{ "id": "e0", "source": "a101", "target": "auth",
              "label": "invokes", "predicate": "invokes", "directed": true }],
  "meta": { "centerId": "a101", "hops": 2, "truncated": false,
            "nodeCap": 200, "totalNodes": 6 }
}
```

约束：`UNIQUE(source, target, predicate)`（同一对节点可有多条不同语义的关系），禁止自环（422）。

完整契约见 [`docs/superpowers/specs/2026-09-13-kg-studio-design.md`](docs/superpowers/specs/2026-09-13-kg-studio-design.md)。

---

## 几个设计要点

**读写分离的并发策略。** 写操作（保存 / 新建 / 删除 / 反转 / 连断）走二次确认 → 全局蒙层 → 串行 → 并行刷新受影响的读。正因为用户被挡住，写路径不需要乐观更新与回滚。读操作（搜索 / 切中心 / 改跳数 / 点节点）不上蒙层，只在面板内 Spin，靠请求序号丢弃过期响应。

**URL 即状态。** `/kg?start=a101&end=dbb&hops=3` —— 视图可分享、可收藏、刷新不丢。

**跳数无上限。** 客户端只保证正整数，上限由服务端 `nodeCap`（默认 200）兜底，超出时 `meta.truncated` 为真，面板头部显示「已截断，显示 200 / 共 1,243」。节点数超过 120 时自动降级为简化渲染。

**相比设计稿原型的修正。** 原型把全量图放在内存里，几个问题只有搬到服务端才暴露：路径的逆向段箭头方向是错的（现由 `reversed` 标记修正）；`domain` 原本是前端硬编码的映射表（现为节点一等字段，可编辑）；新建节点原本先落库再弹框，取消会留下空壳（现为保存才 POST）。

---

## 命令

```bash
npm run dev        # 开发服务器（mock 模式）
npm run build      # 生产构建
npm run preview    # 预览构建产物
npm run test       # 单元 / 集成测试（watch）
npm run test:cov   # 带覆盖率
npm run e2e        # Playwright，Chrome / Firefox / Safari
npm run lint       # ESLint
npm run format     # Prettier
```

## 目录

```
src/
├── api/          类型 · axios 客户端 · 各资源模块
├── mocks/        内存图数据库 · MSW handlers · 种子数据
├── stores/       Zustand 五个 slice + URL 同步
├── graph/        G6 封装 · 节点卡片 · 布局配置
├── components/   按功能分目录
├── layouts/      应用外壳与侧边导航
├── pages/        kg-studio（实现页）· overview / placeholder（空白页）
├── locales/      en-US（默认）· zh-CN · zh-TW
└── styles/       设计令牌 · 全局样式
```

左侧导航目前只有**知识图谱**是实现页，其余为占位，路由已可切换。
