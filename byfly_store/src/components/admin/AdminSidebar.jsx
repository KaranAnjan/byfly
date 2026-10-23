import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  BarChart3,
  Truck,
  Users,
  LogOut,
  ArrowLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  ChevronUp,
  Tags,
} from 'lucide-react'

const AdminSidebar = () => {
  const { signOut } = useAuth()
  const location = useLocation()
  const navRef = useRef(null)
  const [canScrollUp, setCanScrollUp] = useState(false)
  const [canScrollDown, setCanScrollDown] = useState(false)

  const links = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/products', icon: Package, label: 'Products & Prices' },
    { to: '/admin/prices', icon: Tags, label: 'Price Lookup' },
    { to: '/admin/stock', icon: BarChart3, label: 'Current Stock' },
    { to: '/admin/stock-in', icon: ArrowDownToLine, label: 'Stock In' },
    { to: '/admin/stock-out', icon: ArrowUpFromLine, label: 'Stock Out' },
    { to: '/admin/delivery', icon: Truck, label: 'Delivery' },
    { to: '/admin/wholesale-accounts', icon: Users, label: 'Wholesale Accounts' },
    { to: '/admin/categories', icon: FolderOpen, label: 'Categories' },
  ]

  const isActive = (path) => location.pathname === path

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return undefined

    const updateScrollIndicators = () => {
      setCanScrollUp(nav.scrollTop > 4)
      setCanScrollDown(nav.scrollTop + nav.clientHeight < nav.scrollHeight - 4)
    }

    updateScrollIndicators()
    nav.addEventListener('scroll', updateScrollIndicators, { passive: true })
    window.addEventListener('resize', updateScrollIndicators)

    return () => {
      nav.removeEventListener('scroll', updateScrollIndicators)
      window.removeEventListener('resize', updateScrollIndicators)
    }
  }, [links.length])

  const scrollNav = (amount) => {
    navRef.current?.scrollBy({ top: amount, behavior: 'smooth' })
  }

  return (
    <div className="flex h-screen w-64 shrink-0 flex-col overflow-hidden bg-gradient-to-b from-[#241052] via-[#2e1268] to-[#1a0b3d] p-4 text-white">
      <div className="mb-8 border-b border-white/10 pb-6 text-center">
        <img src="/assets/newlogo.png" alt="Byfly logo" className="mx-auto mb-3 h-14 w-20 object-contain" />
        <h2 className="text-xl font-bold tracking-wide text-amber-200">BYFLY</h2>
        <p className="mt-1 text-[9px] uppercase tracking-[0.22em] text-white/60">Fashion jewellery house</p>
      </div>

      <div className="relative min-h-0 flex-1">
        <nav ref={navRef} className="scrollbar-hide h-full space-y-2 overflow-y-auto pr-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                isActive(link.to)
                  ? 'bg-gradient-to-r from-[#6334cf] to-[#4b21a5] text-white shadow-lg shadow-purple-950/30'
                  : 'text-purple-100/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <link.icon className="h-5 w-5" />
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        {canScrollUp && (
          <button
            type="button"
            onClick={() => scrollNav(-180)}
            aria-label="Scroll admin menu up"
            className="absolute left-1/2 top-1 z-10 -translate-x-1/2 rounded-full border border-white/20 bg-[#3c1a82]/95 p-1 text-white shadow-lg hover:bg-[#6334cf]"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        )}
        {canScrollDown && (
          <button
            type="button"
            onClick={() => scrollNav(180)}
            aria-label="Scroll admin menu down"
            className="absolute bottom-1 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/20 bg-[#3c1a82]/95 p-1 text-white shadow-lg hover:bg-[#6334cf]"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-auto shrink-0 space-y-2 border-t border-white/10 pt-4">
        <Link
          to="/"
          className="flex items-center space-x-3 rounded-lg px-4 py-3 text-purple-100/75 transition hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Site</span>
        </Link>
        <button
          onClick={signOut}
          className="flex w-full items-center space-x-3 rounded-lg px-4 py-3 text-red-300 transition hover:bg-white/10"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}

export default AdminSidebar
