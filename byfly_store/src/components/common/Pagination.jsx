import { ChevronLeft, ChevronRight } from 'lucide-react'

const getPageNumbers = (page, totalPages) => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)
  if (page <= 3) return [1, 2, 3, 'ellipsis-right', totalPages]
  if (page >= totalPages - 2) return [1, 'ellipsis-left', totalPages - 2, totalPages - 1, totalPages]
  return [1, 'ellipsis-left', page, 'ellipsis-right', totalPages]
}

const Pagination = ({ page, totalPages, onPageChange, totalCount, pageSize, itemLabel = 'items' }) => {
  if (!totalCount || totalPages <= 1) return null
  const firstItem = (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, totalCount)
  const buttonClass = 'grid h-8 min-w-8 place-items-center rounded-lg border border-slate-200 px-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'

  return <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm">
    <p className="text-sm text-slate-500">Showing {firstItem}–{lastItem} of {totalCount} {itemLabel}</p>
    <nav aria-label={`${itemLabel} pagination`} className="flex items-center gap-1">
      <button type="button" className={`${buttonClass} px-3`} disabled={page === 1} onClick={() => onPageChange(1)}>First</button>
      <button type="button" className={buttonClass} aria-label="Previous page" disabled={page === 1} onClick={() => onPageChange(page - 1)}><ChevronLeft className="h-4 w-4" /></button>
      {getPageNumbers(page, totalPages).map((number, index) => number.toString().startsWith('ellipsis')
        ? <span key={`${number}-${index}`} className="grid h-8 min-w-8 place-items-center text-xs text-slate-500">…</span>
        : <button type="button" key={number} aria-current={number === page ? 'page' : undefined} onClick={() => onPageChange(number)} className={`${buttonClass} ${number === page ? 'border-violet-600 bg-violet-600 text-white hover:border-violet-600 hover:bg-violet-600' : ''}`}>{number}</button>)}
      <button type="button" className={buttonClass} aria-label="Next page" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}><ChevronRight className="h-4 w-4" /></button>
      <button type="button" className={`${buttonClass} px-3`} disabled={page === totalPages} onClick={() => onPageChange(totalPages)}>Last</button>
    </nav>
  </div>
}

export default Pagination
