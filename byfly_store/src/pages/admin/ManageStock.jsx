import { useEffect, useRef, useState } from 'react'
import { useProducts } from '../../hooks/useProducts'
import StockUpdate from '../../components/admin/StockUpdate'
import Loading from '../../components/common/Loading'
import Pagination from '../../components/common/Pagination'
import { Download, Package, Search, X } from 'lucide-react'
import { getImageUrl } from '../../lib/imageUrl'
import { downloadCsv } from '../../lib/csv'

const ManageStock = () => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const suggestionRef = useRef(null)
  const PAGE_SIZE = 25
  const { products, loading, refetch, totalCount } = useProducts(undefined, search, { page, limit: PAGE_SIZE })
  const suggestions = search.trim() ? products.slice(0, 8) : []
  const searchExpanded = searchFocused || Boolean(search.trim())

  useEffect(() => {
    const handleClick = (event) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setShowSuggestions(false)
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [search])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  if (loading && !products.length && !search.trim()) return <Loading />

  const exportStock = () => {
    const columns = ['product_code', 'product_name', 'retail_stock', 'wholesale_stock', 'total_stock', 'retail_price', 'wholesale_price']
    const rows = products.map((product) => [product.product_code, product.product_name, product.stock_by_channel?.retail ?? 0, product.stock_by_channel?.wholesale ?? 0, product.stock_by_channel?.total ?? 0, product.price ?? '', product.wholesale_price ?? ''])
    downloadCsv(`stock-${new Date().toISOString().slice(0, 10)}.csv`, columns, rows)
  }

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">Inventory</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Current stock</h1>
          <p className="mt-1 text-sm text-slate-500">Track retail and wholesale inventory separately.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div ref={suggestionRef} className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onFocus={() => { setSearchFocused(true); setShowSuggestions(true) }} onChange={(event) => { setSearch(event.target.value); setShowSuggestions(true) }} placeholder="Search name or product code..." className={`rounded-xl border border-slate-200 bg-white py-2.5 pl-10 text-sm text-slate-900 shadow-sm outline-none transition-[width] duration-300 placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 ${search ? 'pr-9' : 'pr-3'} ${searchExpanded ? 'w-64 sm:w-80 lg:w-96' : 'w-60'}`} />
            {search && (
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setSearch(''); setShowSuggestions(false) }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" aria-label="Clear search"><X className="h-4 w-4" /></button>
            )}
            {showSuggestions && search.trim() && (
              <div className="absolute left-0 top-full z-40 mt-1 max-h-80 w-full min-w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                {loading && suggestions.length === 0 && <div className="px-3 py-2 text-xs text-slate-400">Searching...</div>}
                {!loading && suggestions.length === 0 && <div className="px-3 py-2 text-xs text-slate-400">No products found.</div>}
                {suggestions.map((product) => (
                  <button key={product.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setSearch(product.product_code || product.product_name); setShowSuggestions(false) }} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-violet-50">
                    <span className="min-w-0">
                      <span className="block truncate text-slate-700" title={product.product_name}>{product.product_name}</span>
                      <span className="block font-mono text-[10px] text-slate-400">{product.product_code}</span>
                    </span>
                    <span className="flex-shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600">{product.stock_by_channel?.total ?? 0}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={exportStock} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"><Download className="h-4 w-4" />Export CSV</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_-24px_rgba(31,39,84,0.45)] ring-1 ring-slate-200/70">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50/80">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3.5">Product</th>
                <th className="px-4 py-3.5">Retail</th>
                <th className="px-4 py-3.5">Wholesale</th>
                <th className="px-4 py-3.5">Total</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && products.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">Loading products…</td></tr>}
              {products.map((product) => (
                <tr key={product.id} className="text-sm transition-colors hover:bg-violet-50/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img src={getImageUrl(product.image_url)} alt="" className="h-10 w-10 rounded-xl bg-slate-50 object-cover ring-1 ring-slate-200" />
                      ) : (
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 ring-1 ring-slate-200"><Package className="h-5 w-5 text-slate-400" /></div>
                      )}
                      <div className="min-w-0">
                        <p className="line-clamp-2 max-w-[260px] font-semibold leading-snug text-slate-900" title={product.product_name}>{product.product_name}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-400">{product.product_code}</p>
                      </div>
                    </div>
                  </td>
                  <StockUpdate product={product} onUpdate={refetch} />
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">No products found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} itemLabel="products" onPageChange={setPage} />
    </div>
  )
}

export default ManageStock
