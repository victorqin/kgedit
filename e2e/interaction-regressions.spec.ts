import { test, expect } from '@playwright/test'

/**
 * 两个从真实使用中发现的交互缺陷的回归测试。
 * 两个都只在真实浏览器里才暴露得出来，jsdom 复现不了。
 */

test.describe('拖拽只认中键', () => {
  test('左键拖动节点不再移动它 —— 左键只负责选择', async ({ page }) => {
    await page.goto('/kg?start=a101&end=dbb&hops=2')
    const card = page.locator('[data-node-id="a101"]').first()
    await card.waitFor({ timeout: 25_000 })
    await page.waitForTimeout(1500)

    const before = (await card.boundingBox())!
    const cx = before.x + before.width / 2
    const cy = before.y + before.height / 2

    await page.mouse.move(cx, cy)
    await page.mouse.down({ button: 'left' })
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(cx + i * 14, cy + i * 9)
      await page.waitForTimeout(20)
    }
    await page.mouse.up({ button: 'left' })
    await page.waitForTimeout(400)

    const after = (await card.boundingBox())!
    const moved = Math.hypot(after.x - before.x, after.y - before.y)
    expect(moved, `左键把节点拖走了 ${Math.round(moved)}px`).toBeLessThan(5)
  })

  test('中键拖动节点正常工作', async ({ page }) => {
    await page.goto('/kg?start=a101&end=dbb&hops=2')
    const card = page.locator('[data-node-id="a101"]').first()
    await card.waitFor({ timeout: 25_000 })
    await page.waitForTimeout(1500)

    const before = (await card.boundingBox())!
    const cx = before.x + before.width / 2
    const cy = before.y + before.height / 2

    await page.mouse.move(cx, cy)
    await page.mouse.down({ button: 'middle' })
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(cx + i * 14, cy + i * 9)
      await page.waitForTimeout(20)
    }
    await page.mouse.up({ button: 'middle' })
    await page.waitForTimeout(400)

    const after = (await card.boundingBox())!
    const moved = Math.hypot(after.x - before.x, after.y - before.y)
    expect(moved, '中键没能拖动节点').toBeGreaterThan(40)
  })

  test('关闭编辑弹窗后节点不会跟着鼠标跑', async ({ page }) => {
    // 右键 pointerdown 后 contextmenu 打开弹窗，pointerup 被弹窗吞掉，
    // G6 里留下没清掉的按下记录。弹窗关闭后鼠标一动就会补发 dragstart。
    await page.goto('/kg?start=a101&end=dbb&hops=2')
    const card = page.locator('[data-node-id="a101"]').first()
    await card.waitFor({ timeout: 25_000 })
    await page.waitForTimeout(1500)

    const before = (await card.boundingBox())!

    await card.click({ button: 'right' })
    await page.getByRole('dialog').waitFor()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()

    await page.mouse.move(before.x + 60, before.y + 40)
    await page.mouse.move(before.x + 260, before.y + 200, { steps: 12 })
    await page.waitForTimeout(400)

    const after = (await card.boundingBox())!
    const moved = Math.hypot(after.x - before.x, after.y - before.y)
    expect(moved, `弹窗关闭后节点漂移了 ${Math.round(moved)}px`).toBeLessThan(5)
  })
})

