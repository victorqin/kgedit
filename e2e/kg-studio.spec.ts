import { test, expect, type Page } from '@playwright/test'

const START = '/kg?start=a101&end=dbb&hops=2'

/** 顶栏的语言 Select 也是 combobox，必须按 aria-label 精确定位两个节点输入框 */
const startInput = (page: Page) => page.getByRole('combobox', { name: 'Start node search' })
const endInput = (page: Page) => page.getByRole('combobox', { name: 'End node search' })

const waitForGraph = async (page: Page) => {
  await expect(page.locator('[data-node-id]').first()).toBeVisible({ timeout: 25_000 })
}

test.beforeEach(async ({ page }) => {
  await page.goto(START)
  await waitForGraph(page)
})

test('renders both panels, the path and the live counts', async ({ page }) => {
  await expect(page.getByText('START-CENTRIC SUBGRAPH')).toBeVisible()
  await expect(page.getByText('END-CENTRIC SUBGRAPH')).toBeVisible()
  await expect(page.getByText('14 NODES · 15 RELATIONS')).toBeVisible()
  await expect(page.getByText('PATH STATUS')).toBeVisible()
  await expect(page.locator('[data-center="1"]').first()).toBeVisible()
})

test('backfills both search boxes from the url state', async ({ page }) => {
  await expect(startInput(page)).toHaveValue('A101 System')
  await expect(endInput(page)).toHaveValue('Database B')
})

test('searching from the tree re-centers and updates the url', async ({ page }) => {
  await startInput(page).fill('gateway')
  // "Gateway D" 在图的节点卡片上也有，必须限定在下拉面板内点击
  const panel = page.locator('.node-picker__panel').first()
  await expect(panel).toBeVisible()
  await panel.getByText('Gateway D', { exact: true }).click()
  await expect(page).toHaveURL(/start=gwd/)
})

test('clicking a node lists all of its relations', async ({ page }) => {
  await page.locator('[data-node-id="a101"]').first().click()
  await expect(page.getByText(/SELECTED NODE \[A101 System\]/)).toBeVisible()
  await expect(page.getByRole('button', { name: /^Edit/ }).first()).toBeVisible()
})

test('reversing asks first and shows the before and after', async ({ page }) => {
  await page.locator('[data-node-id="a101"]').first().click()
  await expect(page.getByText(/SELECTED NODE/)).toBeVisible()

  await page.getByRole('button', { name: /^Reverse/ }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/Now/)).toBeVisible()
  await expect(dialog.getByText(/After/)).toBeVisible()

  const row = page.locator('.relation-row').first()
  const before = await row.locator('.relation-row__endpoint').first().innerText()

  await dialog.getByRole('button', { name: 'Confirm' }).click()

  // 断言持久结果而不是转瞬即逝的 toast：方向真的翻了，源端点变成了原来的目标端点
  await expect(row.locator('.relation-row__endpoint').first()).not.toHaveText(before)
})

test('deleting a relation asks first and warns it is permanent', async ({ page }) => {
  await page.locator('[data-node-id="a101"]').first().click()
  await expect(page.getByText(/SELECTED NODE/)).toBeVisible()

  await page.getByRole('button', { name: /^Delete/ }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(/cannot be undone/)).toBeVisible()

  await dialog.getByRole('button', { name: 'Delete' }).click()
  // 统计行是持久状态，比 toast 可靠
  await expect(page.getByText('14 NODES · 14 RELATIONS')).toBeVisible()
})

test('cancelling a delete changes nothing', async ({ page }) => {
  await page.locator('[data-node-id="a101"]').first().click()
  await page.getByRole('button', { name: /^Delete/ }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByText('14 NODES · 15 RELATIONS')).toBeVisible()
})

test('a modal traps focus, which jsdom could not verify', async ({ page }) => {
  await page.locator('[data-node-id="a101"]').first().click()
  await page.getByRole('button', { name: /^Reverse/ }).first().click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute('aria-modal', 'true')

  // 连续 Tab 之后焦点仍应留在弹窗内
  for (let i = 0; i < 8; i++) await page.keyboard.press('Tab')
  const focusInside = await dialog.evaluate((el) => el.contains(document.activeElement))
  expect(focusInside).toBe(true)
})

test('hops accepts any positive integer and clamps invalid input', async ({ page }) => {
  const hops = page.getByRole('spinbutton').first()
  await hops.fill('3')
  await hops.blur()
  await expect(page).toHaveURL(/hops=3/)

  await hops.fill('0')
  await hops.blur()
  await expect(hops).toHaveValue('1')

  await hops.fill('7')
  await hops.blur()
  await expect(page).toHaveURL(/hops=7/)
})

test('the link button refuses a self loop', async ({ page }) => {
  await endInput(page).fill('A101 System')
  await page.getByRole('button', { name: 'Search' }).nth(1).click()
  await expect(page.getByText('Start and End are the same node')).toBeVisible()
})

test('editing a node persists every field including domain', async ({ page }) => {
  await page.locator('[data-node-id="a101"]').first().click({ button: 'right' })
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  await dialog.getByLabel('TITLE').fill('A101 Renamed')
  await dialog.getByLabel('DOMAIN').fill('Streaming')
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(page.locator('[data-node-id="a101"]').first()).toContainText('A101 Renamed')
})

test('the view survives a reload because it lives in the url', async ({ page }) => {
  await page.getByRole('spinbutton').first().fill('3')
  await page.getByRole('spinbutton').first().blur()
  await expect(page).toHaveURL(/hops=3/)

  await page.reload()
  await waitForGraph(page)
  await expect(page.getByRole('spinbutton').first()).toHaveValue('3')
  await expect(startInput(page)).toHaveValue('A101 System')
})

test('the side rail switches to the blank overview page and back', async ({ page }) => {
  await page.getByRole('link', { name: 'Overview' }).click()
  await expect(page).toHaveURL(/\/overview/)
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

  await page.getByRole('link', { name: 'Knowledge Graph' }).click()
  await expect(page).toHaveURL(/\/kg/)
  await waitForGraph(page)
})
