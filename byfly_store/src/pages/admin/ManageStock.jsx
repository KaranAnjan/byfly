import { useEffect, useState } from 'react'
import { useProducts } from '../../hooks/useProducts'
import StockUpdate from '../../components/admin/StockUpdate'
import Loading from '../../components/common/Loading'
import Pagination from '../../components/common/Pagination'
import { Package, Search } from 'lucide-react'
import { Download } from 'lucide-react'
import { getImageUrl } from '../../lib/imageUrl'
import { downloadCsv } from '../../lib/csv'

const ManageStock = () => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 25
  const { products, loading, refetch, totalCount } = useProducts(undefined, search, { page, limit: PAGE_SIZE })

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [search])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  if (loading && !products.length && !search.trim()) return <Loading />

  const exportStock = () => {
    const columns = ['product_code', 'product_name', 'retail_stock', 'wholesale_stock', 'total_stock', 'retail_price', 'wholesale_price']
    const rows = products.map((product) => [product.product_code, product.product_name, product.stock_by_channel?.retail ?? 0, product.stock_by_channel?.wholesale ?? 0, product.stock_by_channel?.total ?? 0, product.price ?? '', product.wholesale_price ?? ''])
    downloadCsv(`stock-${new Date().toISOString().slice(0, 10)}.csv`, columns, rows)
  }

  return (
    <div className="p-5 sm:p-8">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Stock Management</h1><p className="text-sm text-gray-500 mt-1">Track retail and wholesale inventory separately.</p></div>
        <div className="flex flex-wrap items-center gap-2"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product..." className="w-52 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100" /></div><button onClick={exportStock} className="flex items-center gap-2 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition"><Download className="h-4 w-4" />Export Stock CSV</button></div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retail</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wholesale</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && products.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">Loading products...</td></tr>}
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    {product.image_url ? (
                      <img
                        src={getImageUrl(product.image_url)}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Package className="h-5 w-5 text-gray-300" />
                      </div>
                    )}
                    <span className="font-medium">{product.product_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-sm text-gray-500">
                  {product.product_code}
                </td>
                <StockUpdate product={product} onUpdate={refetch} />
              </tr>
            ))}
            {products.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">No products found.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} itemLabel="products" onPageChange={setPage} />
    </div>
  )
}

export default ManageStock
