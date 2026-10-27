import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { apiRequest } from '../lib/apiClient'
import { normalizeStoreProduct } from '../lib/storeCatalog'
import toast from 'react-hot-toast'

const WishlistContext = createContext()
export const useWishlist = () => useContext(WishlistContext)
export const WishlistProvider = ({ children }) => {
  const { user } = useAuth(); const [products,setProducts]=useState([]); const [loading,setLoading]=useState(false)
  const load = async () => { if(!user){setProducts([]);return};setLoading(true);try{const rows=await apiRequest('/wishlist');setProducts((rows||[]).map(normalizeStoreProduct))}catch(error){if(error.message !== 'authentication required') console.error(error)}finally{setLoading(false)} }
  useEffect(()=>{load()},[user?.id])
  const ids=new Set(products.map(item=>item.id))
  const addToWishlist=async(productOrId)=>{if(!user){toast.error('Please login to add to wishlist');return};const product=typeof productOrId==='object'?productOrId:null;const id=product?.id??productOrId;try{await apiRequest(`/wishlist/${id}`,{method:'PUT'});if(product)setProducts(prev=>prev.some(x=>x.id===id)?prev:[...prev,product]);toast.success((t)=><div className="flex w-full items-center justify-between gap-3"><span>Added to wishlist!</span><a href="/wishlist" onClick={()=>toast.dismiss(t.id)} className="rounded-md bg-white px-3 py-1 text-sm font-semibold text-emerald-600 transition-all hover:bg-emerald-50">View Wishlist</a></div>)}catch(error){toast.error(error.message)}}
  const removeFromWishlist=async(id)=>{if(!user)return;try{await apiRequest(`/wishlist/${id}`,{method:'DELETE'});setProducts(prev=>prev.filter(x=>String(x.id)!==String(id)))}catch(error){toast.error(error.message)}}
  const toggleWishlist=async(value)=>{const id=typeof value==='object'?value.id:value;return ids.has(id)?removeFromWishlist(id):addToWishlist(value)}
  return <WishlistContext.Provider value={{wishlistIds:ids,wishlistProducts:products,loading,addToWishlist,removeFromWishlist,toggleWishlist,isInWishlist:(id)=>ids.has(id),refetch:load}}>{children}</WishlistContext.Provider>
}
