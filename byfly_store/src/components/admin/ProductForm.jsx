import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '../../lib/apiClient'
import { useCategories } from '../../hooks/useCategories'
import ImageUploader from './ImageUploader'
import toast from 'react-hot-toast'
import { Barcode, CalendarDays, ChevronLeft, ChevronRight, Save, X } from 'lucide-react'

const fieldClass = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-emerald-500'

const discountFor = (mrp, price) => {
  const mrpValue = Number(mrp), priceValue = Number(price)
  if (!Number.isFinite(mrpValue) || mrpValue <= 0 || !Number.isFinite(priceValue) || priceValue > mrpValue) return ''
  return Math.max(0, Math.min(100, ((mrpValue - priceValue) / mrpValue) * 100)).toFixed(2).replace(/\.00$/, '')
}

const dateInputValue = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const displayDate = (value) => {
  if (!value) return 'Select expiry date'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

const ExpiryDatePicker = ({ value, onChange }) => {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef(null)
  const [viewDate, setViewDate] = useState(() => value ? new Date(`${value}T00:00:00`) : new Date())
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(viewDate)
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const selectedDate = value ? new Date(`${value}T00:00:00`) : null
  const today = dateInputValue(new Date())
  const days = Array.from({ length: 42 }, (_, index) => index < firstDay || index >= firstDay + daysInMonth ? null : index - firstDay + 1)

  const openPicker = () => {
    setViewDate(value ? new Date(`${value}T00:00:00`) : new Date())
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return undefined
    const handleOutsideClick = (event) => {
      if (!pickerRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  return <div ref={pickerRef} className="relative">
    <button type="button" onClick={openPicker} className={`${fieldClass} flex items-center justify-between text-left ${value ? 'text-gray-900' : 'text-gray-400'}`}>
      <span>{displayDate(value)}</span>
      <CalendarDays className="h-5 w-5 text-emerald-600" />
    </button>
    {open && <div role="dialog" aria-label="Select expiry date" className="absolute left-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl bg-white p-5 shadow-2xl ring-1 ring-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" aria-label="Previous month" onClick={() => setViewDate(new Date(year, month - 1, 1))} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"><ChevronLeft className="h-5 w-5" /></button>
          <h4 className="font-semibold text-gray-900">{monthLabel}</h4>
          <button type="button" aria-label="Next month" onClick={() => setViewDate(new Date(year, month + 1, 1))} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"><ChevronRight className="h-5 w-5" /></button>
        </div>
        <div className="mb-2 grid grid-cols-7 text-center text-xs font-semibold text-gray-500">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (!day) return <span key={`empty-${index}`} className="h-9" />
            const date = new Date(year, month, day)
            const dateValue = dateInputValue(date)
            const isSelected = selectedDate && dateValue === value
            const isToday = dateValue === today
            return <button key={dateValue} type="button" onClick={() => { onChange(dateValue); setOpen(false) }} className={`h-9 rounded-lg text-sm transition ${isSelected ? 'bg-emerald-600 font-semibold text-white' : isToday ? 'border border-emerald-500 text-emerald-700' : 'text-gray-700 hover:bg-emerald-50'}`}>{day}</button>
          })}
        </div>
        <div className="mt-4 flex justify-between border-t border-gray-100 pt-3">
          <button type="button" onClick={() => { onChange(''); setOpen(false) }} className="text-sm font-medium text-gray-500 hover:text-gray-700">Clear</button>
          <button type="button" onClick={() => { onChange(today); setOpen(false) }} className="text-sm font-medium text-emerald-700 hover:text-emerald-800">Today</button>
        </div>
      </div>}
  </div>
}

const ProductForm = ({ product, existingProducts = [], onSave, onCancel }) => {
  const { categories } = useCategories()
  const [loading, setLoading] = useState(false)
  const [pendingFiles, setPendingFiles] = useState([])
  const [form, setForm] = useState({ product_name: '', category_id: '', product_code: '', description: '', expiry_date: '', images: [], cost: '', retail_stock: 0, wholesale_stock: 0, wholesale_price: '', min_order_qty: 1, retail_price: '', retail_mrp: '', retail_discount: '', wholesale_mrp: '', wholesale_discount: '' })

  useEffect(() => {
    if (!product) return
    setPendingFiles([])
    const retailPrice = product.price ?? product.retail_price ?? ''
    const retailMrp = product.mrp ?? product.retail_mrp ?? ''
    const wholesalePrice = product.wholesale_price ?? ''
    const wholesaleMrp = product.wholesale_mrp ?? ''
    setForm({ product_name: product.product_name || '', category_id: product.category_id || '', product_code: product.product_code || '', description: product.description || '', expiry_date: product.expiry_date ? String(product.expiry_date).slice(0, 10) : '', images: product.images || [], cost: product.cost ?? '', retail_stock: product.stock_by_channel?.retail ?? product.stock ?? 0, wholesale_stock: product.stock_by_channel?.wholesale ?? 0, wholesale_price: wholesalePrice, min_order_qty: product.min_order_qty || 1, retail_price: retailPrice, retail_mrp: retailMrp, retail_discount: discountFor(retailMrp, retailPrice), wholesale_mrp: wholesaleMrp, wholesale_discount: discountFor(wholesaleMrp, wholesalePrice) })
  }, [product])

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const setPriceField = (channel, key, value) => setForm((current) => {
    const next = { ...current, [`${channel}_${key}`]: value }
    const discount = key === 'discount' ? value : next[`${channel}_discount`]
    const mrp = key === 'mrp' ? value : next[`${channel}_mrp`]
    if (discount !== '' && Number.isFinite(Number(discount)) && Number.isFinite(Number(mrp))) {
      const safeDiscount = Math.max(0, Math.min(100, Number(discount)))
      next[`${channel}_discount`] = String(safeDiscount)
      next[`${channel}_price`] = (Number(mrp) * (1 - safeDiscount / 100)).toFixed(2)
    }
    return next
  })
  const duplicateCode = Boolean(form.product_code.trim()) && existingProducts.some((item) => (
    item.id !== product?.id && String(item.product_code || '').trim().toLowerCase() === form.product_code.trim().toLowerCase()
  ))

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (duplicateCode) {
      toast.error('This product code already exists. Enter a unique product code.')
      return
    }
    setLoading(true)
    try {
      const cost = Number(form.cost), retailPrice = Number(form.retail_price), retailMrp = Number(form.retail_mrp), wholesalePrice = Number(form.wholesale_price), wholesaleMrp = Number(form.wholesale_mrp)
      const minOrderQty = Number(form.min_order_qty), retailStock = Number(form.retail_stock), wholesaleStock = Number(form.wholesale_stock)
      if (![cost, retailPrice, retailMrp, wholesalePrice, wholesaleMrp].every(Number.isFinite) || cost < 0) throw new Error('Enter a valid cost and all prices.')
      if (retailMrp < retailPrice || wholesaleMrp < wholesalePrice) throw new Error('MRP must be greater than or equal to the selling price.')
      if (!Number.isInteger(minOrderQty) || minOrderQty < 1 || ![retailStock, wholesaleStock].every((value) => Number.isInteger(value) && value >= 0)) throw new Error('Stock and minimum order quantity must be valid whole numbers.')
      const payload = { product_name: form.product_name, category_id: form.category_id, product_code: form.product_code, description: form.description.trim() || null, image_url: '', expiry_date: form.expiry_date || null, cost, retail_price: retailPrice, retail_mrp: retailMrp, wholesale_price: wholesalePrice, wholesale_mrp: wholesaleMrp, wholesale_min_order_qty: minOrderQty, retail_stock: retailStock, wholesale_stock: wholesaleStock }
      const saved = await apiRequest(product ? `/admin/products/${product.id}` : '/admin/products', { method: product ? 'PUT' : 'POST', body: JSON.stringify(payload) })
      const productId = saved.id || product?.id
      if (!product && pendingFiles.length && productId) {
        for (const { file, index } of pendingFiles) {
          const body = new FormData()
          body.append('file', file)
          body.append('image_index', String(index))
          await apiRequest(`/admin/products/${productId}/images`, { method: 'POST', body })
        }
      }
      toast.success(product ? 'Product updated!' : 'Product added!')
      onSave()
    } catch (error) { toast.error(error.message) } finally { setLoading(false) }
  }

  return <div className="rounded-xl bg-white p-6 shadow-md">
    <div className="mb-4"><h3 className="text-lg font-semibold">{product ? `Edit Product ${product.product_no || ''}` : 'Add New Product'}</h3></div>
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <label className="text-sm font-medium text-gray-700">
            <span className="flex items-center gap-2">Product code * <Barcode className="h-4 w-4 text-emerald-600" /></span>
            <span className="mt-1 block text-xs font-normal text-gray-500">Scan with a barcode scanner or type the code manually.</span>
            <span className="relative block">
              <Barcode className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                required
                autoFocus={!product}
                inputMode="text"
                autoComplete="off"
                placeholder="Scan or enter product code"
                value={form.product_code}
                onChange={(e) => set('product_code', e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
                className={`${fieldClass} pl-10 ${duplicateCode ? 'border-red-500 ring-2 ring-red-100' : ''}`}
              />
            </span>
            {duplicateCode && <span className="mt-1 block text-xs font-medium text-red-600">This product code already exists. Please use a unique code.</span>}
          </label>
          <label className="text-sm font-medium text-gray-700">Product name *<input required value={form.product_name} onChange={(e) => set('product_name', e.target.value)} className={fieldClass} /></label>
          <label className="text-sm font-medium text-gray-700">Category *<select required value={form.category_id} onChange={(e) => set('category_id', e.target.value)} className={fieldClass}><option value="">Select Category</option>{categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.category_name}</option>)}</select></label>
          <label className="text-sm font-medium text-gray-700">Expiry date (optional)<ExpiryDatePicker value={form.expiry_date} onChange={(value) => set('expiry_date', value)} /></label>
          <label className="text-sm font-medium text-gray-700">Description (optional)<textarea rows="3" value={form.description} onChange={(e) => set('description', e.target.value)} className={`${fieldClass} resize-y`} /></label>
          <label className="text-sm font-medium text-gray-700">Cost (₹) *<input type="number" required min="0" step="0.01" value={form.cost} onChange={(e) => set('cost', e.target.value)} className={fieldClass} /></label>
        </div>
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-4"><ImageUploader productId={product?.id} images={form.images} legacyImage={product?.image_url || ''} maxImages={product?.max_product_images || 4} onImagesChange={(images) => set('images', images)} onPendingFilesChange={setPendingFiles} /></div>
        {false && <>
        <section className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 md:col-span-2"><h4 className="font-semibold text-emerald-900">Retail prices</h4><p className="mb-3 text-xs text-emerald-700">Shown to retail customers.</p><div className="grid grid-cols-1 gap-4 md:grid-cols-3"><label className="text-sm font-medium text-gray-700">Retail stock *<input type="number" required min="0" step="1" value={form.retail_stock} onChange={(e) => set('retail_stock', e.target.value)} className={fieldClass} /></label><label className="text-sm font-medium text-gray-700">Retail selling price (₹) *<input type="number" required min="0" step="0.01" value={form.retail_price} onChange={(e) => set('retail_price', e.target.value)} className={fieldClass} /></label><label className="text-sm font-medium text-gray-700">Retail MRP (₹) *<input type="number" required min="0" step="0.01" value={form.retail_mrp} onChange={(e) => set('retail_mrp', e.target.value)} className={fieldClass} /></label></div></section>
        <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 md:col-span-2"><h4 className="font-semibold text-blue-900">Wholesale prices</h4><p className="mb-3 text-xs text-blue-700">Shown only to approved wholesale customers.</p><div className="grid grid-cols-1 gap-4 md:grid-cols-4"><label className="text-sm font-medium text-gray-700">Wholesale stock *<input type="number" required min="0" step="1" value={form.wholesale_stock} onChange={(e) => set('wholesale_stock', e.target.value)} className={fieldClass} /></label><label className="text-sm font-medium text-gray-700">Wholesale selling price (₹) *<input type="number" required min="0" step="0.01" value={form.wholesale_price} onChange={(e) => set('wholesale_price', e.target.value)} className={fieldClass} /></label><label className="text-sm font-medium text-gray-700">Wholesale MRP (₹) *<input type="number" required min="0" step="0.01" value={form.wholesale_mrp} onChange={(e) => set('wholesale_mrp', e.target.value)} className={fieldClass} /></label><label className="text-sm font-medium text-gray-700">Minimum order quantity *<input type="number" required min="1" step="1" value={form.min_order_qty} onChange={(e) => set('min_order_qty', e.target.value)} className={fieldClass} /></label></div></section>
        </>}
      </div>
        <section className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 md:col-span-2"><h4 className="font-semibold text-emerald-900">Retail prices</h4><p className="mb-3 text-xs text-emerald-700">Enter MRP and an optional discount. Leave discount blank to enter the selling price manually.</p><div className="grid grid-cols-1 gap-4 md:grid-cols-4"><label className="flex flex-col text-sm font-medium text-gray-700">Retail stock *<input type="number" required min="0" step="1" value={form.retail_stock} onChange={(e) => set('retail_stock', e.target.value)} className={fieldClass} /></label><label className="flex flex-col text-sm font-medium text-gray-700">Retail MRP *<input type="number" required min="0" step="0.01" value={form.retail_mrp} onChange={(e) => setPriceField('retail', 'mrp', e.target.value)} className={fieldClass} /></label><label className="flex flex-col text-sm font-medium text-gray-700">Discount (%)<input type="number" min="0" max="100" step="0.01" value={form.retail_discount} onChange={(e) => setPriceField('retail', 'discount', e.target.value)} placeholder="Optional" className={fieldClass} /></label><label className="flex flex-col text-sm font-medium text-gray-700">Retail selling price *<input type="number" required min="0" step="0.01" value={form.retail_price} onChange={(e) => setPriceField('retail', 'price', e.target.value)} className={fieldClass} /></label></div></section>
        <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 md:col-span-2"><h4 className="font-semibold text-blue-900">Wholesale prices</h4><p className="mb-3 text-xs text-blue-700">Enter MRP and an optional discount. Leave discount blank to enter the selling price manually.</p><div className="grid grid-cols-1 gap-4 md:grid-cols-5"><label className="flex flex-col text-sm font-medium text-gray-700">Wholesale stock *<input type="number" required min="0" step="1" value={form.wholesale_stock} onChange={(e) => set('wholesale_stock', e.target.value)} className={fieldClass} /></label><label className="flex flex-col text-sm font-medium text-gray-700">Wholesale MRP *<input type="number" required min="0" step="0.01" value={form.wholesale_mrp} onChange={(e) => setPriceField('wholesale', 'mrp', e.target.value)} className={fieldClass} /></label><label className="flex flex-col text-sm font-medium text-gray-700">Discount (%)<input type="number" min="0" max="100" step="0.01" value={form.wholesale_discount} onChange={(e) => setPriceField('wholesale', 'discount', e.target.value)} placeholder="Optional" className={fieldClass} /></label><label className="flex flex-col text-sm font-medium text-gray-700">Wholesale selling price *<input type="number" required min="0" step="0.01" value={form.wholesale_price} onChange={(e) => setPriceField('wholesale', 'price', e.target.value)} className={fieldClass} /></label><label className="flex flex-col text-sm font-medium text-gray-700">Minimum order quantity *<input type="number" required min="1" step="1" value={form.min_order_qty} onChange={(e) => set('min_order_qty', e.target.value)} className={fieldClass} /></label></div></section>
      <div className="flex gap-3 pt-4"><button type="submit" disabled={loading} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-white transition hover:bg-emerald-700 disabled:opacity-50"><Save className="h-4 w-4" />{loading ? 'Saving...' : 'Save Product'}</button><button type="button" onClick={onCancel} className="flex items-center gap-2 rounded-lg bg-gray-200 px-6 py-2 text-gray-700 hover:bg-gray-300"><X className="h-4 w-4" />Cancel</button></div>
    </form>
  </div>
}

export default ProductForm
