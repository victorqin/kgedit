import { test, expect } from '@playwright/test'

const WIDTHS = [320, 375, 768, 1024, 1440, 1920]

for (const width of WIDTHS) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/kg?start=a101&end=dbb&hops=2')
    await expect(page.locator('[data-node-id]').first()).toBeVisible({ timeout: 25_000 })

    // 图渲染完到 fitView 收敛之间有个短暂的布局抖动窗口，
    // 用 poll 等它稳定下来，而不是撞运气读一次。
    await expect
      .poll(
        () =>
          page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          ),
        { message: `page scrolls horizontally at ${width}px`, timeout: 10_000 },
      )
      .toBeLessThanOrEqual(1)
  })
}

test('keeps a side gutter and stacks the panels on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto('/kg?start=a101&end=dbb&hops=2')
  await expect(page.locator('[data-node-id]').first()).toBeVisible({ timeout: 25_000 })

  const left = page.locator('.graph-panel--L')
  const right = page.locator('.graph-panel--R')
  const [lb, rb] = [await left.boundingBox(), await right.boundingBox()]
  expect(lb).not.toBeNull()
  expect(rb).not.toBeNull()
  // 窄屏下两个面板上下堆叠，而不是并排挤成两条
  expect(rb!.y).toBeGreaterThan(lb!.y + lb!.height - 1)
})

test('visual regression of the deterministic chrome', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/kg?start=a101&end=dbb&hops=2')
  await expect(page.locator('[data-node-id]').first()).toBeVisible({ timeout: 25_000 })
  await page.waitForTimeout(1200)

  // 力导向布局每次的节点位置都不同，图区域必须遮掉，
  // 否则视觉回归会一直假报警。其余部分是确定性的。
  await expect(page).toHaveScreenshot('kg-chrome-1440.png', {
    mask: [page.locator('.graph-panel__body')],
    maxDiffPixelRatio: 0.02,
  })
})
