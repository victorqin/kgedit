import { test, expect } from '@playwright/test'

/** 先证明最基本的事：真实浏览器里页面能起来、G6 能把卡片画出来。 */
test('renders the studio and draws real G6 node cards', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  await page.goto('/kg?start=a101&end=dbb&hops=2')

  await expect(page.getByText('START-CENTRIC SUBGRAPH')).toBeVisible()
  await expect(page.getByText('END-CENTRIC SUBGRAPH')).toBeVisible()

  // G6 的 HTML 节点是真实 DOM，能查到就说明图真的渲染了
  const cards = page.locator('[data-node-id]')
  await expect(cards.first()).toBeVisible({ timeout: 15_000 })
  expect(await cards.count()).toBeGreaterThan(1)

  // 中心节点带 ★
  await expect(page.locator('[data-center="1"]').first()).toBeVisible()

  await expect(page.getByText('14 NODES · 15 RELATIONS')).toBeVisible()

  expect(errors).toEqual([])
})
