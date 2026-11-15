import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { apiRequest } from '../../lib/apiClient'
import toast from 'react-hot-toast'

const StockUpdate = ({ product, onUpdate }) => {
  const [retailStock, setRetailStock] = useState(Number(product.stock_by_channel?.retail ?? 0))
  const [wholesaleStock, setWholesaleStock] = useState(Number(product.stock_by_channel?.wholesale ?? 0))
  const [saving, setSaving] = useState(false)
  const totalStock = Number(retailStock) + Number(wholesaleStock)
  const totalTone = totalStock === 0 ? 'bg-rose-50 text-rose-600' : totalStock <= 10 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'

  useEffect(() => {
    setRetailStock(Number(product.stock_by_channel?.retail ?? 0))
    setWholesaleStock(Number(product.stock_by_channel?.wholesale ?? 0))
  }, [product])

  const updateStock = async (event) => {
    event.preventDefault()
    if (![retailStock, wholesaleStock].every((value) => Number.isInteger(Number(value)) && Number(value) >= 0)) {
      toast.error('Enter whole-number stock quantities, zero or more.')
      return
    }
    const retail = Number(retailStock)
    const wholesale = Number(wholesaleStock)
    setSaving(true)
    try {
      await apiRequest(`/admin/products/${product.id}/stock`, { method: 'PUT', body: JSON.stringify({ retail_stock: retail, wholesale_stock: wholesale }) })
      toast.success(`Stock updated. Total available: ${retail + wholesale}`)
      onUpdate()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  return <>
    <td className="px-4 py-3">
      <input aria-label={`${product.product_name} retail stock`} type="number" min="0" step="1" required
        value={retailStock} onChange={(event) => setRetailStock(event.target.value)}
        className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums text-slate-900 shadow-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
    </td>
    <td className="px-4 py-3">
      <input aria-label={`${product.product_name} wholesale stock`} type="number" min="0" step="1" required
        value={wholesaleStock} onChange={(event) => setWholesaleStock(event.target.value)}
        className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums text-slate-900 shadow-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
    </td>
    <td className="px-4 py-3">
      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${totalTone}`}>{totalStock}</span>
    </td>
    <td className="px-4 py-3 text-right">
      <button type="button" onClick={updateStock} disabled={saving}
        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
        <Save className="h-3.5 w-3.5" />{saving ? 'Saving…' : 'Update'}
      </button>
    </td>
  </>
}

export default StockUpdate
