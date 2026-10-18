import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { UserPlus, RefreshCw } from 'lucide-react'
import { apiRequest } from '../../lib/apiClient'

const emptyForm = { name: '', business_name: '', email: '', phone: '', password: '' }

const ManageWholesaleAccounts = () => {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const loadAccounts = async () => { setLoading(true); try { const data = await apiRequest('/admin/wholesale-accounts'); setAccounts(data.accounts || []) } catch (e) { toast.error(e.message) } finally { setLoading(false) } }
  useEffect(() => { loadAccounts() }, [])
  const createAccount = async (event) => { event.preventDefault(); setSaving(true); try { await apiRequest('/admin/wholesale-accounts', { method: 'POST', body: JSON.stringify(form) }); toast.success('Wholesale account created'); setForm(emptyForm); loadAccounts() } catch (e) { toast.error(e.message) } finally { setSaving(false) } }
  const toggleAccess = async (account) => { try { await apiRequest(`/admin/wholesale-accounts/${account.id}`, { method: 'PUT', body: JSON.stringify({ active: !account.wholesale_enabled }) }); toast.success(account.wholesale_enabled ? 'Wholesale access paused' : 'Wholesale access enabled'); loadAccounts() } catch (e) { toast.error(e.message) } }
  return <div className="mx-auto max-w-5xl">
    <h1 className="mb-6 text-2xl font-bold text-slate-900">Wholesale Accounts</h1>
    <form onSubmit={createAccount} className="mb-8 grid gap-4 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm md:grid-cols-4">
      <div className="md:col-span-4"><h2 className="font-semibold text-slate-900">Create a wholesale customer</h2><p className="text-sm text-slate-500">The customer signs in using the email and password supplied here.</p></div>
      <input required placeholder="Contact name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
      <input required placeholder="Business name" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
      <input required type="text" placeholder="Customer email or Firebase phone" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
      <input type="password" minLength={6} placeholder="Temporary password (new accounts)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
      <input type="tel" placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
      <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"><UserPlus size={17} />{saving ? 'Creating...' : 'Create account'}</button>
    </form>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-100 p-5"><h2 className="font-semibold">Wholesale customers</h2><button onClick={loadAccounts} className="text-emerald-700" aria-label="Refresh"><RefreshCw size={17} /></button></div>
      {loading ? <p className="p-6 text-slate-500">Loading accounts...</p> : accounts.length === 0 ? <p className="p-6 text-slate-500">No wholesale accounts yet.</p> : <div className="divide-y divide-slate-100">{accounts.map((account) => <div key={account.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-medium text-slate-900">{account.business_name || 'Business not set'}</p><p className="text-sm text-slate-600">{[account.name, account.email, account.phone].filter(Boolean).join(' · ')}</p></div><button onClick={() => toggleAccess(account)} className={`rounded-lg px-3 py-2 text-sm font-medium ${account.wholesale_enabled ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{account.wholesale_enabled ? 'Active · pause access' : 'Paused · enable access'}</button></div>)}</div>}
    </div>
  </div>
}
export default ManageWholesaleAccounts
