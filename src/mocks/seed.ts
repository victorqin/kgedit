import type { KgNode, KgEdge } from '@/api/types'

/**
 * 设计稿 `KG Studio.dc.html` 的种子数据。
 * 原型里 domain 是前端一张硬编码的 DOMAIN_OF 映射表；这里固化为节点自身的字段，
 * 这样用户新建的类型也能被归类，而不是一律掉进 Uncategorized。
 */
export const SEED_NODES: KgNode[] = [
  { id: 'a101',  label: 'A101 System',       type: 'Core Server',   domain: 'Applications',  desc: 'Frontend app tier for production servers and production services.' },
  { id: 'auth',  label: 'User Auth Service', type: 'User',          domain: 'Identity',      desc: 'Issues and validates session tokens for all edge traffic.' },
  { id: 'cache', label: 'Cache Instance A',  type: 'Gateway D0',    domain: 'Network',       desc: 'Hot key cache fronting the gateway read path.' },
  { id: 'log1',  label: 'Log Collector 01',  type: 'Log Chart',     domain: 'Observability', desc: 'Ships structured logs from the production fleet.' },
  { id: 'log2',  label: 'Metrics Agent 02',  type: 'Telemetry',     domain: 'Observability', desc: 'Scrapes host and runtime metrics every 15s.' },
  { id: 'appc',  label: 'Application C',     type: 'Service',       domain: 'Applications',  desc: 'Order orchestration service, owns the write path.' },
  { id: 'gwd',   label: 'Gateway D',         type: 'Gateway',       domain: 'Network',       desc: 'Data access gateway in front of the primary store.' },
  { id: 'dbb',   label: 'Database B',        type: 'Relational DB', domain: 'Data Stores',   desc: 'Primary operational database for the post pipeline.' },
  { id: 'bk1',   label: 'Backup Cluster B1', type: 'Relational DB', domain: 'Data Stores',   desc: 'Daily full backup target for the primary database.' },
  { id: 'dba',   label: 'DBA Admin Group',   type: 'DBA',           domain: 'Identity',      desc: 'On-call owners for schema and operational changes.' },
  { id: 'vault', label: 'Data Vault 002',    type: 'Storage',       domain: 'Data Stores',   desc: 'Long-term columnar store for audited records.' },
  { id: 'etl',   label: 'ETL Pipeline',      type: 'Job',           domain: 'Applications',  desc: 'Nightly extract and load into the reporting layer.' },
  { id: 'rep',   label: 'Reporting Service', type: 'Service',       domain: 'Applications',  desc: 'Serves dashboards to internal analysts.' },
  { id: 'obj',   label: 'Object Store',      type: 'Storage',       domain: 'Data Stores',   desc: 'Cold archive bucket with 7-year retention.' },
]

const RAW_EDGES: [string, string, string][] = [
  ['a101', 'auth', 'invokes'],
  ['a101', 'cache', 'depends_on'],
  ['a101', 'log1', 'monitored_by'],
  ['a101', 'log2', 'monitored_by'],
  ['a101', 'appc', 'writes'],
  ['auth', 'appc', 'authorizes'],
  ['cache', 'gwd', 'caches'],
  ['appc', 'gwd', 'reads'],
  ['gwd', 'dbb', 'stores'],
  ['dbb', 'bk1', 'replicates'],
  ['dbb', 'dba', 'managed_by'],
  ['dbb', 'vault', 'managed_by'],
  ['vault', 'etl', 'feeds'],
  ['etl', 'rep', 'exports'],
  ['bk1', 'obj', 'archives'],
]

export const SEED_EDGES: KgEdge[] = RAW_EDGES.map(([source, target, label], i) => ({
  id: `e${i}`,
  source,
  target,
  label,
  predicate: label,
  directed: true,
}))
