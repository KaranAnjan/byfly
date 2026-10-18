import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Chrome, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { sendFirebasePhoneCode, signInWithFirebaseGoogle } from '../../lib/firebaseClient'

const Login = () => {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [mode, setMode] = useState('choose')
  const [loading, setLoading] = useState(false)
  const confirmation = useRef(null)
  const codeRefs = useRef([])
  const { signInWithFirebaseToken } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || new URLSearchParams(location.search).get('redirect') || '/'

  useEffect(() => { if (mode === 'code') codeRefs.current[0]?.focus() }, [mode])
  const finish = async (firebaseUser) => { const token = await firebaseUser.getIdToken(true); await signInWithFirebaseToken(token, firebaseUser.displayName || ''); toast.success('Signed in to ByFly'); navigate(from, { replace: true }) }
  const google = async () => { setLoading(true); try { const result = await signInWithFirebaseGoogle(); await finish(result.user) } catch (e) { toast.error(e.message) } finally { setLoading(false) } }
  const sendCode = async (e) => { e.preventDefault(); let digits = phone.replace(/\D/g, ''); if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2); if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1); const normalized = `+91${digits}`; if (!/^\+91[6-9]\d{9}$/.test(normalized)) { toast.error('Enter a valid Indian mobile number'); return }; setLoading(true); try { const result = await sendFirebasePhoneCode(normalized); confirmation.current = result.confirmation; setMode('code'); toast.success('Verification code sent') } catch (e) { toast.error(e.message) } finally { setLoading(false) } }
  const updateCode = (index, value) => { const digit = value.replace(/\D/g, '').slice(-1); const next = [...code]; next[index] = digit; setCode(next); if (digit && index < 5) codeRefs.current[index + 1]?.focus() }
  const onCodeKeyDown = (index, e) => { if (e.key === 'Backspace' && !code[index] && index > 0) codeRefs.current[index - 1]?.focus() }
  const verify = async (e) => { e.preventDefault(); setLoading(true); try { const result = await confirmation.current.confirm(code.join('')); await finish(result.user) } catch (e) { toast.error(e.message) } finally { setLoading(false) } }

  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50 px-4 py-12"><div className="animate-scale-in w-full max-w-md space-y-5 rounded-2xl bg-white p-8 shadow-xl text-center"><h1 className="animate-fade-in text-2xl font-bold">Sign in to ByFly</h1><p className="animate-fade-in-delay text-sm text-gray-500">Google or phone OTP securely verified by Firebase and the Go backend.</p><div id="recaptcha-container" />{mode === 'choose' ? <div key="choose" className="animate-slide-in-left space-y-4"><button onClick={google} disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-3 font-semibold transition hover:bg-gray-50"><Chrome size={18} />Continue with Google</button><div className="flex items-center gap-3 text-xs text-gray-400"><span className="h-px flex-1 bg-gray-200" />OR<span className="h-px flex-1 bg-gray-200" /></div><form onSubmit={sendCode} className="space-y-3"><div className="flex overflow-hidden rounded-lg border focus-within:ring-2 focus-within:ring-emerald-500"><span className="flex items-center border-r bg-gray-50 px-3 text-gray-600">+91</span><input required value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(-10))} inputMode="numeric" placeholder="10-digit mobile number" className="min-w-0 flex-1 px-3 py-3 outline-none" /></div><button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"><Phone size={18} />{loading ? 'Sending...' : 'Send OTP'}</button></form></div> : <form key="code" onSubmit={verify} className="animate-slide-in-right space-y-4"><p className="text-sm text-gray-500">Enter the 6-digit code sent to <span className="font-semibold text-gray-700">+91 {phone}</span></p><div className="flex justify-center gap-2">{code.map((digit, index) => <input key={index} ref={(el) => { codeRefs.current[index] = el }} value={digit} onChange={(e) => updateCode(index, e.target.value)} onKeyDown={(e) => onCodeKeyDown(index, e)} autoComplete={index === 0 ? 'one-time-code' : 'off'} inputMode="numeric" maxLength={1} className="h-12 w-11 rounded-lg border text-center text-xl font-semibold outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200" />)}</div><button disabled={loading || code.join('').length !== 6} className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60">{loading ? 'Verifying...' : 'Verify OTP'}</button><button type="button" onClick={() => { setMode('choose'); setCode(['', '', '', '', '', '']) }} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-emerald-700"><ArrowLeft size={15} />Change number</button></form>}<Link to="/" className="block text-sm text-gray-500 hover:text-emerald-700">Continue browsing products</Link></div></div>
}

export default Login
