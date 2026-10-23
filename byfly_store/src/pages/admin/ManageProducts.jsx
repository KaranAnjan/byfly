import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useProducts } from '../../hooks/useProducts'
import { apiRequest } from '../../lib/apiClient'
import { useCategories } from '../../hooks/useCategories'
import { downloadCsv, parseCsv, numberOr } from '../../lib/csv'
import ProductForm from '../../components/admin/ProductForm'
import ProductTable from '../../components/admin/ProductTable'
import Loading from '../../components/common/Loading'
import toast from 'react-hot-toast'
import { ArrowLeft, Download, FileSpreadsheet, Plus, Search, Upload } from 'lucide-react'

const ManageProducts = () => {
  const { products, loading, refetch } = useProducts()
  const { categories } = useCategories()
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
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
    const columns = ['product_code', 'product_name', 'description', 'category', 'category_id', 'image_url', 'cost', 'retail_price', 'retail_mrp', 'wholesale_price', 'wholesale_mrp', 'wholesale_min_order_qty', 'retail_stock', 'wholesale_stock']
    const rows = products.map((product) => [
      product.product_code, product.product_name, product.description || '', product.categories?.category_name || '', product.category_id,
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
        const productPayload = { product_code: row.product_code, product_name: row.product_name, description: row.description?.trim() || null, category_id: categoryId, image_url: row.image_url || null, price: retailPrice, mrp: retailMrp, stock: numberOr(row.retail_stock) }
        const existing = products.find((product) => product.product_code === row.product_code)
        await apiRequest(existing ? `/admin/products/${existing.id}` : '/admin/products', { method: existing ? 'PUT' : 'POST', body: JSON.stringify({ ...productPayload, cost, retail_price: retailPrice, retail_mrp: retailMrp, wholesale_price: wholesalePrice, wholesale_mrp: wholesaleMrp, wholesale_min_order_qty: Math.max(1, Math.trunc(numberOr(row.wholesale_min_order_qty, 1))), retail_stock: Math.max(0, Math.trunc(numberOr(row.retail_stock))), wholesale_stock: Math.max(0, Math.trunc(numberOr(row.wholesale_stock))) }) })
      }
      toast.success(`${rows.length} product${rows.length === 1 ? '' : 's'} imported.`)
      refetch()
    } catch (error) { toast.error(error.message || 'Import failed.') }
  }

  const filteredProducts = products.filter((product) => `${product.product_code} ${product.product_no} ${product.product_name}`.toLowerCase().includes(search.trim().toLowerCase()))

  if (loading || routeLoading) return <Loading />

  return (
    <div className="px-5 pb-8 pt-8 sm:px-8 sm:pt-8">
      <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
        <div className="flex items-center gap-3">{showForm && <button type="button" onClick={handleBackToProducts} className="rounded-lg p-2 text-gray-600 hover:bg-gray-200" aria-label="Back to products"><ArrowLeft className="h-5 w-5" /></button>}<h1 className="text-2xl font-bold text-gray-900">{productNo ? `Edit Product ${productNo}` : 'Manage Products'}</h1></div>
        {!showForm && (
          <div className="flex flex-wrap gap-2">
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product..." className="w-52 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100" /></div>
            <input ref={importInput} type="file" accept=".csv,text/csv" onChange={importProducts} className="hidden" />
            <button onClick={() => importInput.current?.click()} className="flex items-center gap-2 border border-blue-200 bg-blue-50 text-blue-800 px-3 py-2 rounded-lg hover:bg-blue-100 transition"><Upload className="h-4 w-4" />Import Excel CSV</button>
            <button onClick={() => downloadCsv('product-import-template.csv', ['product_code', 'product_name', 'description', 'category', 'category_id', 'image_url', 'cost', 'retail_price', 'retail_mrp', 'wholesale_price', 'wholesale_mrp', 'wholesale_min_order_qty', 'retail_stock', 'wholesale_stock'], [])} className="flex items-center gap-2 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition"><FileSpreadsheet className="h-4 w-4" />Template</button>
            <button onClick={exportProducts} className="flex items-center gap-2 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition"><Download className="h-4 w-4" />Export Products</button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition"><Plus className="h-4 w-4" />Add Product</button>
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
        products={filteredProducts}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />}
    </div>
  )
}

export default ManageProducts
