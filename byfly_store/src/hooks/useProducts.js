import { useState, useEffect } from 'react'
import { apiRequest } from '../lib/apiClient'
import { normalizeStoreProduct } from '../lib/storeCatalog'

const SKIP = {}

export const useProducts = (categoryId, search = '') => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProducts = async (id) => {
    try {
      setLoading(true)
      const query = new URLSearchParams({ page: '1', limit: '50' })
      if (id) query.set('category_id', id)
      const trimmedSearch = search.trim()
      const data = trimmedSearch
        ? await apiRequest(`/products/search?q=${encodeURIComponent(trimmedSearch)}&page=1&limit=50`)
        : await apiRequest(`/products?paginated=true&${query.toString()}`)
      const rows = Array.isArray(data) ? data : (data?.items || [])
      setProducts(rows.map(normalizeStoreProduct))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (categoryId === SKIP) {
      setProducts([])
      setLoading(true)
      return
    }
    fetchProducts(categoryId, search)
  }, [categoryId, search])

  return { products, loading, error, refetch: () => fetchProducts(categoryId, search) }
}

export { SKIP as SKIP_FETCH }

export const useProduct = (id) => {
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProduct = async () => {
      try { const data = await apiRequest(`/products/${encodeURIComponent(id)}`); if (data) setProduct(normalizeStoreProduct(data)) } catch { /* page handles empty state */ }
      setLoading(false)
    }
    if (id) fetchProduct()
  }, [id])

  return { product, loading }
}


