import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useProduct } from '../../hooks/useProducts'
import { useCart } from '../../context/CartContext'
import { useWishlist } from '../../context/WishlistContext'
import Loading from '../../components/common/Loading'
import { motion } from 'framer-motion'
import { ArrowLeft, ShoppingCart, ChevronRight, IndianRupee, Heart } from 'lucide-react'
import { getImageUrl } from '../../lib/imageUrl'
import { toSlug, formatName } from '../../lib/utils'
import toast from 'react-hot-toast'

const ProductDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { product, loading } = useProduct(id)
  const { cart, addToCart } = useCart()
  const { isInWishlist, toggleWishlist } = useWishlist()
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    setSelectedImage(0)
    setQuantity(Math.max(1, Number(product?.min_order_qty || 1)))
  }, [product?.id, product?.min_order_qty])

  if (loading) return <Loading />
  if (!product) return <div className="text-center py-16 text-lg text-gray-500">Product not found</div>
  const minimumOrder = product.min_order_qty || 1
  const wholesaleDiscount = product.wholesale_mrp != null && product.wholesale_price != null && Number(product.wholesale_mrp) > Number(product.wholesale_price)
    ? Math.round(((Number(product.wholesale_mrp) - Number(product.wholesale_price)) / Number(product.wholesale_mrp)) * 100)
    : 0
  const canMeetMinimum = product.stock >= minimumOrder
  const images = (product.images?.length ? product.images : (product.image_url ? [{ url: product.image_url, image_index: 1 }] : [])).filter((image) => image?.url)
  const activeImage = images[selectedImage] || images[0]

  const handleAddToCart = () => {
    addToCart(product, quantity)
    toast.success((t) => (
      <div className="flex items-center justify-between gap-3 w-full">
        <span>Added to cart!</span>
        <button
          onClick={() => {
            navigate('/cart')
            toast.dismiss(t.id)
          }}
          className="bg-white text-emerald-600 font-semibold px-3 py-1 rounded-md hover:bg-emerald-50 transition-all text-sm"
        >
          View Cart
        </button>
      </div>
    ))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
          <Link to="/" className="hover:text-emerald-600 transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/products" className="hover:text-emerald-600 transition-colors">Products</Link>
          <ChevronRight className="h-3 w-3" />
          {product.categories?.category_name && (
            <>
              <Link to={`/category/${toSlug(product.categories.category_name)}`} className="hover:text-emerald-600 transition-colors">
                {formatName(product.categories.category_name)}
              </Link>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          <span className="text-gray-600 font-medium truncate max-w-[200px]">{product.product_name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="self-start h-fit bg-white rounded-xl border border-gray-200 p-3 md:p-4 overflow-hidden group relative"
          >
            <div className="flex gap-3">
              {images.length > 1 && <div className="flex w-16 flex-shrink-0 flex-col gap-3">
                {images.map((image, index) => index === selectedImage ? null : <button key={image.id || image.image_index || index} type="button" onClick={() => setSelectedImage(index)} className="aspect-square overflow-hidden rounded-md border-2 border-transparent transition hover:border-emerald-400"><img src={getImageUrl(image.url)} alt={`${product.product_name} preview ${index + 1}`} className="h-full w-full object-cover" /></button>)}
              </div>}
              <div className="aspect-square min-w-0 flex-1">
                {activeImage ? <img src={getImageUrl(activeImage.url)} alt={product.product_name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="flex h-full w-full items-center justify-center bg-gray-50"><ShoppingCart className="h-16 w-16 text-gray-300" /></div>}
              </div>
            </div>
            <button
              onClick={() => toggleWishlist(product)}
              className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white shadow-sm transition-all z-10"
            >
              <Heart className={`h-5 w-5 transition-colors ${isInWishlist(product.id) ? 'fill-emerald-600 text-emerald-600' : 'text-gray-600'}`} />
            </button>
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
            className="space-y-5"
          >
            {/* Category */}
            {product.categories?.category_name && (
              <span className="inline-block text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-md">
                {formatName(product.categories.category_name)}
              </span>
            )}

            {/* Title */}
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                {product.product_name}
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Code: <span className="font-mono text-gray-600">{product.product_code}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(230px,0.9fr)] items-start gap-4">
            {/* Price */}
            <div className="flex items-baseline gap-3">
              {product.wholesale_price != null ? (
                <>
                  <span className="text-xl font-extrabold text-emerald-700">₹{product.wholesale_price}</span>
                  {wholesaleDiscount > 0 && <>
                    <span className="text-base text-gray-400 line-through">₹{product.wholesale_mrp}</span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">{wholesaleDiscount}% OFF</span>
                  </>}
                </>
              ) : (
                <span className="text-xs font-medium text-gray-500">Price on request</span>
              )}
            </div>

            <div className="hidden rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Order quantity</p>
                  <p className="text-xs text-slate-500">Minimum {minimumOrder} units</p>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white px-2 py-1 shadow-sm">
                  <button type="button" onClick={() => setQuantity(value => Math.max(minimumOrder, value - 1))} disabled={quantity <= minimumOrder} className="h-8 w-8 rounded-md text-lg font-semibold text-emerald-700 hover:bg-emerald-50 disabled:text-gray-300">−</button>
                  <span className="min-w-7 text-center text-sm font-bold text-slate-900">{quantity}</span>
                  <button type="button" onClick={() => setQuantity(value => Math.min(Number(product.stock || value + 1), value + 1))} disabled={quantity >= Number(product.stock || quantity)} className="h-8 w-8 rounded-md text-lg font-semibold text-emerald-700 hover:bg-emerald-50 disabled:text-gray-300">+</button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-emerald-100 pt-2">
                <span className="text-sm font-medium text-emerald-900">Order total</span>
                <span className="text-lg font-extrabold text-emerald-700">â‚¹{(Number(product.wholesale_price) * quantity).toFixed(0)}</span>
              </div>
            </div>
            </div>

            {/* Stock */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${
              product.stock > 0
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${product.stock > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
              {product.stock > 0
                ? product.stock <= 3 ? `Only ${product.stock} left` : 'In Stock'
                : 'Out of Stock'}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 items-stretch gap-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
            {product.wholesale_price != null && (
              <div className="p-1 sm:pr-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="whitespace-nowrap text-sm font-semibold text-slate-900">Order quantity</p>
                    <p className="whitespace-nowrap text-xs text-slate-500">Minimum {minimumOrder} units</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white px-2 py-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setQuantity(value => Math.max(minimumOrder, value - 1))}
                      disabled={quantity <= minimumOrder}
                      className="h-8 w-8 rounded-md text-lg font-semibold text-emerald-700 hover:bg-emerald-50 disabled:text-gray-300"
                    >−</button>
                    <span className="min-w-7 text-center text-sm font-bold text-slate-900">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(value => Math.min(Number(product.stock || value + 1), value + 1))}
                      disabled={quantity >= Number(product.stock || quantity)}
                      className="h-8 w-8 rounded-md text-lg font-semibold text-emerald-700 hover:bg-emerald-50 disabled:text-gray-300"
                    >+</button>
                  </div>
                </div>
              </div>
            )}

            <div className="h-full p-1 sm:pl-4 sm:border-l sm:border-emerald-100 flex flex-col justify-center">
              <p className="text-sm font-medium text-emerald-900">Order total</p>
            <div className="mt-1 flex items-baseline gap-2 [&>span:not(.order-total-value)]:hidden">
                <span className="order-total-value text-2xl font-extrabold text-emerald-700">₹{(Number(product.wholesale_price) * quantity).toFixed(0)}</span>
              </div>
            </div>
            </div>

            <div>
              {cart.some(item => item.id === product.id) ? (
                <Link to="/cart" className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm">
                  <ShoppingCart className="h-4 w-4" /> View Cart
                </Link>
              ) : (
                <button onClick={handleAddToCart} disabled={!canMeetMinimum || product.wholesale_price == null || quantity > Number(product.stock || 0)} className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm">
                  <ShoppingCart className="h-4 w-4" />
                  {product.stock <= 0 ? 'Sold Out' : !canMeetMinimum ? 'Below minimum quantity' : product.wholesale_price == null ? 'Price unavailable' : 'Add to Cart'}
                </button>
              )}
            </div>

            {product.description?.trim() && (
              <div className="rounded-lg border border-gray-100 bg-white p-4 text-sm leading-6 text-gray-600">
                <h2 className="mb-1 font-semibold text-gray-900">Product details</h2>
                <p className="whitespace-pre-line">{product.description.trim()}</p>
              </div>
            )}

            {product.expiry_date && (
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
                <span className="font-semibold">Expiry date:</span>{' '}
                {new Date(`${String(product.expiry_date).slice(0, 10)}T00:00:00`).toLocaleDateString()}
              </div>
            )}

            {/* Divider */}
            <hr className="border-gray-200" />

            <div className="hidden">
            {/* Add to Cart */}
            {cart.some(item => item.id === product.id) ? (
              <Link to="/cart"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm">
                <ShoppingCart className="h-4 w-4" />
                View Cart
              </Link>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={!canMeetMinimum || product.wholesale_price == null || quantity > Number(product.stock || 0)}
                className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                <ShoppingCart className="h-4 w-4" />
                {product.stock <= 0 ? 'Sold Out' : !canMeetMinimum ? 'Below minimum quantity' : product.wholesale_price == null ? 'Price unavailable' : 'Add to Cart'}
              </button>
            )}
            </div>

            {/* Contact Row */}
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => {
                  const msg = encodeURIComponent(`Hi, interested in:\n${product.product_name}\nCode: ${product.product_code}\n${product.wholesale_price != null ? `Wholesale price: Rs. ${product.wholesale_price}` : 'Please share the wholesale price'}`)
                  window.open(`https://wa.me/${(import.meta.env.VITE_PHONE || '+919339746144').replace(/[^0-9]/g, '')}?text=${msg}`, '_blank')
                }}
                className="text-center text-sm font-medium text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 hover:border-green-300 rounded-lg py-2.5 transition-all"
              >
                WhatsApp
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetail
