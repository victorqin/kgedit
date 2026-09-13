import { test, expect, type Page } from '@playwright/test'

/**
 * 反转一条边之后，G6 内部记录的「这个节点关联了哪些边」会漏掉新的起点，
 * 于是拖动该节点时边不跟着重绘，看起来就是节点从边上脱落了。
 *
 * 连线画在 canvas 里、DOM 中看不到，所以断言打在图实例上 —— 实例挂在
 * 图容器的 __g6 属性上（见 src/graph/useG6Graph.ts）。
 */

const HOST = '.graph-panel--L .graph-panel__body > div'

interface EdgeSnapshot {
  id: string
  source: string
  target: string
}

const readEdges = (page: Page, host: string): Promise<EdgeSnapshot[]> =>
  page.evaluate((sel) => {
    const g = (document.querySelector(sel) as { __g6?: Record<string, never> } | null)?.__g6 as
      | { getEdgeData: () => { id: string; source: string; target: string }[] }
      | undefined
    if (!g) throw new Error('图实例还没挂到容器上')
    return g.getEdgeData().map((e) => ({ id: e.id, source: e.source, target: e.target }))
  }, host)

const relatedEdgeIds = (page: Page, host: string, nodeId: string): Promise<string[]> =>
  page.evaluate(
    ([sel, id]) => {
      const g = (document.querySelector(sel) as { __g6?: Record<string, never> } | null)?.__g6 as
        | { getRelatedEdgesData: (n: string) => { id: string }[] }
        | undefined
      if (!g) throw new Error('图实例还没挂到容器上')
      return g.getRelatedEdgesData(id).map((e) => String(e.id))
    },
    [host, nodeId] as const,
  )

test.describe('反转连线', () => {
  test('反转后两端都仍然认得这条边，拖任意一端都会重绘', async ({ page }) => {
    await page.goto('/kg?start=a101&end=dbb&hops=2')
    await page.locator(`${HOST} [data-node-id]`).first().waitFor({ timeout: 25_000 })
    await page.waitForTimeout(1500)

    // 选中中心节点，下方关系列表才会列出它的边
    await page.locator(`${HOST} [data-node-id="a101"]`).first().click()
    const reverseBtn = page.locator('.relation-row__btn--reverse').first()
    await reverseBtn.waitFor({ timeout: 10_000 })

    const before = await readEdges(page, HOST)

    await reverseBtn.click()
    await page.getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await page.waitForTimeout(1200)

    const after = await readEdges(page, HOST)
    const flipped = after.find((a) => {
      const was = before.find((b) => b.id === a.id)
      return was && was.source === a.target && was.target === a.source
    })
    expect(flipped, '没有任何一条边的方向被反转，测试前提不成立').toBeTruthy()

    // 这才是缺陷所在：反转后新起点（原来的 target）丢掉了这条边
    const fromSource = await relatedEdgeIds(page, HOST, flipped!.source)
    const fromTarget = await relatedEdgeIds(page, HOST, flipped!.target)

    expect(fromSource, `新起点 ${flipped!.source} 不再认得 ${flipped!.id}，拖它时边不会跟着走`)
      .toContain(flipped!.id)
    expect(fromTarget, `新终点 ${flipped!.target} 不再认得 ${flipped!.id}`).toContain(flipped!.id)
  })

  test('反转后拖动新起点，边跟着一起动', async ({ page }) => {
    await page.goto('/kg?start=a101&end=dbb&hops=2')
    await page.locator(`${HOST} [data-node-id]`).first().waitFor({ timeout: 25_000 })
    await page.waitForTimeout(1500)

    await page.locator(`${HOST} [data-node-id="a101"]`).first().click()
    const reverseBtn = page.locator('.relation-row__btn--reverse').first()
    await reverseBtn.waitFor({ timeout: 10_000 })

    const before = await readEdges(page, HOST)
    await reverseBtn.click()
    await page.getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await page.waitForTimeout(1200)

    const after = await readEdges(page, HOST)
    const flipped = after.find((a) => {
      const was = before.find((b) => b.id === a.id)
      return was && was.source === a.target && was.target === a.source
    })!
    expect(flipped, '没有任何一条边的方向被反转，测试前提不成立').toBeTruthy()

    // 量边的包围盒：拖动新起点后它必须跟着移动，而不是留在原地
    const edgeBounds = () =>
      page.evaluate(
        ([sel, id]) => {
          const g = (document.querySelector(sel) as { __g6?: Record<string, never> } | null)
            ?.__g6 as { context: { element: { getElement: (i: string) => { getBounds: () => { center: number[] } } } } }
          const c = g.context.element.getElement(id).getBounds().center
          return [c[0], c[1]] as [number, number]
        },
        [HOST, flipped.id] as const,
      )

    const card = page.locator(`${HOST} [data-node-id="${flipped.source}"]`).first()
    await card.waitFor()
    const box = (await card.boundingBox())!
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    const edgeBefore = await edgeBounds()

    await page.mouse.move(cx, cy)
    await page.mouse.down({ button: 'middle' })
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(cx + i * 14, cy + i * 9)
      await page.waitForTimeout(20)
    }
    await page.mouse.up({ button: 'middle' })
    await page.waitForTimeout(400)

    const edgeAfter = await edgeBounds()
    const moved = Math.hypot(edgeAfter[0] - edgeBefore[0], edgeAfter[1] - edgeBefore[1])
    expect(moved, '拖动新起点时这条边没有跟着重绘 —— 节点从边上脱落了').toBeGreaterThan(10)
  })
})
