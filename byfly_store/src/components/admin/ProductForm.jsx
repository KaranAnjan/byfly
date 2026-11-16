import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '../../lib/apiClient'
import { useCategories } from '../../hooks/useCategories'
import ImageUploader from './ImageUploader'
import toast from 'react-hot-toast'
import BarcodeLabelPreview from './BarcodeLabelPreview'
import { loadLabelSettings, printProductCode, saveLabelSettings } from '../../lib/printProductCode'
import { Barcode, Building2, CalendarDays, ChevronLeft, ChevronRight, PackagePlus, Printer, Save, Tag, X } from 'lucide-react'

const labelClass = 'flex flex-col gap-1.5 text-sm font-medium text-slate-700'
const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100'
const qtyFieldClass = `${fieldClass} max-w-[7rem]`
const priceFieldClass = `${fieldClass} max-w-[9rem]`
const pricingLabelClass = `${labelClass} justify-end [&>span]:whitespace-nowrap`

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
    if (open) {
      setOpen(false)
      return
    }
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
    <button type="button" onClick={openPicker} className={`${fieldClass} flex items-center justify-between text-left ${value ? 'text-slate-900' : 'text-slate-400'}`}>
      <span>{displayDate(value)}</span>
      <CalendarDays className="h-5 w-5 text-violet-500" />
    </button>
    {open && <div role="dialog" aria-label="Select expiry date" className="absolute left-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" aria-label="Previous month" onClick={() => setViewDate(new Date(year, month - 1, 1))} className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"><ChevronLeft className="h-5 w-5" /></button>
          <h4 className="font-semibold text-slate-900">{monthLabel}</h4>
          <button type="button" aria-label="Next month" onClick={() => setViewDate(new Date(year, month + 1, 1))} className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"><ChevronRight className="h-5 w-5" /></button>
        </div>
        <div className="mb-2 grid grid-cols-7 text-center text-xs font-semibold text-slate-400">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (!day) return <span key={`empty-${index}`} className="h-9" />
            const date = new Date(year, month, day)
            const dateValue = dateInputValue(date)
            const isSelected = selectedDate && dateValue === value
            const isToday = dateValue === today
            return <button key={dateValue} type="button" onClick={() => { onChange(dateValue); setOpen(false) }} className={`h-9 rounded-lg text-sm transition ${isSelected ? 'bg-violet-600 font-semibold text-white' : isToday ? 'border border-violet-500 text-violet-700' : 'text-slate-700 hover:bg-violet-50'}`}>{day}</button>
          })}
        </div>
        <div className="mt-4 flex justify-between border-t border-slate-100 pt-3">
          <button type="button" onClick={() => { onChange(''); setOpen(false) }} className="text-sm font-medium text-slate-500 transition hover:text-slate-700">Clear</button>
          <button type="button" onClick={() => { onChange(today); setOpen(false) }} className="text-sm font-medium text-violet-700 transition hover:text-violet-800">Today</button>
        </div>
      </div>}
  </div>
}

