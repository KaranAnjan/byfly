import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCategories } from '../../hooks/useCategories'
import { apiRequest } from '../../lib/apiClient'
import { normalizeStoreProduct } from '../../lib/storeCatalog'
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, ArrowUpRight, BarChart3, Boxes, CalendarDays, ChevronRight, CircleAlert, Clock3, PackageCheck, Plus, ScanBarcode, TrendingUp } from 'lucide-react'

const cardClass = 'rounded-2xl bg-white shadow-[0_18px_50px_-24px_rgba(31,39,84,0.45)] ring-1 ring-slate-200/70'
const PAGE_SIZE = 50
const stockOf = (product) => Number(product.stock_by_channel?.total || product.stock || 0)
const inr = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

const Dashboard = () => {
  const { categories } = useCategories()
  const [products, setProducts] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const first = await apiRequest(`/products?paginated=true&page=1&limit=${PAGE_SIZE}`)
        const items = (first?.items || []).map(normalizeStoreProduct)
        const total = Number(first?.total_count || items.length)
        const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
        for (let page = 2; page <= pages; page += 1) {
          if (cancelled) return
          const next = await apiRequest(`/products?paginated=true&page=${page}&limit=${PAGE_SIZE}`)
          items.push(...(next?.items || []).map(normalizeStoreProduct))
        }
        if (cancelled) return
        setProducts(items)
        setTotalCount(total)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load dashboard data.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [reloadKey])

  const totalProducts = totalCount || products.length
  const totalStock = products.reduce((sum, product) => sum + stockOf(product), 0)
  const stockCostValue = products.reduce((sum, product) => sum + Number(product.cost || 0) * stockOf(product), 0)
  const retailUnits = products.reduce((sum, product) => sum + Number(product.stock_by_channel?.retail ?? 0), 0)
  const wholesaleUnits = products.reduce((sum, product) => sum + Number(product.stock_by_channel?.wholesale ?? 0), 0)
  const unitTotal = retailUnits + wholesaleUnits
  const retailPct = unitTotal ? Math.round((retailUnits / unitTotal) * 100) : 0
  const wholesalePct = unitTotal ? 100 - retailPct : 0
  const outOfStockItems = products.filter((product) => stockOf(product) === 0).sort((a, b) => String(a.product_name || '').localeCompare(String(b.product_name || '')))
  const outOfStock = outOfStockItems.length
  const lowStockItems = products.filter((product) => { const stock = stockOf(product); return stock > 0 && stock <= 10 }).sort((a, b) => stockOf(a) - stockOf(b))
  const lowStockCount = lowStockItems.length
  const alertPreview = [...outOfStockItems.slice(0, lowStockCount ? 3 : 5), ...lowStockItems.slice(0, 5)].slice(0, 5)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())
  const expiryItems = products.map((product) => {
    if (!product.expiry_date) return null
    const expiryDate = new Date(`${String(product.expiry_date).slice(0, 10)}T00:00:00`)
    const daysUntilExpiry = Math.ceil((expiryDate - today) / 86400000)
    return { ...product, expiryDate, daysUntilExpiry }
  }).filter((product) => product && product.daysUntilExpiry <= 30).sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
  const expiredItems = expiryItems.filter((product) => product.daysUntilExpiry < 0)
  const expiringSoonItems = expiryItems.filter((product) => product.daysUntilExpiry >= 0)
  const categoryData = categories.slice(0, 5).map((category) => {
    const count = products.filter((product) => String(product.category_id || product.category?.id) === String(category.id)).length
    return { name: category.category_name || category.name || 'Category', value: count, height: Math.max(18, Math.round((count / Math.max(totalProducts, 1)) * 100)) }
  })
  if (!categoryData.length) categoryData.push({ name: 'Catalog', value: totalProducts, height: 70 })
  const stats = [
    { label: 'Total products', value: totalProducts, icon: Boxes, gradient: 'from-sky-500 to-blue-600', caption: 'Open catalogue', href: '/admin/products' },
    { label: 'Stock on hand', value: totalStock, icon: PackageCheck, gradient: 'from-emerald-500 to-teal-600', caption: 'Across all channels', href: '/admin/stock' },
    { label: 'Out of stock', value: outOfStock, icon: CircleAlert, gradient: 'from-orange-500 to-amber-500', caption: 'Replenish now', href: '/admin/stock-in' },
    { label: 'Low stock', value: lowStockCount, icon: AlertTriangle, gradient: 'from-rose-500 to-pink-600', caption: 'Restock items', href: '/admin/stock-in', badge: `${outOfStock} at 0 stock` },
  ]
  const quickActions = [
    { label: 'Add product', icon: Plus, to: '/admin/products?new=1' },
    { label: 'Stock in', icon: ArrowDownToLine, to: '/admin/stock-in' },
    { label: 'Stock out', icon: ArrowUpFromLine, to: '/admin/stock-out' },
    { label: 'Current stock', icon: BarChart3, to: '/admin/stock' },
  ]

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <div className="flex flex-col p-5 sm:p-8 [&>section]:order-last">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Welcome back, Admin</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Dashboard overview</h2>
            <p className="mt-1 text-sm text-slate-500">A quick snapshot of your catalogue, stock and alerts.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm sm:flex"><CalendarDays className="h-4 w-4" />{todayLabel}</span>
            <Link to="/admin/products" className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700">Manage products <ArrowUpRight className="h-4 w-4" /></Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span>{error}</span>
            <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100">Retry</button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, gradient, caption, href, badge }) => (
            <Link key={label} to={href} className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg transition duration-300 hover:-translate-y-0.5 hover:shadow-xl`}>
              <div className="absolute -right-6 -top-10 h-32 w-32 rounded-full bg-white/10 transition duration-300 group-hover:scale-110" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-white/85">{label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">{loading ? '—' : value.toLocaleString()}</p>
                  {badge && <span className="mt-2 inline-flex rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white/95">{badge}</span>}
                </div>
                <div className="rounded-2xl bg-white/20 p-2.5"><Icon className="h-6 w-6" /></div>
              </div>
              <p className="relative mt-4 flex items-center gap-1 text-xs font-medium text-white/90">{caption}<ChevronRight className="ml-auto h-4 w-4 transition group-hover:translate-x-0.5" /></p>
            </Link>
          ))}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.18fr_1fr_300px]">
          <section className={`${cardClass} p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Stock overview</h3>
                <p className="mt-0.5 text-xs text-slate-400">Products by category</p>
              </div>
              <div className="flex gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-500" />In stock</span>
                <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-amber-400" />Low stock</span>
              </div>
            </div>
            <div className="mt-6 flex h-52 items-end justify-around gap-3 border-b border-l border-slate-200/80 px-3 pb-0 pt-5">
              {categoryData.map((category) => (
                <div key={category.name} className="flex h-full flex-1 items-end justify-center gap-1.5">
                  <div className="w-5 rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all hover:from-emerald-700 hover:to-emerald-500" style={{ height: `${category.height}%` }} />
                  <div className="w-5 rounded-t-lg bg-gradient-to-t from-amber-500 to-amber-300 transition-all hover:from-amber-600 hover:to-amber-400" style={{ height: `${Math.max(12, category.height * 0.32)}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-around gap-3 pl-3">
              {categoryData.map((category) => <span key={category.name} className="min-w-0 flex-1 truncate text-center text-[11px] text-slate-500">{category.name}</span>)}
            </div>
          </section>

          <section className={`${cardClass} overflow-hidden`}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900">Stock alerts</h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">{outOfStock} at 0 stock</span>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{lowStockCount} low stock</span>
                </div>
              </div>
              <Link to="/admin/stock-in" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-violet-600 transition hover:text-violet-700">Stock in <ChevronRight className="h-3 w-3" /></Link>
            </div>
            <div className="divide-y divide-slate-100">
              {loading && !alertPreview.length && <p className="px-5 py-6 text-sm text-slate-400">Loading stock alerts…</p>}
              {!loading && !alertPreview.length && <p className="px-5 py-6 text-sm text-slate-500">All products have healthy stock levels.</p>}
              {alertPreview.map((product) => {
                const stock = stockOf(product)
                const code = product.product_code || product.product_no
                const zero = stock === 0
                return (
                  <Link key={product.id} to={`/admin/stock-in?code=${encodeURIComponent(code)}`} className={`flex items-center gap-3 px-5 py-2 transition ${zero ? 'hover:bg-rose-50/60' : 'hover:bg-amber-50/60'}`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800" title={product.product_name || 'Unnamed product'}>{product.product_name || 'Unnamed product'}</p>
                      <p className="font-mono text-[10px] text-slate-400">{code}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${zero ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-700'}`}>{stock}</span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </Link>
                )
              })}
              {alertPreview.length > 0 && (
                <Link to="/admin/stock" className="flex items-center justify-center gap-1 px-5 py-2 text-[11px] font-semibold text-violet-600 transition hover:bg-violet-50">View all <ChevronRight className="h-3 w-3" /></Link>
              )}
            </div>
          </section>

          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 p-5 text-white shadow-[0_18px_50px_-24px_rgba(76,29,149,0.7)] ring-1 ring-violet-500/30">
            <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10" />
            <div className="absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-white/5" />
            <div className="relative flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200">Inventory value</p>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/15"><ScanBarcode className="h-4 w-4" /></span>
            </div>
            <p className="relative mt-4 break-words text-2xl font-bold tracking-tight">{loading ? '—' : inr(stockCostValue)}</p>
            <p className="relative mt-1 text-xs text-violet-200/80">Cost value of stock on hand</p>
            <div className="relative mt-5 space-y-3">
              <div>
                <div className="flex items-center justify-between text-[11px] text-violet-100/80"><span>Retail</span><span className="font-semibold text-white">{retailUnits.toLocaleString()} units</span></div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-emerald-300" style={{ width: `${retailPct}%` }} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px] text-violet-100/80"><span>Wholesale</span><span className="font-semibold text-white">{wholesaleUnits.toLocaleString()} units</span></div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-sky-300" style={{ width: `${wholesalePct}%` }} /></div>
              </div>
            </div>
            <p className="relative mt-5 flex items-start gap-2 rounded-xl bg-white/10 p-3 text-[11px] leading-5 text-violet-100/85"><ScanBarcode className="mt-0.5 h-3.5 w-3.5 shrink-0" />Tip: scan or type a code in Stock In / Stock Out for quick updates.</p>
          </section>
        </div>

        <section className="mt-5 overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_-24px_rgba(31,39,84,0.45)] ring-1 ring-amber-200/70">
          <div className="flex items-center justify-between border-b border-amber-100 bg-gradient-to-r from-amber-50 to-white p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700"><Clock3 className="h-5 w-5" /></div>
              <div>
                <h3 className="font-semibold text-amber-950">Expiry alerts</h3>
                <p className="mt-0.5 text-xs text-amber-700">Expired and expiring within 30 days — tap to take action</p>
              </div>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">{loading ? '—' : expiryItems.length}</span>
          </div>
          <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            <p className="px-5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-rose-500">Expired · {expiredItems.length}</p>
            {expiredItems.length ? expiredItems.map((product) => {
              const stock = stockOf(product)
              const code = product.product_code || product.product_no
              return (
                <Link key={product.id} to={`/admin/stock-out?code=${encodeURIComponent(code)}`} className="flex items-center justify-between gap-4 px-5 py-3 transition hover:bg-rose-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-700" title={product.product_name || 'Unnamed product'}>{product.product_name || 'Unnamed product'}</p>
                    <p className="mt-0.5 text-xs text-slate-400">Expired {product.expiryDate.toLocaleDateString('en-IN')} · Stock: {stock}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">Expired</span>
                    <span className="hidden items-center gap-1 text-[11px] font-semibold text-rose-600 sm:inline-flex">Stock out <ChevronRight className="h-3 w-3" /></span>
                  </div>
                </Link>
              )
            }) : <p className="px-5 py-3 text-xs text-slate-400">No expired products.</p>}
            <p className="px-5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-amber-600">Expiring soon · {expiringSoonItems.length}</p>
            {expiringSoonItems.length ? expiringSoonItems.map((product) => {
              const stock = stockOf(product)
              const code = product.product_code || product.product_no
              return (
                <Link key={product.id} to={`/admin/products/${product.product_no || product.product_code}/edit`} className="flex items-center justify-between gap-4 px-5 py-3 transition hover:bg-amber-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-700" title={product.product_name || 'Unnamed product'}>{product.product_name || 'Unnamed product'}</p>
                    <p className="mt-0.5 text-xs text-slate-400">Expiry: {product.expiryDate.toLocaleDateString('en-IN')} · Stock: {stock}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">{product.daysUntilExpiry}d left</span>
                    <span className="hidden items-center gap-1 text-[11px] font-semibold text-amber-700 sm:inline-flex">Review <ChevronRight className="h-3 w-3" /></span>
                  </div>
                </Link>
              )
            }) : <p className="px-5 py-3 text-xs text-slate-400">No products expiring in the next 30 days.</p>}
            {!expiryItems.length && <p className="px-5 pb-4 text-xs text-slate-400">Expiry dates will appear here once products have them.</p>}
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className={`${cardClass} p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Inventory health</h3>
                <p className="mt-0.5 text-xs text-slate-400">At-a-glance stock status</p>
              </div>
              <BarChart3 className="h-5 w-5 text-violet-500" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Link to="/admin/stock" className="rounded-xl bg-emerald-50 p-4 transition hover:bg-emerald-100">
                <p className="text-xs text-emerald-700">Healthy</p>
                <p className="mt-1 text-2xl font-bold text-emerald-800">{Math.max(totalProducts - lowStockCount - outOfStock, 0)}</p>
              </Link>
              <Link to="/admin/stock-in" className="rounded-xl bg-amber-50 p-4 transition hover:bg-amber-100">
                <p className="text-xs text-amber-700">Low stock</p>
                <p className="mt-1 text-2xl font-bold text-amber-800">{lowStockCount}</p>
              </Link>
              <Link to="/admin/stock-in" className="rounded-xl bg-rose-50 p-4 transition hover:bg-rose-100">
                <p className="text-xs text-rose-700">Out of stock</p>
                <p className="mt-1 text-2xl font-bold text-rose-800">{outOfStock}</p>
              </Link>
            </div>
          </section>
          <section className={`${cardClass} p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Quick actions</h3>
                <p className="mt-0.5 text-xs text-slate-400">Keep your catalogue moving</p>
              </div>
              <TrendingUp className="h-5 w-5 text-violet-500" />
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {quickActions.map((action) => (
                <Link key={action.label} to={action.to} className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-100 text-violet-600 transition group-hover:bg-violet-600 group-hover:text-white"><action.icon className="h-4 w-4" /></span>
                  {action.label}
                  <ChevronRight className="ml-auto h-4 w-4 text-slate-300 transition group-hover:text-violet-500" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
