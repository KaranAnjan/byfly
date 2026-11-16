import { useState } from 'react'
import { Pencil, Printer, Trash2, Package } from 'lucide-react'
import { getImageUrl } from '../../lib/imageUrl'
import BarcodePrintModal from './BarcodePrintModal'

const money = (value) => (value != null && value !== '' ? `₹${Math.round(Number(value)).toLocaleString('en-IN')}` : '—')

const discountPercent = (mrp, price) => {
  const mrpValue = Number(mrp), priceValue = Number(price)
  if (!Number.isFinite(mrpValue) || mrpValue <= 0 || !Number.isFinite(priceValue) || priceValue >= mrpValue) return null
  return Math.round(((mrpValue - priceValue) / mrpValue) * 100)
}

const ExpiryCell = ({ value }) => {
  if (!value) return <span className="text-xs text-slate-300">—</span>
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  const days = Math.ceil((date - new Date()) / 86400000)
  const tone = days < 0 ? 'bg-rose-50 text-rose-600' : days <= 30 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-600">{date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
      <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${tone}`}>{days < 0 ? 'Expired' : days <= 30 ? `${days}d left` : 'Fresh'}</span>
    </div>
  )
}

const ProductTable = ({ products, loading, onEdit, onDelete }) => {
  const [printProduct, setPrintProduct] = useState(null)
  return (
    <>
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_-24px_rgba(31,39,84,0.45)] ring-1 ring-slate-200/70">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-slate-50/80">
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3.5">Product</th>
              <th className="px-4 py-3.5">Category</th>
              <th className="px-4 py-3.5">Expiry</th>
              <th className="px-4 py-3.5 text-right">Cost</th>
<th className="px-4 py-3.5">Retail</th>
               <th className="px-4 py-3.5">Wholesale</th>
              <th className="px-4 py-3.5">Stock</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && products.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">Loading products…</td></tr>}
            {products.map((product) => {
              const retail = product.stock_by_channel?.retail ?? 0
              const wholesale = product.stock_by_channel?.wholesale ?? 0
              const total = product.stock_by_channel?.total ?? product.stock ?? 0
              const retailOff = discountPercent(product.retail_mrp ?? product.mrp, product.retail_price ?? product.price)
              const wholesaleOff = discountPercent(product.wholesale_mrp, product.wholesale_price)
              const stockTone = total === 0 ? 'bg-rose-50 text-rose-600' : total <= 10 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
              return (
                <tr key={product.id} className="text-sm transition-colors hover:bg-violet-50/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img src={getImageUrl(product.image_url)} alt={product.product_name} className="h-11 w-11 rounded-xl bg-slate-50 object-cover ring-1 ring-slate-200" />
                      ) : (
                        <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 ring-1 ring-slate-200"><Package className="h-5 w-5 text-slate-400" /></div>
                      )}
                      <div className="min-w-0">
                        <p className="line-clamp-2 max-w-[240px] font-semibold leading-snug text-slate-900" title={product.product_name}>{product.product_name}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-400">{product.product_code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {product.categories?.category_name ? <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{product.categories.category_name}</span> : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3"><ExpiryCell value={product.expiry_date} /></td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-700">{money(product.cost)}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-semibold tabular-nums text-slate-900">{money(product.retail_price ?? product.price)}</p>
                        {retailOff != null && <span className="inline-flex rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">{retailOff}% off</span>}
                      </div>
                      <p className="text-[11px] tabular-nums text-slate-400 line-through">{money(product.retail_mrp ?? product.mrp)}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-semibold tabular-nums text-slate-900">{money(product.wholesale_price)}</p>
                        {wholesaleOff != null && <span className="inline-flex rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">{wholesaleOff}% off</span>}
                        <span className="text-[10px] text-slate-400">Min {product.min_order_qty || 1}</span>
                      </div>
                      <p className="text-[11px] tabular-nums text-slate-400 line-through">{money(product.wholesale_mrp)}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium tabular-nums text-slate-600">R {retail}</span>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium tabular-nums text-slate-600">W {wholesale}</span>
                      <span className={`rounded-md px-2 py-1 text-[11px] font-bold tabular-nums ${stockTone}`}>{total} total</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setPrintProduct(product)} aria-label={`Print barcode for ${product.product_name}`} title="Print barcode" className="rounded-lg p-2 text-slate-400 transition hover:bg-purple-50 hover:text-purple-600"><Printer className="h-4 w-4" /></button>
                      <button onClick={() => onEdit(product)} aria-label={`Edit ${product.product_name}`} title="Edit" className="rounded-lg p-2 text-slate-400 transition hover:bg-violet-50 hover:text-violet-600"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => onDelete(product.id)} aria-label={`Delete ${product.product_name}`} title="Delete" className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!loading && products.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">No products found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
    {printProduct && <BarcodePrintModal product={printProduct} onClose={() => setPrintProduct(null)} />}
    </>
  )
}

export default ProductTable