const ProductForm = ({ product, existingProducts = [], onSave, onCancel }) => {
  const { categories } = useCategories()
  const [loading, setLoading] = useState(false)
  const [pendingFiles, setPendingFiles] = useState([])
  const [form, setForm] = useState({ product_name: '', category_id: '', product_code: '', description: '', expiry_date: '', images: [], cost: '', retail_stock: 0, wholesale_stock: 0, wholesale_price: '', min_order_qty: 1, retail_price: '', retail_mrp: '', retail_discount: '0', wholesale_mrp: '', wholesale_discount: '0' })
  const [labelSettings, setLabelSettings] = useState(loadLabelSettings)
  const [labelPrice, setLabelPrice] = useState('')

  useEffect(() => {
    setLabelPrice('')
    if (!product) return
    setPendingFiles([])
    const retailPrice = product.price ?? product.retail_price ?? ''
    const retailMrp = product.mrp ?? product.retail_mrp ?? ''
    const wholesalePrice = product.wholesale_price ?? ''
    const wholesaleMrp = product.wholesale_mrp ?? ''
    setForm({ product_name: product.product_name || '', category_id: product.category_id || '', product_code: product.product_code || '', description: product.description || '', expiry_date: product.expiry_date ? String(product.expiry_date).slice(0, 10) : '', images: product.images || [], cost: product.cost ?? '', retail_stock: product.stock_by_channel?.retail ?? product.stock ?? 0, wholesale_stock: product.stock_by_channel?.wholesale ?? 0, wholesale_price: wholesalePrice, min_order_qty: product.min_order_qty || 1, retail_price: retailPrice, retail_mrp: retailMrp, retail_discount: discountFor(retailMrp, retailPrice) || '0', wholesale_mrp: wholesaleMrp, wholesale_discount: discountFor(wholesaleMrp, wholesalePrice) || '0' })
  }, [product])

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const setLabelSetting = (key, value) => setLabelSettings((current) => {
    const next = { ...current, [key]: value }
    saveLabelSettings(next)
    return next
  })
  const setPriceField = (channel, key, value) => setForm((current) => {
    const next = { ...current, [`${channel}_${key}`]: value }
    const discountKey = `${channel}_discount`
    const priceKey = `${channel}_price`
    const mrpKey = `${channel}_mrp`
    const discount = key === 'discount' ? value : next[discountKey]
    const mrp = key === 'mrp' ? value : next[mrpKey]
    const price = key === 'price' ? value : next[priceKey]
    const hasValue = (input) => String(input ?? '').trim() !== ''
    const mrpNumber = Number(mrp)
    const priceNumber = Number(price)
    const discountNumber = Number(discount)
    const validMrp = hasValue(mrp) && Number.isFinite(mrpNumber) && mrpNumber > 0

    if (key === 'price') {
      // Selling price is authoritative: always recompute the percentage.
      next[discountKey] = hasValue(price) && validMrp && Number.isFinite(priceNumber)
        ? (discountFor(mrp, price) || '0')
        : '0'
    } else if (key === 'discount') {
      if (hasValue(discount) && validMrp && Number.isFinite(discountNumber)) {
        const safeDiscount = Math.max(0, Math.min(100, discountNumber))
        next[discountKey] = String(safeDiscount)
        next[priceKey] = (mrpNumber * (1 - safeDiscount / 100)).toFixed(2)
      }
    } else if (key === 'mrp') {
      if (hasValue(price) && validMrp) {
        // Keep the entered selling price and update the percentage from it.
        next[discountKey] = discountFor(mrp, price) || '0'
      } else if (hasValue(discount) && discountNumber > 0 && validMrp) {
        next[priceKey] = (mrpNumber * (1 - Math.max(0, Math.min(100, discountNumber)) / 100)).toFixed(2)
      }
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

  return (
    <div className="rounded-2xl bg-white shadow-[0_18px_50px_-24px_rgba(31,39,84,0.45)] ring-1 ring-slate-200/70">
      <div className="flex items-center gap-4 rounded-t-2xl border-b border-slate-100 bg-gradient-to-r from-violet-50 via-white to-white px-6 py-5">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-200">
          <PackagePlus className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold tracking-tight text-slate-900">{product ? `Edit product ${product.product_no || ''}` : 'Add new product'}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{product ? 'Update the catalogue details, pricing and stock.' : 'Fill in the details to add a new product to your catalogue.'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-900">Product details</h4>
              <p className="mt-0.5 text-xs text-slate-500">Basic information used across the store.</p>
            </div>
            <div className="space-y-4">
              <label className={labelClass}>
                <span className="flex items-center gap-1.5">Product code <span className="text-rose-500">*</span><Barcode className="h-3.5 w-3.5 text-violet-500" /></span>
                <span className="text-xs font-normal text-slate-400">Scan with a barcode scanner or type the code manually.</span>
                <span className="relative block">
                  <Barcode className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    autoFocus={!product}
                    inputMode="text"
                    autoComplete="off"
                    placeholder="Scan or enter product code"
                    value={form.product_code}
                    onChange={(e) => set('product_code', e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
                    className={`${fieldClass} pl-10 ${duplicateCode ? 'border-rose-300 ring-4 ring-rose-100' : ''}`}
                  />
                </span>
                {duplicateCode && <span className="text-xs font-medium text-rose-600">This product code already exists. Please use a unique code.</span>}
              </label>
              <label className={labelClass}><span>Product name <span className="text-rose-500">*</span></span><input required value={form.product_name} onChange={(e) => set('product_name', e.target.value)} placeholder="e.g. Gold plated necklace" className={fieldClass} /></label>
              <label className={labelClass}><span>Category <span className="text-rose-500">*</span></span><select required value={form.category_id} onChange={(e) => set('category_id', e.target.value)} className={fieldClass}><option value="">Select category</option>{categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.category_name}</option>)}</select></label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <label className={`${labelClass} sm:col-span-3`}><span>Expiry date <span className="text-xs font-normal text-slate-400">(optional)</span></span><ExpiryDatePicker value={form.expiry_date} onChange={(value) => set('expiry_date', value)} /></label>
                <label className={labelClass}><span>Cost (₹) <span className="text-rose-500">*</span></span><input type="number" required min="0" step="0.01" value={form.cost} onChange={(e) => set('cost', e.target.value)} placeholder="0.00" className={fieldClass} /></label>
              </div>
              <label className={labelClass}><span>Description <span className="text-xs font-normal text-slate-400">(optional)</span></span><textarea rows="3" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Short description shown to customers" className={`${fieldClass} resize-y`} /></label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-900">Product images</h4>
              <p className="mt-0.5 text-xs text-slate-500">Upload clear photos. The first image is used as the cover.</p>
            </div>
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-3">
              <ImageUploader productId={product?.id} images={form.images} legacyImage={product?.image_url || ''} maxImages={product?.max_product_images || 4} onImagesChange={(images) => set('images', images)} onPendingFilesChange={setPendingFiles} />
            </div>
          </section>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-100/90 via-emerald-50/60 to-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><Tag className="h-4 w-4" /></div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-emerald-900">Retail pricing</h4>
                <p className="mt-0.5 truncate text-xs text-emerald-700/80">MRP and selling price link together.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <label className={pricingLabelClass}><span>Stock <span className="text-rose-500">*</span></span><input type="number" required min="0" step="1" value={form.retail_stock} onChange={(e) => set('retail_stock', e.target.value)} className={qtyFieldClass} /></label>
              <label className={pricingLabelClass}><span>MRP (₹) <span className="text-rose-500">*</span></span><input type="number" required min="0" step="0.01" value={form.retail_mrp} onChange={(e) => setPriceField('retail', 'mrp', e.target.value)} className={priceFieldClass} /></label>
              <label className={pricingLabelClass}><span>Discount (%)</span><input type="number" min="0" max="100" step="0.01" value={form.retail_discount} onChange={(e) => setPriceField('retail', 'discount', e.target.value)} placeholder="Optional" className={priceFieldClass} /></label>
              <label className={pricingLabelClass}><span>Selling (₹) <span className="text-rose-500">*</span></span><input type="number" required min="0" step="0.01" value={form.retail_price} onChange={(e) => setPriceField('retail', 'price', e.target.value)} className={priceFieldClass} /></label>
            </div>
          </section>

          <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-100/90 via-blue-50/60 to-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700"><Building2 className="h-4 w-4" /></div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-blue-900">Wholesale pricing</h4>
                <p className="mt-0.5 truncate text-xs text-blue-700/80">Visible to approved customers only.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <label className={pricingLabelClass}><span>Stock <span className="text-rose-500">*</span></span><input type="number" required min="0" step="1" value={form.wholesale_stock} onChange={(e) => set('wholesale_stock', e.target.value)} className={qtyFieldClass} /></label>
              <label className={pricingLabelClass}><span>MRP (₹) <span className="text-rose-500">*</span></span><input type="number" required min="0" step="0.01" value={form.wholesale_mrp} onChange={(e) => setPriceField('wholesale', 'mrp', e.target.value)} className={priceFieldClass} /></label>
              <label className={pricingLabelClass}><span>Discount (%)</span><input type="number" min="0" max="100" step="0.01" value={form.wholesale_discount} onChange={(e) => setPriceField('wholesale', 'discount', e.target.value)} placeholder="Optional" className={priceFieldClass} /></label>
              <label className={pricingLabelClass}><span>Selling (₹) <span className="text-rose-500">*</span></span><input type="number" required min="0" step="0.01" value={form.wholesale_price} onChange={(e) => setPriceField('wholesale', 'price', e.target.value)} className={priceFieldClass} /></label>
              <label className={pricingLabelClass}><span>Min qty <span className="text-rose-500">*</span></span><input type="number" required min="1" step="1" value={form.min_order_qty} onChange={(e) => set('min_order_qty', e.target.value)} className={qtyFieldClass} /></label>
            </div>
          </section>
        </div>

        <section className="mt-5 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/70 via-white to-white p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><Barcode className="h-4 w-4" /></div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-violet-900">Barcode label</h4>
              <p className="text-xs text-violet-700/80">Preview the label and adjust the print format. Changes are saved for next time.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
            <BarcodeLabelPreview code={form.product_code} name={form.product_name.trim() || 'Product'} cost={form.cost} sellingPrice={labelPrice} settings={labelSettings} />
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <label className={pricingLabelClass}><span>Copies</span><input type="number" min="1" max="500" step="1" value={labelSettings.copies} onChange={(e) => setLabelSetting('copies', e.target.value)} className={qtyFieldClass} /></label>
                <label className={pricingLabelClass}><span>Width (mm)</span><input type="number" min="20" max="200" step="1" value={labelSettings.labelWidth} onChange={(e) => setLabelSetting('labelWidth', e.target.value)} className={qtyFieldClass} /></label>
                <label className={pricingLabelClass}><span>Height (px)</span><input type="number" min="20" max="200" step="1" value={labelSettings.barcodeHeight} onChange={(e) => setLabelSetting('barcodeHeight', e.target.value)} className={qtyFieldClass} /></label>
                <label className={pricingLabelClass}><span>Selling price (₹)</span><input type="text" value={labelPrice} onChange={(e) => setLabelPrice(e.target.value)} placeholder="Custom text" className={qtyFieldClass} /></label>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Show on label</p>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={labelSettings.showName} onChange={(e) => setLabelSetting('showName', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />Product name</label>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={labelSettings.showCode} onChange={(e) => setLabelSetting('showCode', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />Product code</label>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={labelSettings.showCost} onChange={(e) => setLabelSetting('showCost', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />Cost (coded)</label>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={labelSettings.showSellingPrice} onChange={(e) => setLabelSetting('showSellingPrice', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />Selling price (₹)</label>
                </div>
              </div>
              {labelSettings.showCost && <p className="text-xs text-slate-400">Cost is coded: 1–9 → a–i and 0 → z.</p>}
              <p className="text-xs text-slate-400">The printer and paper are chosen in the browser print dialog.</p>
            </div>
          </div>
        </section>

        <div className="sticky bottom-0 z-10 -mx-6 -mb-6 mt-6 flex flex-wrap items-center gap-3 rounded-b-2xl border-t border-slate-100 bg-white/90 px-6 py-4 backdrop-blur">
          <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:from-emerald-700 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4" />{loading ? 'Saving…' : 'Save product'}</button>
          <button type="button" onClick={() => printProductCode(form.product_code.trim(), form.product_name.trim() || 'Product', form.cost, labelPrice, labelSettings)} disabled={!form.product_code.trim()} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-5 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50" title={form.product_code.trim() ? 'Print barcode for this product code' : 'Enter a product code to enable barcode printing'}><Printer className="h-4 w-4" />Print barcode</button>
          <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"><X className="h-4 w-4" />Cancel</button>
          <span className="ml-auto hidden text-xs text-slate-400 sm:block">Fields marked <span className="text-rose-500">*</span> are required</span>
        </div>
      </form>
    </div>
  )
}

export default ProductForm
