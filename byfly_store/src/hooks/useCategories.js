import { useState, useEffect } from 'react'
import { apiRequest } from '../lib/apiClient'

export const useCategories = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCategories = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiRequest('/categories')
      setCategories(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setError(err)
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  return { categories, loading, error, refetch: fetchCategories }
}
