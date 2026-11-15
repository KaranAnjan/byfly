import JsBarcode from 'jsbarcode'
import toast from 'react-hot-toast'

const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ESCAPE_MAP[character])

export const LABEL_SETTINGS_KEY = 'byfly:barcode-label-settings-v2'

export const DEFAULT_LABEL_SETTINGS = {
  copies: 1,
  labelWidth: 58,
  barcodeHeight: 60,
  showName: true,
  showCode: true,
  showCost: false,
  showSellingPrice: true,
}

export const loadLabelSettings = () => {
  if (typeof window === 'undefined') return { ...DEFAULT_LABEL_SETTINGS }
  try {
    const stored = JSON.parse(window.localStorage.getItem(LABEL_SETTINGS_KEY) || '{}')
    return { ...DEFAULT_LABEL_SETTINGS, ...stored }
  } catch {
    return { ...DEFAULT_LABEL_SETTINGS }
  }
}

export const saveLabelSettings = (settings) => {
  try {
    window.localStorage.setItem(LABEL_SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* ignore storage failures */
  }
}

export const formatMoney = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? `₹${number.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''
}

export const formatSellingPrice = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? `₹${Math.round(number).toLocaleString('en-IN')}` : ''
}

const COST_LETTER_BY_DIGIT = ['z', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']

export const encodeCost = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return ''
  return String(number).replace(/\d/g, (digit) => COST_LETTER_BY_DIGIT[Number(digit)])
}

export const buildBarcodeSvg = (code, settings = DEFAULT_LABEL_SETTINGS) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  JsBarcode(svg, code, {
    format: 'CODE128',
    width: 1.8,
    height: Math.max(20, Number(settings.barcodeHeight) || DEFAULT_LABEL_SETTINGS.barcodeHeight),
    displayValue: false,
    margin: 0,
  })
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  return svg.outerHTML
}

export const labelCss = (settings) => {
  const width = Math.max(20, Number(settings.labelWidth) || DEFAULT_LABEL_SETTINGS.labelWidth)
  return `
    .bfl-labels{display:flex;flex-wrap:wrap;gap:6mm}
    .bfl-label{width:${width}mm;padding:3mm;border:1px dashed #cbd5e1;border-radius:8px;text-align:center;page-break-inside:avoid;break-inside:avoid;background:#fff}
    .bfl-name{font-size:11px;font-weight:600;line-height:1.2;margin-bottom:2mm;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .bfl-code{font-family:monospace;font-size:14px;font-weight:700;letter-spacing:1px;word-break:break-all;margin-bottom:2mm}
    .bfl-barcode{display:flex;justify-content:center}
    .bfl-barcode svg{max-width:100%;height:auto}
    .bfl-prices{margin-top:2mm;display:flex;align-items:baseline;justify-content:space-between;gap:2mm}
    .bfl-prices-single{justify-content:center}
    .bfl-cost{font-family:monospace;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:lowercase;color:#64748b}
    .bfl-selling{font-size:13px;font-weight:700;color:#111827}
    @media print{.bfl-label{border:0}.bfl-labels{gap:4mm}}
  `
}

export const buildLabelBody = ({ code, name, cost, sellingPrice, settings, barcodeSvg }) => {
  const costText = settings.showCost ? encodeCost(cost) : ''
  const sellingText = settings.showSellingPrice ? formatSellingPrice(sellingPrice) : ''
  const priceItems = []
  if (costText) priceItems.push(`<span class="bfl-cost">${costText}</span>`)
  if (sellingText) priceItems.push(`<span class="bfl-selling">${sellingText}</span>`)
  const prices = priceItems.length ? `<div class="bfl-prices${priceItems.length === 1 ? ' bfl-prices-single' : ''}">${priceItems.join('')}</div>` : ''
  return `<div class="bfl-label">${settings.showName ? `<div class="bfl-name">${escapeHtml(name || 'Product')}</div>` : ''}${settings.showCode ? `<div class="bfl-code">${escapeHtml(code)}</div>` : ''}<div class="bfl-barcode">${barcodeSvg}</div>${prices}</div>`
}

export const printProductCode = (code, productName = 'Product', cost = null, sellingPrice = null, settings = loadLabelSettings()) => {
  const trimmedCode = String(code ?? '').trim()
  if (!trimmedCode) {
    toast.error('Enter a product code before printing.')
    return
  }

  const copies = Math.min(500, Math.max(1, Math.trunc(Number(settings.copies) || 1)))

  let barcodeSvg
  try {
    barcodeSvg = buildBarcodeSvg(trimmedCode, settings)
  } catch {
    toast.error('This product code cannot be converted into a barcode.')
    return
  }

  const printWindow = window.open('', '_blank', 'width=720,height=900')
  if (!printWindow) {
    toast.error('Please allow pop-ups to print the product code.')
    return
  }

  const labelHtml = buildLabelBody({ code: trimmedCode, name: productName, cost, sellingPrice, settings, barcodeSvg })
  printWindow.document.write(`<!doctype html><html><head><title>Print barcode ${escapeHtml(trimmedCode)}</title><style>
    *{box-sizing:border-box}
    body{margin:0;padding:8mm;font-family:Arial,sans-serif;color:#111827;background:#fff}
    ${labelCss(settings)}
    @page{margin:6mm}
    @media print{body{padding:0}}
  </style></head><body><div class="bfl-labels">${labelHtml.repeat(copies)}</div><script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}</script></body></html>`)
  printWindow.document.close()
}
