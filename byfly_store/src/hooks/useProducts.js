import { useState, useEffect } from 'react'
import { apiRequest } from '../lib/apiClient'
import { normalizeStoreProduct } from '../lib/storeCatalog'

const SKIP = {}

export const useProducts = (categoryId, search = '', options = {}) => {
  const page = Number(options.page) > 0 ? Number(options.page) : 1
  const limit = Number(options.limit) > 0 ? Number(options.limit) : 50
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [meta, setMeta] = useState({ page, limit, totalCount: 0, hasMore: false })

  const fetchProducts = async (id) => {
    try {
      setLoading(true)
      const query = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (id) query.set('category_id', id)
      const trimmedSearch = search.trim()
      const data = trimmedSearch
        ? await apiRequest(`/products/search?q=${encodeURIComponent(trimmedSearch)}&page=${page}&limit=${limit}${options.searchFields ? `&scope=${encodeURIComponent(options.searchFields)}` : ''}`)
        : await apiRequest(`/products?paginated=true&${query.toString()}`)
      const rows = Array.isArray(data) ? data : (data?.items || [])
      setProducts(rows.map(normalizeStoreProduct))
      setMeta({ page: data?.page || page, limit: data?.limit || limit, totalCount: data?.total_count || 0, hasMore: data?.has_more === true })
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
    const debounceTimer = setTimeout(() => fetchProducts(categoryId, search), search.trim() ? 300 : 0)
    return () => clearTimeout(debounceTimer)
  }, [categoryId, search, page, limit])

  return { products, loading, error, ...meta, refetch: () => fetchProducts(categoryId, search) }
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


