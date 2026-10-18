import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { apiRequest } from '../lib/apiClient'
import toast from 'react-hot-toast'

const CartContext = createContext()
const GUEST_CART_KEY = 'monimala_cart_guest'
const userCartKey = (userId) => `monimala_cart_${userId}`
const readCache = (key) => { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : [] } catch { return [] } }
const writeCache = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch {} }
export const useCart = () => useContext(CartContext)

export const CartProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth(); const [cart,setCart]=useState([]); const [owner,setOwner]=useState('guest'); const [loading,setLoading]=useState(true)
  const current = user?.id || 'guest'; const visible = owner === current ? cart : []; const visibleLoading = authLoading || loading || owner !== current
  useEffect(() => { if (authLoading) return; let cancelled=false; setOwner(current); setLoading(true); (async()=>{try{if(!user){setCart(readCache(GUEST_CART_KEY));return};const rows=await apiRequest('/cart');const next=(rows||[]).map(row=>({...row,id:row.product_id,stock:row.stock||0}));if(!cancelled){setCart(next);writeCache(userCartKey(user.id),next)}}catch(error){if(!cancelled){console.error(error);setCart(readCache(userCartKey(user.id)))}}finally{if(!cancelled)setLoading(false)}})();return()=>{cancelled=true}},[user?.id,authLoading])
  const save = async (next, action, productId, quantity) => { setCart(next);setOwner(current);writeCache(user?userCartKey(user.id):GUEST_CART_KEY,next);if(!user)return;try{if(action==='remove')await apiRequest(`/cart/${productId}`,{method:'DELETE'});else await apiRequest('/cart',{method:'PUT',body:JSON.stringify({product_id:String(productId),quantity})})}catch(error){toast.error(error.message)}}
  const addToCart = (product, requestedQuantity) => {const existing=visible.find(item=>String(item.id)===String(product.id));const increment=Math.max(1,Number(requestedQuantity||product.min_order_qty||1));const quantity=requestedQuantity != null ? increment : (existing?.quantity||0)+increment;if(Number(product.stock||0)<quantity){toast.error('There is not enough stock for that order quantity.');return};save(existing?visible.map(item=>item.id===product.id?{...item,quantity}:item):[...visible,{...product,id:product.id,quantity}],'upsert',product.id,quantity)}
  const removeFromCart=(id)=>save(visible.filter(item=>String(item.id)!==String(id)),'remove',id)
  const updateQuantity=(id,quantity)=>{const item=visible.find(x=>String(x.id)===String(id));const min=Math.max(1,Number(item?.min_order_qty||1));if(quantity<=0)return removeFromCart(id);if(quantity<min)return toast.error(`Minimum order quantity is ${min}.`);save(visible.map(x=>x.id===id?{...x,quantity}:x),'upsert',id,quantity)}
  const clearCart=()=>{const items=visible;setCart([]);setOwner(current);writeCache(user?userCartKey(user.id):GUEST_CART_KEY,[]);if(user)items.forEach(item=>apiRequest(`/cart/${item.id}`,{method:'DELETE'}).catch(()=>{}))}
  const total=visible.reduce((sum,item)=>sum+Number(item.price||0)*item.quantity,0)
  return <CartContext.Provider value={{cart:visible,loading:visibleLoading,addToCart,removeFromCart,updateQuantity,clearCart,total}}>{children}</CartContext.Provider>
}
