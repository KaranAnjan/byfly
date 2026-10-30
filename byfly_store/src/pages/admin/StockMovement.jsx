import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ScanBarcode, ArrowDownToLine, ArrowUpFromLine, Package, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { useProducts } from '../../hooks/useProducts'
import { apiRequest } from '../../lib/apiClient'
import { getImageUrl } from '../../lib/imageUrl'

const StockMovement = ({ mode }) => {
  const isStockIn = mode === 'in'
  const [code, setCode] = useState('')
  const [selected, setSelected] = useState(null)
  const [retailQuantity, setRetailQuantity] = useState('')
  const [wholesaleQuantity, setWholesaleQuantity] = useState('')
  const [saving, setSaving] = useState(false)
  const { products, loading, refetch } = useProducts(undefined, code, { page: 1, limit: 10, searchFields: 'name_code' })
  const normalizedCode = code.trim().toLowerCase()
  const matches = selected ? [] : [...products].sort((a, b) => {
    const aExact = [a.product_code, a.product_no].some((value) => String(value || '').trim().toLowerCase() === normalizedCode)
    const bExact = [b.product_code, b.product_no].some((value) => String(value || '').trim().toLowerCase() === normalizedCode)
    return Number(bExact) - Number(aExact)
  }).slice(0, 10)
  useEffect(() => {
    if (!normalizedCode || loading || selected) return
    const exactMatch = products.find((product) => String(product.product_code || '').trim().toLowerCase() === normalizedCode)
    if (exactMatch) chooseProduct(exactMatch)
  }, [normalizedCode, products, loading, selected])

  const chooseProduct = (product) => {
    setSelected(product)
    setCode(product.product_code || String(product.product_no || ''))
  }

  const clearProduct = () => { setSelected(null); setCode(''); setRetailQuantity(''); setWholesaleQuantity('') }

  const saveMovement = async (event) => {
    event.preventDefault()
    if (!selected) return toast.error('Scan or select a product first.')
    const currentRetail = Number(selected.stock_by_channel?.retail || 0)
    const currentWholesale = Number(selected.stock_by_channel?.wholesale || 0)
    const hasRetail = retailQuantity !== ''
    const hasWholesale = wholesaleQuantity !== ''
    if (!hasRetail && !hasWholesale) return toast.error('Enter a retail or wholesale quantity.')
    const retailAmount = hasRetail ? Number(retailQuantity) : 0
    const wholesaleAmount = hasWholesale ? Number(wholesaleQuantity) : 0
    if (![retailAmount, wholesaleAmount].every((amount) => Number.isInteger(amount) && amount >= 1)) return toast.error('Entered quantities must be whole numbers greater than zero.')
    const nextRetail = hasRetail ? currentRetail + (isStockIn ? retailAmount : -retailAmount) : currentRetail
    const nextWholesale = hasWholesale ? currentWholesale + (isStockIn ? wholesaleAmount : -wholesaleAmount) : currentWholesale
    if (nextRetail < 0 || nextWholesale < 0) return toast.error('Stock out quantity cannot exceed current stock.')
    setSaving(true)
    try {
      await apiRequest(`/admin/products/${selected.id}`, { method: 'PUT', body: JSON.stringify({ product_name: selected.product_name, product_code: selected.product_code, category_id: selected.category_id, description: selected.description || null, image_url: selected.image_url || '', expiry_date: selected.expiry_date || null, cost: Number(selected.cost || 0), retail_price: Number(selected.retail_price || 0), retail_mrp: Number(selected.retail_mrp ?? selected.mrp ?? 0), wholesale_price: Number(selected.wholesale_price || 0), wholesale_mrp: Number(selected.wholesale_mrp || 0), wholesale_min_order_qty: Number(selected.min_order_qty || 1), retail_stock: nextRetail, wholesale_stock: nextWholesale }) })
      toast.success(`${isStockIn ? 'Stock added' : 'Stock removed'} for ${selected.product_name}`)
      await refetch()
      clearProduct()
    } catch (error) { toast.error(error.message) } finally { setSaving(false) }
  }

  return <div className="min-h-screen bg-[#f4f6fb] p-5 text-slate-900 sm:p-8">
    <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6243bd]">Inventory operations</p><h1 className="mt-1 flex items-center gap-3 text-2xl font-bold">{isStockIn ? <ArrowDownToLine className="text-emerald-600" /> : <ArrowUpFromLine className="text-rose-600" />}{isStockIn ? 'Stock In' : 'Stock Out'}</h1><p className="mt-1 text-sm text-slate-500">{isStockIn ? 'Scan a product and add quantity to its stock.' : 'Scan a product and remove stock from the selected channel.'}</p></div>{isStockIn && <Link to="/admin/products?new=1" className="shrink-0 rounded-xl bg-[#4f2aa6] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-200 hover:bg-[#3b1d86]">+ Add New Product</Link>}</div>
    <div className="grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <form onSubmit={saveMovement} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="text-sm font-semibold text-slate-700">Product code or barcode<input autoFocus value={code} onChange={(event) => { setCode(event.target.value); setSelected(null) }} onKeyDown={(event) => { if (event.key === 'Enter' && matches[0]) { event.preventDefault(); chooseProduct(matches[0]) } }} placeholder="Scan barcode or type product code" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-base outline-none ring-purple-200 focus:border-purple-500 focus:ring-4" /></label>
        {!selected && <div className="mt-2 space-y-1">{matches.map((product) => <button type="button" key={product.id} onClick={() => chooseProduct(product)} className="flex w-full items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-left text-sm hover:bg-purple-50"><span><strong>{product.product_code}</strong> · {product.product_name}</span><span className="text-xs text-slate-400">{product.stock_by_channel?.total ?? 0} total</span></button>)}</div>}
        {selected && <div className="mt-5 rounded-xl border border-purple-100 bg-purple-50 p-4"><div className="flex items-center gap-4">{selected.image_url ? <img src={getImageUrl(selected.image_url)} alt={selected.product_name} className="h-16 w-16 rounded-lg object-cover" /> : <div className="grid h-16 w-16 place-items-center rounded-lg bg-white text-purple-400"><Package /></div>}<div className="min-w-0 flex-1"><p className="truncate font-semibold">{selected.product_name}</p><p className="font-mono text-xs text-slate-500">{selected.product_code}</p></div><button type="button" onClick={clearProduct} className="text-xs text-slate-500">Change</button></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3"><div className="rounded-lg bg-white p-2"><p className="text-slate-400">Retail price / MRP</p><p className="font-semibold">₹{selected.retail_price ?? 0} / ₹{selected.retail_mrp ?? selected.mrp ?? 0}</p></div><div className="rounded-lg bg-white p-2"><p className="text-slate-400">Wholesale / MRP</p><p className="font-semibold">₹{selected.wholesale_price ?? 0} / ₹{selected.wholesale_mrp ?? 0}</p></div><div className="rounded-lg bg-white p-2"><p className="text-slate-400">Retail / Wholesale stock</p><p className="font-semibold">{selected.stock_by_channel?.retail ?? 0} / {selected.stock_by_channel?.wholesale ?? 0}</p></div></div></div>}
        <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">Retail stock quantity <span className="font-normal text-emerald-700">(leave blank to keep current)</span><input type="number" min="1" step="1" value={retailQuantity} onChange={(event) => setRetailQuantity(event.target.value)} placeholder="No change" className="mt-2 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 font-normal" /></label><label className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-900">Wholesale stock quantity <span className="font-normal text-blue-700">(leave blank to keep current)</span><input type="number" min="1" step="1" value={wholesaleQuantity} onChange={(event) => setWholesaleQuantity(event.target.value)} placeholder="No change" className="mt-2 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 font-normal" /></label></div>
        <p className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Prices are managed from the Edit Product page.</p>
        <button type="submit" disabled={saving || loading || !selected} className={`mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white disabled:opacity-50 ${isStockIn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}><Save className="h-4 w-4" />{saving ? 'Saving...' : isStockIn ? 'Save stock in' : 'Save stock out'}</button>
      </form>
      <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{selected ? <><div className="overflow-hidden rounded-2xl bg-slate-100">{selected.image_url ? <img src={getImageUrl(selected.image_url)} alt={selected.product_name} className="h-56 w-full object-cover" /> : <div className="grid h-56 place-items-center text-slate-300"><Package className="h-16 w-16" /></div>}</div><h2 className="mt-5 text-lg font-bold">{selected.product_name}</h2><p className="mt-1 font-mono text-xs text-slate-500">{selected.product_code}</p><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span className="text-slate-500">Cost</span><strong>₹{selected.cost ?? 0}</strong></div><div className="flex justify-between"><span className="text-slate-500">Retail price / MRP</span><strong>₹{selected.retail_price ?? 0} / ₹{selected.retail_mrp ?? selected.mrp ?? 0}</strong></div><div className="flex justify-between"><span className="text-slate-500">Wholesale / MRP</span><strong>₹{selected.wholesale_price ?? 0} / ₹{selected.wholesale_mrp ?? 0}</strong></div><div className="flex justify-between border-t border-slate-100 pt-3"><span className="text-slate-500">Current stock</span><strong>{selected.stock_by_channel?.retail ?? 0} retail / {selected.stock_by_channel?.wholesale ?? 0} wholesale</strong></div></div><Link to={`/admin/products/${selected.product_no || selected.product_code}/edit`} className="mt-6 block rounded-xl border border-purple-200 px-4 py-2.5 text-center text-sm font-semibold text-purple-700 hover:bg-purple-50">Edit full product</Link></> : <><div className={`grid h-12 w-12 place-items-center rounded-xl ${isStockIn ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}><ScanBarcode /></div><h2 className="mt-5 text-lg font-bold">Select an existing product</h2><p className="mt-2 text-sm leading-6 text-slate-500">Scan or enter a product code on the left to see its image, prices, and current stock here.</p><p className="mt-6 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">Current Stock remains available for direct stock adjustment.</p></>}</aside>
    </div>
  </div>
}

export default StockMovement
