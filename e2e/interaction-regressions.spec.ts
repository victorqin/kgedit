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