test.describe('断开连接的弹层', () => {
  test('点击后弹层保持打开且可交互', async ({ page }) => {
    // gwd -> dbb 是种子数据里的 e8，两端直连
    await page.goto('/kg?start=gwd&end=dbb&hops=2')
    await page.locator('[data-node-id]').first().waitFor({ timeout: 25_000 })

    const toggle = page.getByRole('button', { name: /LINKED/i })
    await expect(toggle).toBeVisible()
    await toggle.click()

    const popover = page.locator('.ant-popover:not(.ant-popover-hidden)')
    await expect(popover).toBeVisible()
    await expect(popover.getByText('stores')).toBeVisible()

    // 停留足够久，确认它不是一闪而过
    await page.waitForTimeout(1200)
    await expect(popover).toBeVisible()

    // 并且真的能点进去
    await popover.getByRole('button', { name: 'Cut', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByText(/cannot be undone/)).toBeVisible()
  })

  test('从弹层里断开会真的删掉那条关系', async ({ page }) => {
    await page.goto('/kg?start=gwd&end=dbb&hops=2')
    await page.locator('[data-node-id]').first().waitFor({ timeout: 25_000 })
    await expect(page.getByText('14 NODES · 15 RELATIONS')).toBeVisible()

    await page.getByRole('button', { name: /LINKED/i }).click()
    const popover = page.locator('.ant-popover:not(.ant-popover-hidden)')
    await popover.getByRole('button', { name: 'Cut', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()

    await expect(page.getByText('14 NODES · 14 RELATIONS')).toBeVisible()
    await expect(page.getByText('NOT LINKED — CLICK TO JOIN')).toBeVisible()
  })
})

test.describe('双击节点', () => {
  test('在重新聚焦的同时选中该节点', async ({ page }) => {
    await page.goto('/kg?start=a101&end=dbb&hops=2')
    await page.locator('[data-node-id]').first().waitFor({ timeout: 25_000 })
    await page.waitForTimeout(1200)

    // 起手没有任何选中
    await expect(page.getByText('NOTHING SELECTED')).toBeVisible()

    await page.locator('[data-node-id="gwd"]').first().dblclick()

    // 重新聚焦：URL 与中心节点都变了
    await expect(page).toHaveURL(/start=gwd/)
    await expect(page.locator('[data-center="1"]').first()).toContainText('Gateway D')

    // 同时被选中：下方列出它的全部关系
    await expect(page.getByText(/SELECTED NODE \[Gateway D\]/)).toBeVisible()
    await expect(page.locator('.relation-row').first()).toBeVisible()

    // 输入框必须跟着中心走，不能停在旧节点上
    await expect(page.getByRole('combobox', { name: 'Start node search' })).toHaveValue('Gateway D')
  })

  test('双击不会发出重复的关系请求', async ({ page }) => {
    // MSW 在 Service Worker 内应答，请求不经过浏览器网络层，page.route 拦不到；
    // 因此在页面里包一层 XHR 自己数。
    await page.addInitScript(() => {
      const w = window as unknown as { __linkCalls: number }
      w.__linkCalls = 0
      const open = XMLHttpRequest.prototype.open
      XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest) {
        if (/\/api\/nodes\/[^/]+\/links/.test(String(url))) w.__linkCalls += 1
        return open.call(this, method, url as string, ...(rest as []))
      } as typeof open
    })
    await page.goto('/kg?start=a101&end=dbb&hops=2')
    await page.locator('[data-node-id]').first().waitFor({ timeout: 25_000 })
    await page.waitForTimeout(1200)

    const count = () =>
      page.evaluate(() => (window as unknown as { __linkCalls: number }).__linkCalls)

    const before = await count()
    await page.locator('[data-node-id="gwd"]').first().dblclick()
    await expect(page.getByText(/SELECTED NODE \[Gateway D\]/)).toBeVisible()
    await page.waitForTimeout(800)

    // 双击会先触发一次 click，那次被 250ms 去重窗口挡掉了
    expect((await count()) - before).toBe(1)
  })
})

test.describe('图区域内屏蔽浏览器右键菜单', () => {
  /**
   * 探针挂在指定元素上。图容器上的右键处理会 stopPropagation，事件到不了
   * document —— 但 stopPropagation 不影响同一元素上的其他监听器，
   * 而且我们后注册，所以能读到应用处理完之后的 defaultPrevented。
   */
  const recordContextMenu = (page: import('@playwright/test').Page, selector: string) =>
    page.evaluate((sel) => {
      const w = window as unknown as { __ctx: boolean[] }
      w.__ctx = []
      const target = sel === 'document' ? document : document.querySelector(sel)!
      target.addEventListener('contextmenu', (e) => w.__ctx.push(e.defaultPrevented), false)
    }, selector)

  const lastPrevented = (page: import('@playwright/test').Page) =>
    page.evaluate(() => {
      const w = window as unknown as { __ctx: boolean[] }
      return w.__ctx.at(-1) ?? null
    })

  test('右键节点卡片时屏蔽', async ({ page }) => {
    await page.goto('/kg?start=a101&end=dbb&hops=2')
    await page.locator('[data-node-id]').first().waitFor({ timeout: 25_000 })
    await recordContextMenu(page, '.graph-panel--L .graph-panel__body > div')

    await page.locator('[data-node-id="a101"]').first().click({ button: 'right' })
    expect(await lastPrevented(page)).toBe(true)
  })

  test('右键图内空白画布时同样屏蔽', async ({ page }) => {
    await page.goto('/kg?start=a101&end=dbb&hops=2')
    await page.locator('[data-node-id]').first().waitFor({ timeout: 25_000 })
    await page.waitForTimeout(1200)
    await recordContextMenu(page, '.graph-panel--L .graph-panel__body > div')

    // 面板左上角，确认那里没有节点卡片
    const body = (await page.locator('.graph-panel--L .graph-panel__body').boundingBox())!
    const x = body.x + 12
    const y = body.y + 12
    const onCard = await page.evaluate(
      ([px, py]) => Boolean((document.elementFromPoint(px, py) as HTMLElement)?.closest('[data-node-id]')),
      [x, y],
    )
    expect(onCard, '取点落在了节点卡片上，换个位置').toBe(false)

    await page.mouse.click(x, y, { button: 'right' })
    expect(await lastPrevented(page)).toBe(true)
  })

  test('图区域之外的右键保留浏览器默认行为', async ({ page }) => {
    await page.goto('/kg?start=a101&end=dbb&hops=2')
    await page.locator('[data-node-id]').first().waitFor({ timeout: 25_000 })
    await recordContextMenu(page, 'document')

    // 下方关系栏属于普通页面区域，右键应当照常弹系统菜单
    await page.getByText('RELATION EDITOR / ACTION BAR').click({ button: 'right' })
    expect(await lastPrevented(page)).toBe(false)
  })
})
