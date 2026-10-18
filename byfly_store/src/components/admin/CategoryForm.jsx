import { useState } from 'react'
import { apiRequest } from '../../lib/apiClient'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'

const CategoryForm = ({ onSave }) => {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      await apiRequest('/admin/categories', { method: 'POST', body: JSON.stringify({ category_name: name.trim() }) })
      toast.success('Category added!')
      setName('')
      onSave()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex space-x-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category name"
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
      />
      <button
        type="submit"
        disabled={loading}
        className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
      >
        <Plus className="h-4 w-4" />
        <span>Add</span>
      </button>
    </form>
  )
}

export default CategoryForm
