import { useMemo } from 'react'
import { buildBarcodeSvg, buildLabelBody, labelCss } from '../../lib/printProductCode'

const BarcodeLabelPreview = ({ code, name, cost, sellingPrice, settings }) => {
  const html = useMemo(() => {
    const trimmedCode = String(code ?? '').trim()
    if (!trimmedCode) return ''
    try {
      return buildLabelBody({ code: trimmedCode, name, cost, sellingPrice, settings, barcodeSvg: buildBarcodeSvg(trimmedCode, settings) })
    } catch {
      return ''
    }
  }, [code, name, cost, sellingPrice, settings])

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <style>{labelCss(settings)}</style>
      {html
        ? <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: html }} />
        : <p className="py-8 text-center text-xs text-slate-400">{code ? 'This product code cannot be converted into a barcode.' : 'Enter a product code to preview the barcode label.'}</p>}
    </div>
  )
}

export default BarcodeLabelPreview
