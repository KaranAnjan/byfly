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
  Tags,
} from 'lucide-react'

const AdminSidebar = () => {
  const { signOut } = useAuth()
  const location = useLocation()

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

  return (
    <div className="flex h-screen w-64 shrink-0 flex-col overflow-hidden bg-gradient-to-b from-[#241052] via-[#2e1268] to-[#1a0b3d] p-4 text-white">
      <div className="mb-8 border-b border-white/10 pb-6 text-center">
        <img src="/assets/newlogo.png" alt="Byfly logo" className="mx-auto mb-3 h-14 w-20 object-contain" />
        <h2 className="text-xl font-bold tracking-wide text-amber-200">BYFLY</h2>
        <p className="mt-1 text-[9px] uppercase tracking-[0.22em] text-white/60">Fashion jewellery house</p>
      </div>

      <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
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
