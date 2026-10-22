import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Package, Check } from 'lucide-react'
import { apiRequest } from '../../lib/apiClient'
import { getImageUrl } from '../../lib/imageUrl'
import toast from 'react-hot-toast'

const ITEM_STATUSES = ['pending', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']

const ManageDeliveryDetail = () => {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState({})

  const loadOrder = async () => {
    try {
      setLoading(true)
      const data = await apiRequest(`/admin/orders/${encodeURIComponent(id)}`)
      setOrder(data)
      setDrafts(Object.fromEntries((data?.order_items || []).map((item) => [item.id, item.delivery_status || 'pending'])))
    } catch (error) {
      toast.error('Failed to load order details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadOrder() }, [id])

  const updateItem = async (item) => {
    const status = drafts[item.id]
    try {
      await apiRequest(`/admin/orders/${order.id}/items/${item.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ delivery_status: status }),
      })
      await loadOrder()
      toast.success('Item delivery status updated')
    } catch (_error) {
      toast.error('Failed to update item status')
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" /></div>
  if (!order) return <div className="rounded-xl bg-white p-8 text-center text-gray-500">Order not found.</div>

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/admin/delivery" className="rounded-lg p-2 text-gray-600 hover:bg-gray-100" aria-label="Back to delivery management"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order {order.order_number || `#${order.order_no}`}</h1>
          <p className="text-sm text-gray-500">Order no: {order.order_no} · {new Date(order.created_at).toLocaleDateString()}</p>
        </div>
        <span className="ml-auto rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold capitalize text-emerald-700">{(order.delivery_status || 'pending').replace(/_/g, ' ')}</span>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-gray-900">Customer details</h2>
          <p className="text-sm font-medium text-gray-900">{order.customer_name || 'N/A'}</p>
          <p className="mt-1 text-sm text-gray-600">{order.customer_address || 'No address provided'}</p>
          {order.customer_pincode && <p className="mt-1 text-xs text-gray-500">PIN: {order.customer_pincode}</p>}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-gray-900">Order summary</h2>
          <div className="flex justify-between text-sm text-gray-600"><span>Items</span><span>{order.order_items?.length || 0}</span></div>
          <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 font-semibold text-gray-900"><span>Total</span><span className="text-emerald-700">₹{order.total_amount}</span></div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4"><h2 className="font-semibold text-gray-900">Purchased items and delivery status</h2></div>
        <div className="divide-y divide-gray-100">
          {(order.order_items || []).map((item) => {
            const product = item.products || item
            const changed = drafts[item.id] !== (item.delivery_status || 'pending')
            return (
              <div key={item.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {product.image_url ? <img src={getImageUrl(product.image_url)} alt={product.product_name || product.name || ''} className="h-full w-full object-cover" /> : <Package className="mx-auto mt-5 h-6 w-6 text-gray-300" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{product.product_name || product.name || 'Product'}</p>
                  <p className="mt-1 text-xs text-gray-500">Product no: {product.product_no || '—'} · Quantity: {item.quantity}</p>
                  <p className="mt-1 text-sm font-medium text-emerald-700">₹{Number(item.price || 0) * Number(item.quantity || 0)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select value={drafts[item.id] || 'pending'} onChange={(e) => setDrafts((current) => ({ ...current, [item.id]: e.target.value }))} className="rounded-md border border-gray-300 bg-white px-2 py-2 text-xs capitalize focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500">
                    {ITEM_STATUSES.map((status) => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}
                  </select>
                  {changed && <button onClick={() => updateItem(item)} className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"><Check className="h-3 w-3" /> Save</button>}
                </div>
              </div>
            )
          })}
          {(order.order_items || []).length === 0 && <p className="p-8 text-center text-sm text-gray-400">No items found for this order.</p>}
        </div>
      </div>
    </div>
  )
}

export default ManageDeliveryDetail
