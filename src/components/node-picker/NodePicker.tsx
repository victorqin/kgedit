import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Tree } from 'antd'
import type { DataNode } from 'antd/es/tree'
import { useTranslation } from 'react-i18next'
import { useKgStore } from '@/stores/useKgStore'
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback'
import { SearchIcon } from '@/layouts/app-shell/icons'
import type { TreeNode } from '@/api/types'
import type { Side } from '@/theme/antdTheme'
import './node-picker.css'

const DEBOUNCE_MS = 300
/** 点击树项会先触发 blur，延迟关闭以免点击落空 */
const BLUR_CLOSE_MS = 200

const QUERY = { L: 'qStart', R: 'qEnd' } as const
const TREE = { L: 'treeL', R: 'treeR' } as const

export function NodePicker({ side }: { side: Side }) {
  const { t } = useTranslation()
  const [localQuery, setLocalQuery] = useState<string | null>(null)
  const blurTimer = useRef<number>(undefined)

  const storeQuery = useKgStore((s) => s[QUERY[side]])
  const tree = useKgStore((s) => s[TREE[side]])
  const isOpen = useKgStore((s) => s.openSide === side)
  const hlId = useKgStore((s) => s.hlId)
  const setQuery = useKgStore((s) => s.setQuery)
  const openPicker = useKgStore((s) => s.openPicker)
  const closePicker = useKgStore((s) => s.closePicker)
  const pickNode = useKgStore((s) => s.pickNode)
  const runSearch = useKgStore((s) => s.runSearch)
  const moveHighlight = useKgStore((s) => s.moveHighlight)
  const leafIds = useKgStore((s) => s.leafIds)

  // 输入框保持即时响应，请求防抖
  const value = localQuery ?? storeQuery
  const pushQuery = useDebouncedCallback((q: string) => void setQuery(side, q), DEBOUNCE_MS)

  const treeData = useMemo(() => toAntTree(tree, hlId), [tree, hlId])

  // defaultExpandAll 只在挂载时生效：过滤后新出现的分支会保持折叠，
  // 用户搜完什么也看不到。所以展开态改为从数据派生。
  // 有查询词时全展开；没有时只展开第一层（域），与 spec 一致。
  const autoExpanded = useMemo(() => {
    const hasQuery = Boolean(value.trim())
    const keys: string[] = []
    const walk = (nodes: TreeNode[], depth: number) => {
      for (const n of nodes) {
        if (n.nodeId) continue
        if (hasQuery || depth === 0) keys.push(n.key)
        walk(n.children ?? [], depth + 1)
      }
    }
    walk(tree, 0)
    return keys
  }, [tree, value])

  // 用户手动折叠的结果只对当前这棵树有效，数据一变就回到派生值
  const [override, setOverride] = useState<{ tree: TreeNode[]; keys: string[] } | null>(null)
  const expandedKeys = override?.tree === tree ? override.keys : autoExpanded

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      moveHighlight(side, e.key === 'ArrowDown' ? 1 : -1)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const ids = leafIds(side)
      const target = hlId && ids.includes(hlId) ? hlId : null
      setLocalQuery(null)
      if (target) void pickNode(side, target)
      else void runSearch(side, value)
      return
    }
    if (e.key === 'Escape') {
      closePicker()
    }
  }

  return (
    <div className={`node-picker node-picker--${side}`}>
      <div className="node-picker__field">
        <span className="node-picker__icon">
          <SearchIcon color="#4b5769" size={14} />
        </span>

        <input
          className="node-picker__input"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={`picker-tree-${side}`}
          aria-autocomplete="list"
          aria-label={t(side === 'L' ? 'picker.ariaStart' : 'picker.ariaEnd')}
          placeholder={t(side === 'L' ? 'picker.startPlaceholder' : 'picker.endPlaceholder')}
          value={value}
          onChange={(e) => {
            setLocalQuery(e.target.value)
            pushQuery(e.target.value)
          }}
          onFocus={() => void openPicker(side)}
          onBlur={() => {
            window.clearTimeout(blurTimer.current)
            blurTimer.current = window.setTimeout(closePicker, BLUR_CLOSE_MS)
          }}
          onKeyDown={onKeyDown}
        />

        {isOpen && (
          <div
            className="node-picker__panel"
            onMouseDown={(e) => e.preventDefault()} // 阻止 blur，否则点击会落空
          >
            {treeData.length === 0 ? (
              <div className="node-picker__empty" id={`picker-tree-${side}`}>
                {t('picker.noMatch')}
              </div>
            ) : (
              <div id={`picker-tree-${side}`}>
                <Tree
                  treeData={treeData}
                  blockNode
                  expandedKeys={expandedKeys}
                  onExpand={(keys) => setOverride({ tree, keys: keys.map(String) })}
                  selectedKeys={hlId ? [`n:${hlId}`] : []}
                  onSelect={(keys) => {
                    const key = String(keys[0] ?? '')
                    if (!key.startsWith('n:')) return
                    setLocalQuery(null)
                    void pickNode(side, key.slice(2))
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        className="node-picker__search"
        onClick={() => {
          setLocalQuery(null)
          void runSearch(side, value)
        }}
      >
        {t('picker.search')}
      </button>
    </div>
  )
}

/** 把服务端的 域 ▸ 类型 ▸ 节点 结构转成 AntD Tree 的数据形状。 */
function toAntTree(nodes: TreeNode[], hlId: string | null): DataNode[] {
  return nodes.map((n) => {
    const isLeaf = Boolean(n.nodeId)
    const highlighted = isLeaf && n.nodeId === hlId
    return {
      key: n.key,
      isLeaf,
      selectable: isLeaf,
      title: (
        <span
          className={[
            'node-picker__row',
            isLeaf ? 'node-picker__row--leaf' : 'node-picker__row--group',
            highlighted ? 'node-picker__row--hl' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="node-picker__row-label">{n.label}</span>
          {n.meta ? <span className="node-picker__row-meta">{n.meta}</span> : null}
          {n.count !== undefined ? <span className="node-picker__row-meta">{n.count}</span> : null}
        </span>
      ),
      children: n.children ? toAntTree(n.children, hlId) : undefined,
    }
  })
}
