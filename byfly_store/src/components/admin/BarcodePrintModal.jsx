import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X } from 'lucide-react'
import BarcodeLabelPreview from './BarcodeLabelPreview'
import { loadLabelSettings, printProductCode, saveLabelSettings } from '../../lib/printProductCode'

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100'
const labelClass = 'flex flex-col gap-1.5 text-sm font-medium text-slate-700'

const BarcodePrintModal = ({ product, onClose }) => {
  const [settings, setSettings] = useState(loadLabelSettings)

  const setSetting = (key, value) => setSettings((current) => {
    const next = { ...current, [key]: value }
    saveLabelSettings(next)
    return next
  })

  const handlePrint = () => {
    printProductCode(product.product_code, product.product_name, product.cost, product.price, settings)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:items-center"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900">Print barcode</h3>
            <p className="mt-0.5 truncate text-xs text-slate-500">{product.product_name} · <span className="font-mono">{product.product_code}</span></p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          <BarcodeLabelPreview code={product.product_code} name={product.product_name} cost={product.cost} sellingPrice={product.price} settings={settings} />
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <label className={labelClass}><span>Copies</span><input type="number" min="1" max="500" step="1" value={settings.copies} onChange={(e) => setSetting('copies', e.target.value)} className={fieldClass} /></label>
              <label className={labelClass}><span>Width (mm)</span><input type="number" min="20" max="200" step="1" value={settings.labelWidth} onChange={(e) => setSetting('labelWidth', e.target.value)} className={fieldClass} /></label>
              <label className={labelClass}><span>Height (px)</span><input type="number" min="20" max="200" step="1" value={settings.barcodeHeight} onChange={(e) => setSetting('barcodeHeight', e.target.value)} className={fieldClass} /></label>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Show on label</p>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={settings.showName} onChange={(e) => setSetting('showName', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />Product name</label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={settings.showCode} onChange={(e) => setSetting('showCode', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />Product code</label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={settings.showCost} onChange={(e) => setSetting('showCost', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />Cost (coded)</label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={settings.showSellingPrice} onChange={(e) => setSetting('showSellingPrice', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />Selling price (₹)</label>
              </div>
            </div>
            <p className="text-xs text-slate-400">Cost is coded: 1–9 → a–i and 0 → z. The printer and paper are chosen in the browser print dialog.</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"><X className="h-4 w-4" />Cancel</button>
          <button type="button" onClick={handlePrint} disabled={!String(product.product_code || '').trim()} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"><Printer className="h-4 w-4" />Print {settings.copies > 1 ? `${settings.copies} labels` : 'label'}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default BarcodePrintModal
