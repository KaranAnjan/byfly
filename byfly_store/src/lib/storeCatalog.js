export const normalizeStoreProduct = (product) => {
  const prices = product.product_prices || {}
  const stockRecord = Array.isArray(product.product_stock) ? product.product_stock[0] : product.product_stock
  const retailStock = Number(stockRecord?.retail_quantity ?? 0)
  const wholesaleStock = Number(stockRecord?.wholesale_quantity ?? 0)
  const totalStock = retailStock + wholesaleStock

  return {
    ...product,
    // The Go API returns these fields directly. Keep the old nested shape as a fallback for cached records.
    retail_price: product.retail_price ?? product.price ?? prices.retail_price ?? null,
    wholesale_price: product.wholesale_price ?? prices.wholesale_price ?? null,
    retail_mrp: product.retail_mrp ?? product.mrp ?? prices.retail_mrp ?? null,
    wholesale_mrp: product.wholesale_mrp ?? prices.wholesale_mrp ?? null,
    min_order_qty: Math.max(1, Number(product.wholesale_min_order_qty ?? prices.wholesale_min_order_qty ?? 1)),
    price: product.wholesale_price ?? prices.wholesale_price ?? product.retail_price ?? product.price ?? null,
    mrp: product.wholesale_mrp ?? prices.wholesale_mrp ?? product.retail_mrp ?? product.mrp ?? null,
    stock_by_channel: {
      retail: retailStock,
      wholesale: wholesaleStock,
      total: totalStock,
    },
    stock: wholesaleStock,
  }
}

export const productRoute = (product) => `/products/${encodeURIComponent(product?.product_no || product?.id || '')}`
