import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useProducts } from '../../hooks/useProducts'
import { apiRequest } from '../../lib/apiClient'
import { useCategories } from '../../hooks/useCategories'
import { downloadCsv, parseCsv, numberOr } from '../../lib/csv'
import ProductForm from '../../components/admin/ProductForm'
import ProductTable from '../../components/admin/ProductTable'
import Loading from '../../components/common/Loading'
import Pagination from '../../components/common/Pagination'
import toast from 'react-hot-toast'
import { ArrowLeft, Download, FileSpreadsheet, Plus, Search, Upload, X } from 'lucide-react'

const ManageProducts = () => {
  const PAGE_SIZE = 25
  const [page, setPage] = useState(1)
  const { categories } = useCategories()
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const suggestionRef = useRef(null)
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
  const [searchParams] = useSearchParams()
  const [editingProduct, setEditingProduct] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const importInput = useRef(null)
  const navigate = useNavigate()
  const { productNo } = useParams()

  useEffect(() => {
    if (!productNo) setShowForm(searchParams.get('new') === '1')
  }, [searchParams, productNo])

  useEffect(() => {
    if (!productNo || loading) return
    const existing = products.find((item) => String(item.product_no) === String(productNo))
    if (existing) {
      setEditingProduct(existing)
      setShowForm(true)
      return
    }
    let cancelled = false
    setRouteLoading(true)
    apiRequest(`/products/${encodeURIComponent(productNo)}`)
      .then((product) => { if (!cancelled) { setEditingProduct(product); setShowForm(true) } })
      .catch(() => { if (!cancelled) { toast.error('Product number not found'); navigate('/admin/products', { replace: true }) } })
      .finally(() => { if (!cancelled) setRouteLoading(false) })
    return () => { cancelled = true }
  }, [productNo, loading, products, navigate])

  const handleEdit = (product) => {
    navigate(`/admin/products/${product.product_no}/edit`)
  }

  const handleBackToProducts = () => {
    setShowForm(false)
    setEditingProduct(null)
    navigate('/admin/products', { replace: true })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return

    try {
      await apiRequest(`/admin/products/${id}`, { method: 'DELETE' })
      toast.success('Product deleted!')
      refetch()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleSave = () => {
    if (productNo) {
      navigate('/admin/products')
      refetch()
      return
    }
    setShowForm(false)
    setEditingProduct(null)
    refetch()
  }

  const handleCancel = () => {
    if (productNo) {
      handleBackToProducts()
      return
    }
    setShowForm(false)
    setEditingProduct(null)
  }

  const exportProducts = () => {
    const columns = ['product_code', 'product_name', 'description', 'category', 'category_id', 'expiry_date', 'image_url', 'cost', 'retail_price', 'retail_mrp', 'wholesale_price', 'wholesale_mrp', 'wholesale_min_order_qty', 'retail_stock', 'wholesale_stock']
    const rows = products.map((product) => [
      product.product_code, product.product_name, product.description || '', product.categories?.category_name || '', product.category_id, product.expiry_date || '',
      product.image_url || '', product.cost ?? '', product.retail_price ?? '', product.retail_mrp ?? '', product.wholesale_price ?? '',
      product.wholesale_mrp ?? '', product.min_order_qty || 1, product.stock_by_channel?.retail ?? 0, product.stock_by_channel?.wholesale ?? 0,
    ])
    downloadCsv(`products-${new Date().toISOString().slice(0, 10)}.csv`, columns, rows)
  }

  const importProducts = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const rows = parseCsv(await file.text())
      if (!rows.length) throw new Error('The CSV file has no product rows.')
      const categoryByName = new Map(categories.map((category) => [category.category_name.trim().toLowerCase(), category.id]))
      for (const [index, row] of rows.entries()) {
        const line = index + 2
        const categoryId = row.category_id || categoryByName.get((row.category || '').trim().toLowerCase())
        if (!row.product_code || !row.product_name || !categoryId) throw new Error(`Row ${line}: product_code, product_name and a valid category are required.`)
        const cost = numberOr(row.cost, NaN), retailPrice = numberOr(row.retail_price, NaN), retailMrp = numberOr(row.retail_mrp, NaN)
        const wholesalePrice = numberOr(row.wholesale_price, NaN), wholesaleMrp = numberOr(row.wholesale_mrp, NaN)
        if (![cost, retailPrice, retailMrp, wholesalePrice, wholesaleMrp].every(Number.isFinite) || cost < 0) throw new Error(`Row ${line}: cost and all four prices are required.`)
        if (retailMrp < retailPrice || wholesaleMrp < wholesalePrice) throw new Error(`Row ${line}: MRP cannot be less than selling price.`)
        const productPayload = { product_code: row.product_code, product_name: row.product_name, description: row.description?.trim() || null, category_id: categoryId, expiry_date: row.expiry_date?.trim() || null, image_url: row.image_url || null, price: retailPrice, mrp: retailMrp, stock: numberOr(row.retail_stock) }
        const existing = products.find((product) => product.product_code === row.product_code)
        await apiRequest(existing ? `/admin/products/${existing.id}` : '/admin/products', { method: existing ? 'PUT' : 'POST', body: JSON.stringify({ ...productPayload, cost, retail_price: retailPrice, retail_mrp: retailMrp, wholesale_price: wholesalePrice, wholesale_mrp: wholesaleMrp, wholesale_min_order_qty: Math.max(1, Math.trunc(numberOr(row.wholesale_min_order_qty, 1))), retail_stock: Math.max(0, Math.trunc(numberOr(row.retail_stock))), wholesale_stock: Math.max(0, Math.trunc(numberOr(row.wholesale_stock))) }) })
      }
      toast.success(`${rows.length} product${rows.length === 1 ? '' : 's'} imported.`)
      refetch()
    } catch (error) { toast.error(error.message || 'Import failed.') }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [search])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  if (routeLoading) return <Loading />

  return (
    <div className="px-5 pb-8 pt-8 sm:px-8 sm:pt-8">
      <div className="sticky top-0 z-30 -mx-5 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-[#f4f6fb]/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">{showForm && <button type="button" onClick={handleBackToProducts} className="rounded-lg p-2 text-gray-600 hover:bg-gray-200" aria-label="Back to products"><ArrowLeft className="h-5 w-5" /></button>}<h1 className={`truncate text-2xl font-bold text-gray-900 transition-all duration-300 ${searchExpanded ? 'max-w-0 -translate-x-2 opacity-0' : 'max-w-[24rem] opacity-100'}`}>{productNo ? `Edit Product ${productNo}` : 'Manage Products'}</h1></div>
        {!showForm && (
          <div className="flex flex-wrap gap-2">
            <div ref={suggestionRef} className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onFocus={() => { setSearchFocused(true); setShowSuggestions(true) }} onChange={(event) => { setSearch(event.target.value); setShowSuggestions(true) }} placeholder="Search product..." className={`rounded-lg border border-slate-300 py-2 pl-9 text-sm outline-none transition-[width] duration-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 ${search ? 'pr-9' : 'pr-3'} ${searchExpanded ? 'w-72 sm:w-80 lg:w-96' : 'w-52'}`} />
              {search && (
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setSearch(''); setShowSuggestions(false) }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" aria-label="Clear search"><X className="h-4 w-4" /></button>
              )}
              {showSuggestions && search.trim() && (
                <div className="absolute left-0 top-full z-40 mt-1 max-h-80 w-full min-w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
                  {loading && suggestions.length === 0 && <div className="px-3 py-2 text-xs text-slate-400">Searching...</div>}
                  {!loading && suggestions.length === 0 && <div className="px-3 py-2 text-xs text-slate-400">No products found.</div>}
                  {suggestions.map((product) => (
                    <button key={product.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setSearch(product.product_name); setShowSuggestions(false) }} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50">
                      <span className="truncate text-slate-700" title={product.product_name}>{product.product_name}</span>
                      <span className="flex-shrink-0 font-mono text-[10px] text-slate-400">{product.product_code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input ref={importInput} type="file" accept=".csv,text/csv" onChange={importProducts} className="hidden" />
            <button onClick={() => importInput.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100"><Upload className="h-4 w-4" />Import CSV</button>
            <button onClick={() => downloadCsv('product-import-template.csv', ['product_code', 'product_name', 'description', 'category', 'category_id', 'expiry_date', 'image_url', 'cost', 'retail_price', 'retail_mrp', 'wholesale_price', 'wholesale_mrp', 'wholesale_min_order_qty', 'retail_stock', 'wholesale_stock'], [])} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"><FileSpreadsheet className="h-4 w-4" />Template</button>
            <button onClick={exportProducts} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"><Download className="h-4 w-4" />Export</button>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700"><Plus className="h-4 w-4" />Add product</button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <ProductForm
            product={editingProduct}
            existingProducts={products}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      )}

      {!showForm && <ProductTable
        products={products}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />}
      {!showForm && <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} itemLabel="products" onPageChange={setPage} />}
    </div>
  )
}

export default ManageProducts
