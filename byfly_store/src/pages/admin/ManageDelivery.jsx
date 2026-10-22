import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../../lib/apiClient'
import { Search, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUSES = ['pending', 'confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']

const ManageDelivery = () => {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [draftStatus, setDraftStatus] = useState({})

  useEffect(() => { fetchOrders() }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const data = await apiRequest('/admin/orders')
      setOrders(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (orderId, newStatus) => {
    try {
      const payload = { delivery_status: newStatus, status: newStatus === 'cancelled' ? 'cancelled' : newStatus === 'delivered' ? 'delivered' : undefined }
      await apiRequest(`/admin/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify(payload) })

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...payload } : o))
      setDraftStatus(prev => { const copy = { ...prev }; delete copy[orderId]; return copy })
      toast.success(`Order updated to ${newStatus.replace(/_/g, ' ')}`)
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const filtered = orders.filter(o =>
    !search || (o.order_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.customer_phone || '').includes(search)
  )

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full" /></div>
  }

  return (
    <div className="p-5 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Delivery Management</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search order, name, phone..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-64" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((order) => {
              const currentStatus = order.delivery_status || 'pending'
              const selectedStatus = draftStatus[order.id] ?? currentStatus
              const isChanged = selectedStatus !== currentStatus

              return (
                <tr key={order.id} onClick={() => navigate(`/admin/delivery/${order.order_no}`)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-mono text-emerald-600">
                      {order.order_number || `#${order.id}`}
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-sm font-medium text-gray-900">{order.customer_name || 'N/A'}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                      {order.customer_address || ''}
                    </p>
                    {order.customer_pincode && <p className="text-xs text-gray-400">PIN: {order.customer_pincode}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-600">
                      {`${order.order_items?.length || 0} items`}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{order.total_amount}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                      currentStatus === 'delivered' ? 'bg-green-100 text-green-700' :
                      currentStatus === 'cancelled' ? 'bg-red-100 text-red-700' :
                      currentStatus === 'shipped' || currentStatus === 'out_for_delivery' ? 'bg-blue-100 text-blue-700' :
                      currentStatus === 'partially_delivered' ? 'bg-purple-100 text-purple-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {currentStatus.replace(/_/g, ' ')}
                    </span>
                    {order.delivery_date && (
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(order.delivery_date).toLocaleDateString()}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select value={selectedStatus} onClick={(e) => e.stopPropagation()}
                        onChange={e => setDraftStatus(prev => ({ ...prev, [order.id]: e.target.value }))}
                        className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white">
                        {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                      </select>
                      {isChanged && (
                        <button onClick={(e) => { e.stopPropagation(); updateStatus(order.id, selectedStatus) }}
                          className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-md transition-colors">
                          <Check className="h-3 w-3" /> Update
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">No orders found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ManageDelivery
