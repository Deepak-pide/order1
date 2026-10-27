import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight,
  BadgeIndianRupee,
  BarChart3,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Pencil,
  Plus,
  Search,
  Save,
  Trash2,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  DEFAULT_HERO_SLIDES,
  fromBill,
  fromBranch,
  fromCategory,
  fromProduct,
  fromRequest,
  fromSettings,
  formatRupees,
  sellingPrice,
  toBill,
  toBranch,
  toCategory,
  toProduct,
  toRequest,
  toSettings,
  BUSINESS_PHONE,
} from '../lib/storeData.js'
import { checkSupabaseConnection, describeSupabaseError, isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { playUiSound } from '../lib/uiSounds.js'

const formatDate = (date) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
const OWNER_EMAIL = 'dg3667610@gmail.com'

async function downloadBillPdf(bill, businessName, branchName) {
  const { jsPDF } = await import('jspdf')
  const document = new jsPDF()
  const pageWidth = document.internal.pageSize.getWidth()
  const rightEdge = pageWidth - 14
  let y = 20

  document.setFont('helvetica', 'bold')
  document.setFontSize(18)
  document.text(businessName || 'Rajesh Traders', 14, y)
  document.setFontSize(11)
  document.text('INVOICE', rightEdge, y, { align: 'right' })
  y += 9
  document.setFont('helvetica', 'normal')
  document.setFontSize(10)
  document.text(`Invoice: ${bill.id}`, 14, y)
  document.text(`Date: ${formatDate(bill.createdAt)}`, rightEdge, y, { align: 'right' })
  y += 7
  document.text(`Branch: ${branchName || 'Rajesh Traders'}`, 14, y)
  y += 12
  document.setFont('helvetica', 'bold')
  document.text('Bill to', 14, y)
  y += 6
  document.setFont('helvetica', 'normal')
  document.text(`Name: ${bill.customer.name || '-'}`, 14, y)
  y += 6
  document.text(`Phone: ${bill.customer.phone || '-'}`, 14, y)
  y += 6
  const locationLines = document.splitTextToSize(`Delivery: ${bill.customer.location || '-'}`, pageWidth - 28)
  document.text(locationLines, 14, y)
  y += locationLines.length * 5 + 7

  document.setFont('helvetica', 'bold')
  document.text('Item', 14, y)
  document.text('Qty', pageWidth - 75, y, { align: 'right' })
  document.text('Unit price', pageWidth - 47, y, { align: 'right' })
  document.text('Amount', rightEdge, y, { align: 'right' })
  y += 3
  document.line(14, y, rightEdge, y)
  y += 7

  document.setFont('helvetica', 'normal')
  for (const item of bill.items) {
    const itemLines = document.splitTextToSize(item.name || item.productId || 'Product', pageWidth - 112)
    const rowHeight = Math.max(7, itemLines.length * 5)
    if (y + rowHeight > 275) {
      document.addPage()
      y = 20
    }
    const quantity = Number(item.quantity || 0)
    const unitPrice = Number(item.unitPrice || 0)
    document.text(itemLines, 14, y)
    document.text(String(quantity), pageWidth - 75, y, { align: 'right' })
    document.text(`INR ${unitPrice.toLocaleString('en-IN')}`, pageWidth - 47, y, { align: 'right' })
    document.text(`INR ${(quantity * unitPrice).toLocaleString('en-IN')}`, rightEdge, y, { align: 'right' })
    y += rowHeight + 3
  }

  if (y > 275) {
    document.addPage()
    y = 20
  }
  document.line(14, y, rightEdge, y)
  y += 9
  document.setFont('helvetica', 'bold')
  document.text(`Total: INR ${Number(bill.total || 0).toLocaleString('en-IN')}`, rightEdge, y, { align: 'right' })
  y += 12
  document.setFont('helvetica', 'normal')
  document.setFontSize(9)
  document.text('Please contact the branch for payment and delivery arrangements.', 14, y)
  document.save(`${bill.id}.pdf`)
}

function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('checking')
  const [connectionError, setConnectionError] = useState('')

  useEffect(() => {
    let active = true
    checkSupabaseConnection().then(() => {
      if (active) setConnectionStatus('ready')
    }).catch((error) => {
      if (active) {
        setConnectionError(describeSupabaseError(error))
        setConnectionStatus('error')
      }
    })
    return () => { active = false }
  }, [])

  async function finishLogin(user) {
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('display_name, role, branch_id, branches(name)')
      .eq('user_id', user.id)
      .maybeSingle()
    if (profileError || !profile) {
      await supabase.auth.signOut()
      throw new Error(profileError?.message || 'No business profile was created. Run the owner-account signup migration in Supabase, then try again.')
    }
    onLogin({
      userId: user.id,
      email: user.email,
      name: profile.display_name,
      role: profile.role,
      branchId: profile.branch_id,
      branchName: profile.branches?.name || 'Main account',
    })
  }

  async function signIn(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured for this deployment.')
      return
    }
    setBusy(true)
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInError) {
        setError(describeSupabaseError(signInError))
        return
      }
      await finishLogin(data.user)
    } catch (signInError) {
      setError(`Unable to sign in: ${describeSupabaseError(signInError)}`)
    } finally {
      setBusy(false)
    }
  }

  async function signUp(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured for this deployment.')
      return
    }
    if (email.trim().toLowerCase() !== OWNER_EMAIL) {
      setError(`Administrator account creation is restricted to ${OWNER_EMAIL}.`)
      return
    }
    if (password.length < 12) {
      setError('Choose a strong password with at least 12 characters.')
      return
    }

    setBusy(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: OWNER_EMAIL,
        password,
      })
      if (signUpError) {
        setError(describeSupabaseError(signUpError))
        return
      }
      if (data.session?.user) {
        await finishLogin(data.session.user)
        return
      }
      if (data.user) {
        const { data: signInData, error: directLoginError } = await supabase.auth.signInWithPassword({ email: OWNER_EMAIL, password })
        if (signInData?.user) {
          await finishLogin(signInData.user)
          return
        }
        setMode('signin')
        setPassword('')
        setMessage(directLoginError ? `Account created for ${OWNER_EMAIL}. Sign in with your password to continue.` : `Account created for ${OWNER_EMAIL}. Sign in to continue.`)
        return
      }
      setMode('signin')
      setPassword('')
      setMessage(`Account created for ${OWNER_EMAIL}. Sign in to continue.`)
    } catch (signUpError) {
      setError(`Unable to create administrator account: ${describeSupabaseError(signUpError)}`)
    } finally {
      setBusy(false)
    }
  }

  async function resetPassword() {
    setError('')
    setMessage('')
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured for this deployment.')
      return
    }
    if (!email.trim()) {
      setError('Enter your work email first to request a password reset.')
      return
    }
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/admin`,
      })
      if (resetError) setError(describeSupabaseError(resetError))
      else setMessage('If that account exists, Supabase will send a password reset link.')
    } catch (resetError) {
      setError(`Unable to request a password reset: ${describeSupabaseError(resetError)}`)
    }
  }

  return (
    <main className="flex min-h-screen bg-slate-50">
      <div className="hidden w-[42%] flex-col justify-between bg-[#101820] p-10 text-white lg:flex xl:p-14">
        <Link to="/" className="inline-flex w-fit items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-slate-950"><Store size={23} /></span>
          <span><span className="block text-base font-bold">Rajesh Traders</span><span className="mt-0.5 block text-[10px] tracking-[0.16em] text-amber-200/70">BUSINESS PORTAL</span></span>
        </Link>
        <div className="max-w-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-200"><BarChart3 size={24} /></div>
          <h1 className="mt-6 text-4xl font-bold leading-tight">One business.<br />Every branch.</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300/75">Manage products, customer requests and branch performance from a single workspace.</p>
          <div className="mt-8 space-y-4 text-sm text-slate-200/85">
            {['Owner view across all locations', 'Branch staff see their branch only', 'Update prices and offers in one place'].map((text) => <p key={text} className="flex items-center gap-3"><Check size={16} className="text-amber-300" />{text}</p>)}
          </div>
        </div>
        <p className="text-xs text-blue-100/40">Rajesh Traders · Building materials management</p>
      </div>
      <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-[420px]">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-700 lg:hidden"><ChevronRight size={15} className="rotate-180" /> Back to public store</Link>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-800"><ShieldCheck size={22} /></div>
            <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">{mode === 'signup' ? 'Create administrator account' : 'Business sign in'}</h2>
            <p className="mt-1 text-sm text-slate-500">{mode === 'signup' ? `Only ${OWNER_EMAIL} can create the owner account.` : 'Sign in with your administrator or assigned branch account.'}</p>
            <form onSubmit={mode === 'signup' ? signUp : signIn} className="mt-5 space-y-4">
              <label className="block text-xs font-semibold text-slate-700">Work email
                <input autoComplete="username" type="email" required readOnly={mode === 'signup'} value={mode === 'signup' ? OWNER_EMAIL : email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 read-only:bg-slate-50" placeholder="you@rajeshtraders.in" />
              </label>
              <label className="block text-xs font-semibold text-slate-700">Password
                <span className="relative mt-1.5 block"><input autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 12 : undefined} type={showPassword ? 'text' : 'password'} required value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 pr-10 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder={mode === 'signup' ? 'At least 12 characters' : 'Enter password'} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:bg-slate-100">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span>
              </label>
              {connectionStatus === 'checking' && <p role="status" className="rounded-lg bg-blue-50 px-3 py-2.5 text-xs leading-5 text-blue-700">Checking Supabase connection…</p>}
              {connectionError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-700">{connectionError}</p>}
              {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-700">{error}</p>}
              {message && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2.5 text-xs leading-5 text-emerald-700">{message}</p>}
              <button type="submit" disabled={busy || connectionStatus !== 'ready'} className="h-11 w-full rounded-lg bg-blue-700 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60">{busy ? (mode === 'signup' ? 'Creating account…' : 'Signing in…') : connectionStatus === 'checking' ? 'Checking connection…' : mode === 'signup' ? 'Create administrator account' : 'Sign in to workspace'}</button>
              {mode === 'signin' && <button type="button" onClick={resetPassword} className="w-full text-xs font-semibold text-blue-700 hover:underline">Forgot password?</button>}
              <button type="button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setEmail(mode === 'signup' ? '' : OWNER_EMAIL); setPassword(''); setError(''); setMessage('') }} className="w-full text-xs font-semibold text-slate-600 hover:text-blue-700">{mode === 'signup' ? 'Already have an account? Sign in' : 'First time? Create the administrator account'}</button>
            </form>
          </div>
          <p className="mt-4 text-center text-[11px] text-slate-400">Public customer? <Link to="/" className="font-semibold text-blue-700 hover:underline">Continue to the store</Link></p>
        </div>
      </div>
    </main>
  )
}

function AdminSidebar({ session, section, onSection, onLogout, open, onClose, phone }) {
  const ownerItems = [
    ['Dashboard', LayoutDashboard],
    ['Products & pricing', Package],
    ['Bills & enquiries', FileText],
    ['Branches', Building2],
    ['Settings', Settings],
  ]
  const branchItems = [
    ['Dashboard', LayoutDashboard],
    ['Bills & enquiries', FileText],
    ['Products', Package],
  ]
  const items = session.role === 'owner' ? ownerItems : branchItems

  return <>
    {open && <button aria-label="Close navigation" onClick={onClose} className="fixed inset-0 z-30 bg-slate-950/40 md:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[258px] flex-col border-r border-white/10 bg-[#101820] text-white transition-transform duration-200 md:sticky md:top-0 md:z-auto md:h-screen md:translate-x-0 md:inset-y-auto md:left-auto md:self-start ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-5">
        <Link to="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950"><Store size={20} /></span><span><span className="block text-sm font-bold">Rajesh Traders</span><span className="mt-0.5 block text-[9px] tracking-[0.16em] text-amber-200/70">BUSINESS PORTAL</span></span></Link>
        <button onClick={onClose} aria-label="Close menu" className="rounded-lg p-2 text-blue-100 md:hidden"><X size={18} /></button>
      </div>
      <div className="px-4 pt-6">
        <p className="px-3 pb-3 text-[9px] font-bold uppercase tracking-[0.16em] text-amber-100/50">Workspace</p>
        <nav className="space-y-1">{items.map(([label, Icon]) => <button key={label} onClick={() => { onSection(label); onClose() }} className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-xs font-semibold transition ${section === label ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-200/75 hover:bg-white/10 hover:text-white'}`}><Icon size={17} />{label}</button>)}</nav>
      </div>
      <div className="mt-auto p-4">
        <div className="rounded-xl border border-white/15 bg-white/[0.05] p-4"><CircleHelp size={18} className="text-amber-300" /><p className="mt-3 text-xs font-semibold">Need a hand?</p><p className="mt-1 text-[10px] leading-4 text-slate-300/60">Call the main office for account support.</p><a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="mt-3 block text-[10px] font-semibold text-amber-300">{phone}</a></div>
        <div className="mt-4 flex items-center gap-2.5 border-t border-white/10 pt-4"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-400/20 text-[10px] font-bold text-blue-100">{session.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold">{session.name}</p><p className="truncate text-[9px] text-blue-100/55">{session.role === 'owner' ? 'Main account' : session.branchName}</p></div><button aria-label="Sign out" onClick={onLogout} className="rounded-lg p-2 text-blue-100/60 hover:bg-white/10 hover:text-white"><LogOut size={15} /></button></div>
      </div>
    </aside>
  </>
}

function MetricCard({ title, value, icon: Icon, change, color = 'blue' }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
  }
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-slate-500">{title}</p><p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[color]}`}><Icon size={19} /></span></div>{change && <p className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-emerald-700"><ArrowUpRight size={13} /> {change}</p>}</div>
}

function EmptyState({ icon: Icon, title, copy }) {
  return <div className="px-5 py-12 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Icon size={22} /></span><p className="mt-3 text-sm font-semibold text-slate-800">{title}</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">{copy}</p></div>
}

function matchesPeriod(date, period) {
  const eventDate = new Date(date)
  const now = new Date()
  if (period === 'All time') return true
  if (period === 'Today') return eventDate.toDateString() === now.toDateString()
  if (period === 'This month') return eventDate.getFullYear() === now.getFullYear() && eventDate.getMonth() === now.getMonth()
  const earliest = new Date(now)
  earliest.setDate(now.getDate() - 29)
  earliest.setHours(0, 0, 0, 0)
  return eventDate >= earliest && eventDate <= now
}

function Dashboard({ session, requests, branches, onBranchSelect }) {
  const [period, setPeriod] = useState('This month')
  const periodRequests = requests.filter((item) => matchesPeriod(item.createdAt, period))
  const scopedRequests = session.role === 'owner' ? periodRequests : periodRequests.filter((item) => item.branchId === session.branchId)
  const orders = scopedRequests.filter((item) => item.type === 'Order')
  const revenue = orders.reduce((sum, item) => sum + Number(item.total || 0), 0)
  const pending = scopedRequests.filter((item) => item.status === 'New' || item.status === 'Contacted').length
  const branchPerformance = branches.map((branch) => {
    const branchOrders = periodRequests.filter((item) => item.branchId === branch.id && item.type === 'Order')
    const branchRequests = periodRequests.filter((item) => item.branchId === branch.id)
    return { ...branch, sales: branchOrders.reduce((sum, item) => sum + Number(item.total || 0), 0), orderCount: branchOrders.length, enquiries: branchRequests.filter((item) => item.type === 'Enquiry').length }
  }).filter((branch) => session.role === 'owner' || branch.id === session.branchId)
  const maxSales = Math.max(1, ...branchPerformance.map((branch) => branch.sales))

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold text-amber-700">{session.role === 'owner' ? 'All locations' : session.branchName}</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Dashboard overview</h1><p className="mt-1 text-sm text-slate-500">Welcome back, {session.name}. Review customer activity and performance.</p></div><label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600">Reporting period<select value={period} onChange={(event) => setPeriod(event.target.value)} className="bg-transparent py-1 text-xs font-bold text-slate-900 outline-none"><option>This month</option><option>Last 30 days</option><option>Today</option><option>All time</option></select></label></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard title={session.role === 'owner' ? 'Order value requested' : 'Branch order value'} value={formatRupees(revenue)} icon={BadgeIndianRupee} color="blue" />
      <MetricCard title="Order requests" value={orders.length} icon={ShoppingBag} color="green" />
      <MetricCard title="New enquiries" value={scopedRequests.filter((item) => item.type === 'Enquiry').length} icon={ClipboardList} color="amber" />
      <MetricCard title="Needs attention" value={pending} icon={BarChart3} color="violet" />
    </div>
    <div className={`grid gap-5 ${session.role === 'owner' ? 'xl:grid-cols-[1.35fr_1fr]' : ''}`}>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-bold text-slate-900">Recent customer requests</h2><p className="mt-1 text-[10px] text-slate-500">Orders and enquiries from the public storefront</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">{scopedRequests.length} total</span></div>
        {scopedRequests.length === 0 ? <EmptyState icon={ClipboardList} title="No customer requests in this period" copy="Orders and enquiries submitted on the public store will show up here." /> : <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left"><thead><tr className="bg-slate-50 text-[9px] uppercase tracking-wider text-slate-400"><th className="px-5 py-3">Request</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Value</th><th className="px-5 py-3">Status</th></tr></thead><tbody>{scopedRequests.slice(0, 5).map((request) => <tr key={request.id} className="border-t border-slate-50"><td className="whitespace-nowrap px-5 py-3 text-xs font-semibold text-blue-700">{request.id}<span className="mt-1 block text-[9px] font-medium text-slate-400">{request.type}</span></td><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-700">{request.customer.name}</td><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{branches.find((branch) => branch.id === request.branchId)?.name || 'Unassigned'}</td><td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-700">{formatRupees(request.total)}</td><td className="px-5 py-3"><StatusPill status={request.status} /></td></tr>)}</tbody></table></div>}
      </section>
      {session.role === 'owner' && <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-sm font-bold text-slate-900">Branch performance</h2><p className="mt-1 text-[10px] text-slate-500">Select a branch to open its detailed performance</p></div><span className="rounded-lg bg-amber-50 p-2 text-amber-700"><Building2 size={17} /></span></div><div className="mt-4 space-y-2">{branchPerformance.map((branch) => <button key={branch.id} onClick={() => onBranchSelect(branch.id)} className="w-full rounded-lg border border-slate-100 p-3 text-left transition hover:border-amber-300 hover:bg-amber-50/40"><span className="mb-2 flex items-center justify-between gap-3"><span><span className="block text-xs font-semibold text-slate-800">{branch.name}</span><span className="text-[9px] text-slate-400">{branch.city} · {branch.orderCount} orders · {branch.enquiries} enquiries</span></span><span className="text-xs font-bold text-slate-700">{formatRupees(branch.sales)}</span></span><span className="block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-amber-500 transition-all" style={{ width: `${branch.sales ? Math.max(5, branch.sales / maxSales * 100) : 0}%` }} /></span></button>)}</div><p className="mt-4 border-t border-slate-100 pt-3 text-[9px] leading-4 text-slate-400">Values are estimates from website order requests, not paid sales or accounting records.</p></section>}
    </div>
  </div>
}

function BranchDetails({ branch, requests, bills, onBack }) {
  const [period, setPeriod] = useState('This month')
  const scopedRequests = requests.filter((item) => item.branchId === branch.id && matchesPeriod(item.createdAt, period))
  const scopedBills = bills.filter((item) => item.branchId === branch.id && matchesPeriod(item.createdAt, period))
  const orders = scopedRequests.filter((item) => item.type === 'Order')
  const totalRequested = orders.reduce((sum, item) => sum + Number(item.total || 0), 0)
  const paid = scopedBills.filter((bill) => bill.status === 'Paid').reduce((sum, bill) => sum + Number(bill.total || 0), 0)
  const outstanding = scopedBills.filter((bill) => bill.status === 'Unpaid').reduce((sum, bill) => sum + Number(bill.total || 0), 0)

  return <div className="space-y-5">
    <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-amber-700"><ChevronLeft size={15} /> All branches</button>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold text-amber-700">Branch performance</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{branch.name}</h1><p className="mt-1 text-sm text-slate-500">{branch.city || 'City not set'}{branch.manager ? ` · Managed by ${branch.manager}` : ''}</p></div><label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600">Period<select value={period} onChange={(event) => setPeriod(event.target.value)} className="bg-transparent py-1 text-xs font-bold text-slate-900 outline-none"><option>This month</option><option>Last 30 days</option><option>Today</option><option>All time</option></select></label></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard title="Order value requested" value={formatRupees(totalRequested)} icon={BadgeIndianRupee} color="amber" /><MetricCard title="Customer orders" value={orders.length} icon={ShoppingBag} color="blue" /><MetricCard title="Enquiries" value={scopedRequests.filter((item) => item.type === 'Enquiry').length} icon={ClipboardList} color="violet" /><MetricCard title="Paid bills / outstanding" value={`${formatRupees(paid)} / ${formatRupees(outstanding)}`} icon={FileText} color="green" /></div>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-bold text-slate-900">Branch customer activity</h2><p className="mt-1 text-[10px] text-slate-500">{scopedRequests.length} requests · {scopedBills.length} bills for selected period</p></div>
      {scopedRequests.length === 0 ? <EmptyState icon={ClipboardList} title="No branch activity in this period" copy="Customer orders and enquiries assigned to this branch will appear here." /> : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead><tr className="bg-slate-50 text-[9px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-5 py-3">Request</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Location</th><th className="px-3 py-3">Value</th><th className="px-3 py-3">Status</th><th className="px-5 py-3">Date</th></tr></thead><tbody>{scopedRequests.map((request) => <tr key={request.id} className="border-t border-slate-100"><td className="px-5 py-3"><p className="text-xs font-semibold text-blue-700">{request.id}</p><p className="mt-1 text-[9px] text-slate-400">{request.type}</p></td><td className="px-3 py-3"><p className="text-xs font-semibold text-slate-700">{request.customer.name}</p><a href={`tel:${request.customer.phone}`} className="mt-1 block text-[10px] text-blue-700">{request.customer.phone}</a></td><td className="px-3 py-3 text-xs text-slate-500">{request.customer.location}</td><td className="px-3 py-3 text-xs font-semibold text-slate-800">{formatRupees(request.total)}</td><td className="px-3 py-3"><StatusPill status={request.status} /></td><td className="px-5 py-3 text-[10px] text-slate-500">{formatDate(request.createdAt)}</td></tr>)}</tbody></table></div>}
    </section>
  </div>
}

function StatusPill({ status }) {
  const styles = { New: 'bg-blue-50 text-blue-700', Contacted: 'bg-amber-50 text-amber-700', Confirmed: 'bg-violet-50 text-violet-700', Completed: 'bg-emerald-50 text-emerald-700', Cancelled: 'bg-slate-100 text-slate-500' }
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-semibold ${styles[status] || styles.New}`}>{status}</span>
}

function ProductManagement({ products, onSave, categories, onSaveCategories, canEdit }) {
  const [drafts, setDrafts] = useState(products)
  const [showNewProduct, setShowNewProduct] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', detail: '' })
  const [categoryError, setCategoryError] = useState('')
  const [productError, setProductError] = useState('')
  const [savedId, setSavedId] = useState('')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ name: '', description: '', category: categories[0]?.name || '', basePrice: '', discountPercent: '0', image: '', imageName: '' })

  useEffect(() => setDrafts(products), [products])

  function updateDraft(id, key, value) {
    setDrafts((items) => items.map((item) => item.id === id ? { ...item, [key]: value } : item))
    setSavedId('')
  }

  async function saveProduct(id) {
    const product = drafts.find((item) => item.id === id)
    const basePrice = Number(product.basePrice)
    const discountPercent = Number(product.discountPercent)
    if (!product.name.trim() || !Number.isFinite(basePrice) || basePrice <= 0 || !Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      setProductError('Enter a product name, a price greater than zero, and a discount from 0 to 100%.')
      return
    }
    try {
      await onSave(drafts.map((item) => item.id === id ? { ...item, name: item.name.trim(), basePrice, discountPercent } : item))
      setProductError('')
      setSavedId(id)
      window.setTimeout(() => setSavedId(''), 2200)
    } catch (saveError) {
      setProductError(saveError.message)
    }
  }

  async function removeProduct(product) {
    if (!window.confirm(`Delete "${product.name}" from the product list?`)) return
    try {
      const next = products.filter((item) => item.id !== product.id)
      await onSave(next)
      setDrafts(next)
      setProductError('')
    } catch (saveError) {
      setProductError(saveError.message)
    }
  }

  async function toggleActive(product) {
    try {
      const next = products.map((item) => item.id === product.id ? { ...item, active: !item.active } : item)
      await onSave(next)
      setDrafts(next)
      setProductError('')
    } catch (saveError) {
      setProductError(saveError.message)
    }
  }

  async function addCategory(event) {
    event.preventDefault()
    const name = newCategory.name.trim()
    if (!name) {
      setCategoryError('Enter a category name.')
      return
    }
    if (categories.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
      setCategoryError('A category with that name already exists.')
      return
    }
    const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`
    try {
      await onSaveCategories([...categories, { id, name, detail: newCategory.detail.trim() || `Shop ${name.toLowerCase()} at Rajesh Traders` }])
      setForm((current) => ({ ...current, category: name }))
      setNewCategory({ name: '', detail: '' })
      setCategoryError('')
    } catch (saveError) {
      setCategoryError(saveError.message)
    }
  }

  async function removeCategory(category) {
    const used = products.some((product) => product.category === category.name)
    if (used) {
      setCategoryError(`Move or remove products from "${category.name}" before deleting this category.`)
      return
    }
    if (categories.length < 2) {
      setCategoryError('Keep at least one product category.')
      return
    }
    if (!window.confirm(`Delete the "${category.name}" category?`)) return
    try {
      await onSaveCategories(categories.filter((item) => item.id !== category.id))
      setCategoryError('')
    } catch (saveError) {
      setCategoryError(saveError.message)
    }
  }

  function handleImage(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
      setProductError('Choose a JPG, PNG, WebP, or AVIF image.')
      event.target.value = ''
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      setProductError('Image file must be 4 MB or smaller.')
      event.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onerror = () => setProductError('The selected image could not be read.')
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setProductError('The selected image could not be read.')
        return
      }
      setForm((current) => ({ ...current, image: reader.result, imageName: file.name }))
      setProductError('')
    }
    reader.readAsDataURL(file)
  }

  async function addProduct(event) {
    event.preventDefault()
    const name = form.name.trim()
    const basePrice = Number(form.basePrice)
    const discountPercent = Number(form.discountPercent)
    if (!name || !form.description.trim() || !form.category || !Number.isFinite(basePrice) || basePrice <= 0 || !Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      setProductError('Complete the product name, description, category, valid price, and discount from 0 to 100%.')
      return
    }
    const product = {
      id: `product-${Date.now()}`,
      name,
      description: form.description.trim(),
      category: form.category,
      basePrice,
      discountPercent,
      tag: discountPercent > 0 ? `${discountPercent}% OFF` : 'IN STOCK',
      image: form.image,
      color: 'bg-amber-50',
      active: true,
    }
    try {
      await onSave([...products, product])
      setDrafts((items) => [...items, product])
      setForm({ name: '', description: '', category: categories[0]?.name || '', basePrice: '', discountPercent: '0', image: '', imageName: '' })
      setProductError('')
      setShowNewProduct(false)
    } catch (saveError) {
      setProductError(saveError.message)
    }
  }

  const filteredProducts = drafts.filter((product) => `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(query.toLowerCase()))

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold text-amber-700">Catalog & pricing</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{canEdit ? 'Products & categories' : 'Products'}</h1><p className="mt-1 text-sm text-slate-500">Manage your public catalog, prices, offers, categories, and product photos.</p></div>{canEdit && <button onClick={() => setShowNewProduct(!showNewProduct)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#101820] px-4 text-xs font-bold text-white transition hover:bg-amber-500 hover:text-slate-950">{showNewProduct ? <X size={15} /> : <Plus size={15} />}{showNewProduct ? 'Close form' : 'Add product'}</button>}</div>
    {!canEdit && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">Branch access is read-only. Ask the main account to change products, categories or prices.</div>}
    {showNewProduct && canEdit && <form onSubmit={addProduct} className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-800"><Package size={17} /></span><div><h2 className="text-sm font-bold text-slate-900">New storefront product</h2><p className="mt-1 text-[10px] text-slate-500">Products are visible to guests as soon as they are saved.</p></div></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Product name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="Product name" />
        <Field label="Description / size" value={form.description} onChange={(value) => setForm({ ...form, description: value })} placeholder="Grade, size, unit, or brand" />
        <label className="block text-xs font-semibold text-slate-700">Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal">{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></label>
        <Field label="Regular price (₹)" type="number" value={form.basePrice} onChange={(value) => setForm({ ...form, basePrice: value })} placeholder="0" />
        <Field label="Discount (%)" type="number" value={form.discountPercent} onChange={(value) => setForm({ ...form, discountPercent: value })} placeholder="0" />
        <label className="block text-xs font-semibold text-slate-700">Product photo <span className="font-normal text-slate-400">(up to 4 MB)</span><span className="mt-1.5 flex h-10 items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 text-xs font-medium text-slate-500"><ImagePlus size={15} className="text-amber-700" /><span className="flex-1 truncate">{form.imageName || 'Choose JPG, PNG, or WebP'}</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={handleImage} className="sr-only" /><span className="cursor-pointer text-amber-700">Browse</span></span></label>
      </div>
      {form.image && <div className="mt-3 flex items-center gap-3"><img src={form.image} alt="Product preview" className="h-14 w-14 rounded-lg border border-slate-200 object-cover" /><button type="button" onClick={() => setForm({ ...form, image: '', imageName: '' })} className="text-[10px] font-semibold text-rose-700">Remove photo</button></div>}
      {productError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{productError}</p>}
      <button type="submit" className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-amber-500 px-4 text-xs font-bold text-slate-950 hover:bg-amber-400"><Plus size={15} /> Save product to store</button>
    </form>}
    {canEdit && <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-900">Store categories</h2><p className="mt-1 text-[10px] text-slate-500">Categories are shown in the public storefront and on product cards.</p></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800">{categories.length} categories</span></div>
      <div className="mt-4 flex flex-wrap gap-2">{categories.map((category) => <div key={category.id} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><span className="text-xs font-semibold text-slate-700">{category.name}</span><button onClick={() => removeCategory(category)} aria-label={`Delete ${category.name} category`} title={products.some((product) => product.category === category.name) ? 'Move products to another category first' : 'Delete category'} className="rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={13} /></button></div>)}</div>
      <form onSubmit={addCategory} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]"><Field label="New category name" value={newCategory.name} onChange={(value) => setNewCategory({ ...newCategory, name: value })} placeholder="Bricks & blocks" /><Field label="Short description" value={newCategory.detail} onChange={(value) => setNewCategory({ ...newCategory, detail: value })} placeholder="Materials for every project" /><button type="submit" className="inline-flex h-10 items-center justify-center gap-1 self-end rounded-lg border border-slate-300 px-3 text-[10px] font-bold text-slate-700 hover:border-amber-400 hover:text-amber-800"><Plus size={13} /> Add category</button></form>
      {categoryError && <p role="alert" className="mt-3 text-[10px] leading-4 text-rose-700">{categoryError}</p>}
    </section>}
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><h2 className="text-sm font-bold text-slate-900">Product list</h2><p className="mt-1 text-[10px] text-slate-500">{products.length} products · changes apply to the guest store</p></div><label className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3"><Search size={14} className="text-slate-400" /><input aria-label="Search admin products" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a product" className="w-32 text-xs outline-none sm:w-48" /></label></div>
      {productError && !showNewProduct && <p role="alert" className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-xs text-rose-700">{productError}</p>}
      {filteredProducts.length === 0 ? <p className="px-5 py-10 text-center text-xs text-slate-500">No products match that search.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[940px] text-left"><thead><tr className="bg-slate-50 text-[9px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-5 py-3">Product</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Regular price (₹)</th><th className="px-3 py-3">Discount (%)</th><th className="px-3 py-3">Guest price</th><th className="px-5 py-3">Actions</th></tr></thead><tbody>{filteredProducts.map((product) => <tr key={product.id} className="border-t border-slate-100"><td className="px-5 py-3"><div className="flex items-center gap-3">{product.image ? <img src={product.image} alt="" className="h-10 w-10 rounded-lg border border-slate-100 bg-slate-50 object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-400"><Package size={17} /></span>}<span><span className="block text-xs font-semibold text-slate-800">{product.name}</span><span className="mt-1 block text-[9px] text-slate-400">{product.description}</span></span></div></td><td className="px-3 py-3">{canEdit ? <select aria-label={`${product.name} category`} value={product.category} onChange={(event) => updateDraft(product.id, 'category', event.target.value)} className="max-w-36 rounded-md border border-slate-200 bg-white px-2 py-2 text-[10px]">{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select> : <span className="text-[10px] text-slate-500">{product.category}</span>}</td><td className="px-3 py-3"><input disabled={!canEdit} aria-label={`${product.name} regular price`} type="number" min="1" value={product.basePrice} onChange={(event) => updateDraft(product.id, 'basePrice', event.target.value)} className="h-9 w-24 rounded-md border border-slate-200 px-2 text-xs disabled:bg-slate-50" /></td><td className="px-3 py-3"><input disabled={!canEdit} aria-label={`${product.name} discount`} type="number" min="0" max="100" value={product.discountPercent} onChange={(event) => updateDraft(product.id, 'discountPercent', event.target.value)} className="h-9 w-16 rounded-md border border-slate-200 px-2 text-xs disabled:bg-slate-50" /></td><td className="px-3 py-3 text-xs font-bold text-emerald-700">{formatRupees(sellingPrice(product))}</td><td className="px-5 py-3"><div className="flex items-center gap-2">{canEdit && <><button onClick={() => toggleActive(product)} className={`rounded-md px-2.5 py-1.5 text-[9px] font-semibold ${product.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{product.active ? 'Listed' : 'Hidden'}</button><button onClick={() => saveProduct(product.id)} aria-label={`Save ${product.name}`} className="inline-flex items-center gap-1 rounded-md bg-[#101820] px-2.5 py-1.5 text-[9px] font-semibold text-white hover:bg-amber-500 hover:text-slate-950">{savedId === product.id ? <Check size={12} /> : <Save size={12} />}{savedId === product.id ? 'Saved' : 'Save'}</button><button onClick={() => removeProduct(product)} aria-label={`Delete ${product.name}`} className="rounded-md border border-slate-200 p-1.5 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={14} /></button></>}</div></td></tr>)}</tbody></table></div>}
      <div className="border-t border-slate-100 px-5 py-3 text-[10px] leading-4 text-slate-400">Guest price is calculated from the regular price minus the configured discount. Changes are saved to Supabase.</div>
    </section>
  </div>
}

function RequestManagement({ session, requests, saveRequests, bills, saveBills, branches, clearRequests, businessName }) {
  const scopedRequests = session.role === 'owner' ? requests : requests.filter((request) => request.branchId === session.branchId)
  const [filter, setFilter] = useState('All')
  const [view, setView] = useState('Requests')
  const [error, setError] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [selectedBill, setSelectedBill] = useState(null)
  const [billDraft, setBillDraft] = useState(null)
  const [clearingHistory, setClearingHistory] = useState(false)
  const filtered = scopedRequests.filter((request) => filter === 'All' || request.type === filter)
  const scopedBills = session.role === 'owner' ? bills : bills.filter((bill) => bill.branchId === session.branchId)
  const confirmedOrders = scopedRequests.filter((request) => request.type === 'Order' && ['Confirmed', 'Completed'].includes(request.status))
  const unbilledRequests = scopedRequests.filter((request) => !bills.some((bill) => bill.requestId === request.id))

  async function updateRequest(id, key, value) {
    try {
      await saveRequests(requests.map((request) => request.id === id ? { ...request, [key]: value } : request))
      setError('')
      return true
    } catch (saveError) {
      setError(saveError.message)
      return false
    }
  }

  async function createBill(request) {
    const invoice = {
      id: `INV-${new Date().getFullYear()}-${Date.now()}`,
      requestId: request.id,
      branchId: request.branchId,
      customer: request.customer,
      items: request.items,
      total: request.total,
      createdAt: new Date().toISOString(),
      status: 'Unpaid',
    }
    try {
      await saveBills([invoice, ...bills])
      setError('')
      return invoice
    } catch (saveError) {
      setError(saveError.message)
      return null
    }
  }

  async function sendConfirmedBill(request) {
    const whatsappWindow = window.open('about:blank', '_blank')
    if (whatsappWindow) whatsappWindow.opener = null
    try {
      const invoice = bills.find((bill) => bill.requestId === request.id) || await createBill(request)
      if (!invoice) {
        whatsappWindow?.close()
        return
      }
      const branchName = branches.find((branch) => branch.id === invoice.branchId)?.name || session.branchName
      await downloadBillPdf(invoice, businessName, branchName)
      let phone = request.customer.phone.replace(/\D/g, '')
      if (phone.length === 10) phone = `91${phone}`
      else if (phone.length === 11 && phone.startsWith('0')) phone = `91${phone.slice(1)}`
      const message = `Hello ${request.customer.name}, your ${businessName || 'Rajesh Traders'} bill ${invoice.id} is ready. I have downloaded the PDF. Please attach ${invoice.id}.pdf in this chat before sending.`
      const whatsAppUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      if (whatsappWindow) {
        whatsappWindow.location.href = whatsAppUrl
        setError('')
      } else {
        setError(`The PDF was downloaded. Allow pop-ups to open WhatsApp for ${request.customer.phone}.`)
      }
    } catch (sendError) {
      whatsappWindow?.close()
      setError(`Unable to prepare the bill: ${sendError.message}`)
    }
  }

  async function clearHistory() {
    if (unbilledRequests.length === 0 || clearingHistory) return
    const confirmed = window.confirm(`Permanently delete ${unbilledRequests.length} unbilled request${unbilledRequests.length === 1 ? '' : 's'} from ${session.role === 'owner' ? 'all branches' : session.branchName}? Requests linked to bills will be kept. This cannot be undone.`)
    if (!confirmed) return
    setClearingHistory(true)
    try {
      await clearRequests(unbilledRequests.map((request) => request.id))
      setError('')
    } catch (clearError) {
      setError(clearError.message)
    } finally {
      setClearingHistory(false)
    }
  }

  async function updateBillStatus(id, status) {
    try {
      await saveBills(bills.map((bill) => bill.id === id ? { ...bill, status } : bill))
      setError('')
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold text-blue-700">{session.role === 'owner' ? 'All locations' : session.branchName}</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Bills & enquiries</h1><p className="mt-1 text-sm text-slate-500">Follow up on customer requests and prepare invoices.</p></div><div className="flex rounded-lg border border-slate-200 bg-white p-1">{['Requests', 'Bills'].map((value) => <button key={value} onClick={() => setView(value)} className={`rounded-md px-3 py-2 text-[10px] font-semibold ${view === value ? 'bg-blue-700 text-white' : 'text-slate-500 hover:text-slate-900'}`}>{value}{value === 'Bills' ? ` (${scopedBills.length})` : ''}</button>)}</div></div>
    {error && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>}
    {view === 'Requests' && filtered.length > 0 && <p className="text-[10px] text-slate-500">Select a request ID to review the customer details and confirm it.</p>}
    {view === 'Bills' && scopedBills.length > 0 && <p className="text-[10px] text-slate-500">Select an invoice ID to edit its customer details, line items, or total.</p>}
    <section onClick={(event) => {
      const clickedId = event.target.closest('p.text-xs.font-bold.text-blue-700')
      if (!clickedId) return
      const id = clickedId.textContent.trim()
      if (view === 'Requests') setSelectedRequest(filtered.find((request) => request.id === id) || null)
      if (view === 'Bills') {
        const bill = scopedBills.find((item) => item.id === id)
        if (bill) {
          setSelectedBill(bill)
          setBillDraft({ ...bill, customer: { ...bill.customer }, items: bill.items.map((item) => ({ ...item })) })
        }
      }
    }} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {view === 'Requests' ? <>
        <div className="flex justify-end border-b border-slate-100 px-4 py-2"><div className="flex rounded-lg bg-slate-50 p-1">{['All', 'Order', 'Enquiry'].map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded-md px-3 py-1.5 text-[9px] font-semibold ${filter === value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>{value === 'All' ? 'All requests' : `${value}s`}</button>)}</div></div>
        {filtered.length === 0 ? <EmptyState icon={ClipboardList} title={filter === 'All' ? 'No website requests yet' : `No ${filter.toLowerCase()}s yet`} copy="Customer orders and enquiries appear here with their contact and delivery details." /> :
          <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left"><thead><tr className="bg-slate-50 text-[9px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-5 py-3">Request</th><th className="px-3 py-3">Customer & contact</th><th className="px-3 py-3">Items</th><th className="px-3 py-3">Est. value</th><th className="px-3 py-3">Branch</th><th className="px-3 py-3">Follow-up</th><th className="px-5 py-3">Invoice</th></tr></thead><tbody>{filtered.map((request) => {
            const alreadyBilled = bills.some((bill) => bill.requestId === request.id)
            return <tr key={request.id} className="border-t border-slate-100 align-top"><td className="whitespace-nowrap px-5 py-4"><p className="text-xs font-bold text-blue-700">{request.id}</p><p className="mt-1 text-[10px] text-slate-500">{request.type} · {formatDate(request.createdAt)}</p><StatusPill status={request.status} /></td><td className="px-3 py-4"><p className="text-xs font-semibold text-slate-800">{request.customer.name}</p><a href={`tel:${request.customer.phone}`} className="mt-1 block text-[10px] text-blue-700">{request.customer.phone}</a><p className="mt-1 max-w-[180px] text-[10px] text-slate-500">{request.customer.location}</p></td><td className="px-3 py-4"><div className="space-y-1">{request.items.map((item) => <p key={item.productId} className="text-[10px] text-slate-600">{item.name} <span className="text-slate-400">× {item.quantity}</span></p>)}</div></td><td className="whitespace-nowrap px-3 py-4 text-xs font-bold text-slate-800">{formatRupees(request.total)}</td><td className="px-3 py-4">{session.role === 'owner' ? <select aria-label={`Assign ${request.id} to branch`} value={request.branchId} onChange={(event) => updateRequest(request.id, 'branchId', event.target.value)} className="max-w-36 rounded-md border border-slate-200 bg-white px-2 py-2 text-[10px]">{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select> : <p className="text-[10px] font-medium text-slate-600">{session.branchName}</p>}</td><td className="px-3 py-4"><select aria-label={`Update status for ${request.id}`} value={request.status} onChange={(event) => updateRequest(request.id, 'status', event.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-2 text-[10px]"><option>New</option><option>Contacted</option><option>Confirmed</option><option>Completed</option><option>Cancelled</option></select></td><td className="px-5 py-4">{request.type === 'Order' && ['Confirmed', 'Completed'].includes(request.status) ? alreadyBilled ? <span className="text-[9px] font-semibold text-emerald-700">Created</span> : <button onClick={() => createBill(request)} className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-blue-700 px-2.5 py-2 text-[9px] font-semibold text-white hover:bg-blue-800"><FileText size={12} /> Create bill</button> : <span className="text-[9px] text-slate-400">Confirm order first</span>}</td></tr>
          })}</tbody></table></div>}
      </> : scopedBills.length === 0 ? <EmptyState icon={FileText} title="No bills created yet" copy="Confirm a customer order, then select Create bill to make its invoice." /> :
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead><tr className="bg-slate-50 text-[9px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-5 py-3">Invoice</th><th className="px-3 py-3">Customer & delivery</th><th className="px-3 py-3">Items</th><th className="px-3 py-3">Branch</th><th className="px-3 py-3">Issued</th><th className="px-3 py-3">Total</th><th className="px-5 py-3">Payment status</th></tr></thead><tbody>{scopedBills.map((bill) => <tr key={bill.id} className="border-t border-slate-100 align-top"><td className="px-5 py-4"><p className="text-xs font-bold text-blue-700">{bill.id}</p><p className="mt-1 text-[9px] text-slate-400">From {bill.requestId}</p></td><td className="px-3 py-4"><p className="text-xs font-semibold text-slate-800">{bill.customer.name}</p><p className="mt-1 text-[10px] text-slate-500">{bill.customer.phone}</p><p className="mt-1 max-w-[170px] text-[9px] text-slate-400">{bill.customer.location}</p></td><td className="px-3 py-4"><div className="space-y-1">{bill.items.map((item) => <p key={item.productId} className="text-[10px] text-slate-600">{item.name} × {item.quantity}</p>)}</div></td><td className="px-3 py-4 text-xs text-slate-600">{branches.find((branch) => branch.id === bill.branchId)?.name || 'Unassigned'}</td><td className="px-3 py-4 text-[10px] text-slate-500">{formatDate(bill.createdAt)}</td><td className="px-3 py-4 text-xs font-bold text-slate-800">{formatRupees(bill.total)}</td><td className="px-5 py-4"><select aria-label={`Payment status for ${bill.id}`} value={bill.status} onChange={(event) => updateBillStatus(bill.id, event.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-2 text-[10px]"><option>Unpaid</option><option>Paid</option><option>Void</option></select></td></tr>)}</tbody></table></div>}
    </section>
    {view === 'Requests' && <>
      {confirmedOrders.length > 0 && <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-bold text-slate-900">Confirmed orders</h2><p className="mt-1 text-[10px] text-slate-500">Generate a PDF invoice and open a WhatsApp chat to the customer.</p></div><div className="divide-y divide-slate-100">{confirmedOrders.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"><div><p className="text-xs font-semibold text-slate-800">{request.customer.name} <span className="font-normal text-slate-500">· {request.id}</span></p><p className="mt-1 text-[10px] text-slate-500">{request.customer.phone} · {request.customer.location} · {request.items.length} product{request.items.length === 1 ? '' : 's'} · {formatRupees(request.total)}</p></div><button type="button" onClick={() => sendConfirmedBill(request)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white hover:bg-emerald-800"><FileText size={14} /> Send bill</button></div>)}</div></section>}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-white p-4"><div><h2 className="text-xs font-bold text-slate-900">Request history</h2><p className="mt-1 text-[10px] leading-4 text-slate-500">{unbilledRequests.length} unbilled request{unbilledRequests.length === 1 ? '' : 's'} can be removed. Requests linked to bills are always kept.</p></div><button type="button" disabled={unbilledRequests.length === 0 || clearingHistory} onClick={clearHistory} className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-300 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={14} />{clearingHistory ? 'Clearing…' : 'Clear unbilled history'}</button></section>
    </>}
    {selectedRequest && view === 'Requests' && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedRequest(null) }}>
      <section role="dialog" aria-modal="true" aria-labelledby="request-details-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-white p-5 shadow-2xl sm:rounded-xl sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase text-amber-700">{selectedRequest.type} · {selectedRequest.id}</p><h2 id="request-details-title" className="mt-1 text-xl font-bold text-slate-900">{selectedRequest.customer.name}</h2></div><button type="button" aria-label="Close request details" onClick={() => setSelectedRequest(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>
        <div className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 text-xs sm:grid-cols-2"><div><p className="text-[10px] font-semibold text-slate-400">Phone</p><a href={`tel:${selectedRequest.customer.phone}`} className="mt-1 inline-block font-semibold text-blue-700">{selectedRequest.customer.phone}</a></div><div><p className="text-[10px] font-semibold text-slate-400">Place / delivery location</p><p className="mt-1 font-semibold text-slate-800">{selectedRequest.customer.location}</p></div><div><p className="text-[10px] font-semibold text-slate-400">Branch</p><p className="mt-1 font-semibold text-slate-800">{branches.find((branch) => branch.id === selectedRequest.branchId)?.name || 'Unassigned'}</p></div><div><p className="text-[10px] font-semibold text-slate-400">Current status</p><div className="mt-1"><StatusPill status={selectedRequest.status} /></div></div></div>
        <h3 className="mt-5 text-xs font-bold text-slate-800">Requested choices</h3>
        <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">{selectedRequest.items.map((item, index) => <div key={`${item.productId}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs"><span className="font-semibold text-slate-800">{item.name || item.productId || 'Product'} <span className="font-normal text-slate-500">× {item.quantity}</span></span><span className="text-slate-600">{formatRupees(Number(item.unitPrice || 0) * Number(item.quantity || 0))}</span></div>)}</div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-bold"><span>Estimated value</span><span>{formatRupees(selectedRequest.total)}</span></div>
        <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setSelectedRequest(null)} className="h-10 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600">Close</button>{selectedRequest.status !== 'Confirmed' && selectedRequest.status !== 'Completed' && <button type="button" onClick={async () => { if (await updateRequest(selectedRequest.id, 'status', 'Confirmed')) setSelectedRequest({ ...selectedRequest, status: 'Confirmed' }) }} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-xs font-bold text-white hover:bg-emerald-800"><Check size={15} /> Confirm request</button>}</div>
      </section>
    </div>}
    {selectedBill && billDraft && view === 'Bills' && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedBill(null) }}>
      <form onSubmit={async (event) => {
        event.preventDefault()
        const items = billDraft.items.map((item) => ({ ...item, name: item.name.trim(), quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) }))
        if (items.some((item) => !item.name || !Number.isFinite(item.quantity) || item.quantity < 1 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) {
          setError('Enter an item name, quantity of at least one, and a valid unit price for every line.')
          return
        }
        const updatedBill = { ...billDraft, items, total: items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) }
        try {
          await saveBills(bills.map((bill) => bill.id === updatedBill.id ? updatedBill : bill))
          setError('')
          setSelectedBill(null)
        } catch (saveError) {
          setError(saveError.message)
        }
      }} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-xl bg-white p-5 shadow-2xl sm:rounded-xl sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase text-blue-700">Edit invoice</p><h2 className="mt-1 text-xl font-bold text-slate-900">{selectedBill.id}</h2></div><button type="button" aria-label="Close bill editor" onClick={() => setSelectedBill(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Customer name" value={billDraft.customer.name} onChange={(value) => setBillDraft({ ...billDraft, customer: { ...billDraft.customer, name: value } })} placeholder="Customer name" /><Field label="Phone" value={billDraft.customer.phone} onChange={(value) => setBillDraft({ ...billDraft, customer: { ...billDraft.customer, phone: value } })} placeholder="Phone number" /><div className="sm:col-span-2"><Field label="Delivery location" value={billDraft.customer.location} onChange={(value) => setBillDraft({ ...billDraft, customer: { ...billDraft.customer, location: value } })} placeholder="Delivery location" /></div></div>
        <div className="mt-5 flex items-center justify-between"><h3 className="text-xs font-bold text-slate-800">Invoice items</h3><button type="button" onClick={() => setBillDraft({ ...billDraft, items: [...billDraft.items, { productId: `custom-${Date.now()}`, name: '', quantity: 1, unitPrice: 0 }] })} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-[10px] font-semibold text-slate-700"><Plus size={13} /> Add item</button></div>
        <div className="mt-2 space-y-2">{billDraft.items.map((item, index) => <div key={`${item.productId}-${index}`} className="grid grid-cols-[minmax(0,1fr)_70px_90px_32px] items-end gap-2"><Field label={index === 0 ? 'Item' : ''} value={item.name} onChange={(value) => setBillDraft({ ...billDraft, items: billDraft.items.map((row, rowIndex) => rowIndex === index ? { ...row, name: value } : row) })} placeholder="Item name" /><Field label={index === 0 ? 'Qty' : ''} type="number" value={item.quantity} onChange={(value) => setBillDraft({ ...billDraft, items: billDraft.items.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: value } : row) })} placeholder="1" /><Field label={index === 0 ? 'Unit price' : ''} type="number" value={item.unitPrice ?? 0} onChange={(value) => setBillDraft({ ...billDraft, items: billDraft.items.map((row, rowIndex) => rowIndex === index ? { ...row, unitPrice: value } : row) })} placeholder="0" /><button type="button" disabled={billDraft.items.length === 1} aria-label={`Remove ${item.name || 'item'}`} onClick={() => setBillDraft({ ...billDraft, items: billDraft.items.filter((_, rowIndex) => rowIndex !== index) })} className="mb-0.5 flex h-9 w-8 items-center justify-center rounded-md text-rose-700 disabled:opacity-30"><X size={15} /></button></div>)}</div>
        <p className="mt-4 border-t border-slate-100 pt-3 text-right text-sm font-bold text-slate-900">Total: {formatRupees(billDraft.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0))}</p>
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setSelectedBill(null)} className="h-10 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600">Cancel</button><button type="submit" className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-xs font-bold text-white hover:bg-blue-800"><Save size={14} /> Save invoice</button></div>
      </form>
    </div>}
  </div>
}

function BranchManagement({ branches, saveBranches, onSelectBranch, requests = [], bills = [] }) {
  const [form, setForm] = useState({ name: '', city: '', manager: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [branchDraft, setBranchDraft] = useState(null)

  async function addBranch(event) {
    event.preventDefault()
    if (!form.name.trim() || !form.city.trim()) {
      setError('Enter a branch name and city.')
      return
    }
    const id = `${form.city}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const branch = { id, name: form.name.trim(), city: form.city.trim(), manager: form.manager.trim(), isMain: false }
    try {
      await saveBranches([...branches, branch])
      setForm({ name: '', city: '', manager: '' })
      setError('')
      setSuccess('Branch created. Create a staff user in Supabase Auth and assign this branch in user_profiles to enable branch login.')
      window.setTimeout(() => setSuccess(''), 3500)
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  async function saveBranchEdit(event) {
    event.preventDefault()
    if (!branchDraft.name.trim() || !branchDraft.city.trim()) {
      setError('Enter a branch name and city.')
      return
    }
    try {
      await saveBranches(branches.map((branch) => branch.id === branchDraft.id
        ? { ...branch, name: branchDraft.name.trim(), city: branchDraft.city.trim(), manager: branchDraft.manager.trim() }
        : branch))
      setBranchDraft(null)
      setError('')
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  async function removeBranch(branch) {
    if (branch.isMain) {
      setError('The main branch cannot be deleted.')
      return
    }
    if (requests.some((request) => request.branchId === branch.id) || bills.some((bill) => bill.branchId === branch.id)) {
      setError('This branch has customer requests or bills. Keep it so its business history remains available.')
      return
    }
    if (!window.confirm(`Delete the ${branch.name} branch? Staff profiles assigned to it must be moved first.`)) return
    try {
      await saveBranches(branches.filter((item) => item.id !== branch.id))
      setError('')
    } catch {
      setError('This branch is still linked to a staff profile or business record. Reassign or remove those references before deleting it.')
    }
  }

  return <div className="space-y-5">
    <div><p className="text-xs font-semibold text-blue-700">Locations & access</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Branches</h1><p className="mt-1 text-sm text-slate-500">Branch staff accounts are assigned separately and restricted to their own branch.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{branches.map((branch) => <button type="button" key={branch.id} onClick={() => onSelectBranch(branch.id)} className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"><span className="flex items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><Building2 size={17} /></span><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${branch.isMain ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>{branch.isMain ? 'Main account' : 'Branch'}</span></span><h2 className="mt-4 text-sm font-bold text-slate-900">{branch.name}</h2><p className="mt-1 text-xs text-slate-500">{branch.city}</p><span className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-[10px] font-semibold text-slate-700">{branch.manager || 'No manager listed'}</span><ChevronRight size={16} className="shrink-0 text-slate-400" /></span><span className="mt-3 block text-[10px] font-semibold text-amber-700">View performance and activity →</span></button>)}</div>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-bold text-slate-900">Edit or remove branches</h2><p className="mt-1 text-[10px] text-slate-500">Branches with customer history or staff assignments cannot be deleted.</p></div><div className="divide-y divide-slate-100">{branches.map((branch) => <div key={branch.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"><div><p className="text-xs font-semibold text-slate-800">{branch.name}</p><p className="mt-1 text-[10px] text-slate-500">{branch.city}{branch.manager ? ` · ${branch.manager}` : ''}</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => { setBranchDraft({ ...branch }); setError('') }} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-[10px] font-semibold text-slate-700 hover:border-amber-400"><Pencil size={13} /> Edit</button><button type="button" disabled={branch.isMain} onClick={() => removeBranch(branch)} title={branch.isMain ? 'The main branch cannot be deleted' : 'Delete branch'} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-[10px] font-semibold text-rose-700 hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={13} /> Delete</button></div></div>)}</div></section>
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-4 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Plus size={18} /></span><div><h2 className="text-sm font-bold text-slate-900">Add a branch</h2><p className="mt-1 text-[10px] text-slate-500">Branch login credentials are managed securely in Supabase Authentication.</p></div></div>
      <form onSubmit={addBranch} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Field label="Branch name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="Branch name" /><Field label="City" value={form.city} onChange={(value) => setForm({ ...form, city: value })} placeholder="City" /><Field label="Manager name (optional)" value={form.manager} onChange={(value) => setForm({ ...form, manager: value })} placeholder="Manager name" /><button type="submit" className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-lg bg-blue-700 px-4 text-xs font-bold text-white hover:bg-blue-800"><Plus size={15} /> Add branch</button></form>
      {error && <p role="alert" className="mt-3 text-xs text-rose-700">{error}</p>}{success && <p role="status" className="mt-3 text-xs font-medium text-emerald-700">{success}</p>}
    </section>
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-[10px] leading-5 text-blue-900">After creating a branch, create its staff user in Supabase Authentication and assign the user's branch ID in <code>user_profiles</code>. RLS enforces branch-specific access.</div>
    {branchDraft && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setBranchDraft(null) }}><form onSubmit={saveBranchEdit} className="w-full max-w-md space-y-3 rounded-xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase text-amber-700">Branch settings</p><h2 className="mt-1 text-lg font-bold text-slate-900">Edit branch</h2></div><button type="button" aria-label="Close branch editor" onClick={() => setBranchDraft(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={17} /></button></div><Field label="Branch name" value={branchDraft.name} onChange={(value) => setBranchDraft({ ...branchDraft, name: value })} placeholder="Branch name" /><Field label="City" value={branchDraft.city} onChange={(value) => setBranchDraft({ ...branchDraft, city: value })} placeholder="City" /><Field label="Manager" value={branchDraft.manager} onChange={(value) => setBranchDraft({ ...branchDraft, manager: value })} placeholder="Manager name" />{error && <p role="alert" className="text-xs text-rose-700">{error}</p>}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setBranchDraft(null)} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600">Cancel</button><button type="submit" className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-700 px-3 text-xs font-bold text-white"><Save size={13} /> Save branch</button></div></form></div>}
  </div>
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return <label className="block text-xs font-semibold text-slate-700">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-blue-500" /></label>
}

function SettingsPage({ settings, saveSettings, error, setError }) {
  const [draft, setDraft] = useState({ ...settings, heroSlides: settings.heroSlides || DEFAULT_HERO_SLIDES })
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    setDraft({ ...settings, heroSlides: settings.heroSlides || DEFAULT_HERO_SLIDES })
  }, [settings])

  function updateHeroSlide(index, field, value) {
    setDraft((current) => ({
      ...current,
      heroSlides: current.heroSlides.map((slide, slideIndex) => (
        slideIndex === index ? { ...slide, [field]: value } : slide
      )),
    }))
  }

  async function submit(event) {
    event.preventDefault()
    if (!draft.businessName.trim() || !draft.phone.trim() || !draft.address.trim()) {
      setError('Business name, contact phone, and address are required.')
      return
    }
    if (draft.heroSlides.some((slide) => !slide.imageUrl.trim() || !slide.imageAlt.trim() || !slide.eyebrow.trim() || !slide.title.trim() || !slide.highlight.trim() || !slide.description.trim())) {
      setError('Complete every hero slide field before saving.')
      return
    }
    if (draft.heroSlides.some((slide) => !/^https?:\/\/\S+$/i.test(slide.imageUrl.trim()))) {
      setError('Hero image URLs must start with http:// or https://.')
      return
    }
    try {
      await saveSettings(draft)
      setError('')
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
    } catch (saveError) {
      setError(describeSupabaseError(saveError))
    }
  }
  return <div className="max-w-3xl space-y-5">
    <div><p className="text-xs font-semibold text-blue-700">Business profile</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Settings</h1><p className="mt-1 text-sm text-slate-500">Manage storefront information and the automatically rotating home-page hero.</p></div>
    <form onSubmit={submit} className="space-y-5">
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div><h2 className="text-sm font-bold text-slate-900">Business profile</h2><p className="mt-1 text-xs text-slate-500">Contact details shown on the public storefront.</p></div>
        <Field label="Business name" value={draft.businessName} onChange={(value) => setDraft({ ...draft, businessName: value })} placeholder="Rajesh Traders" />
        <Field label="Public contact number" type="tel" value={draft.phone} onChange={(value) => setDraft({ ...draft, phone: value })} placeholder={BUSINESS_PHONE} />
        <Field label="Store address" value={draft.address} onChange={(value) => setDraft({ ...draft, address: value })} placeholder="Street, city, state" />
        <Field label="Delivery information" value={draft.deliveryNote} onChange={(value) => setDraft({ ...draft, deliveryNote: value })} placeholder="Delivery details for customers" />
      </section>
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div><h2 className="text-sm font-bold text-slate-900">Homepage hero slides</h2><p className="mt-1 text-xs leading-5 text-slate-500">Slides rotate automatically every 6 seconds. Recommended background image: 2000 × 900 px (20:9), JPEG or WebP, under 4 MB. Use a direct, publicly accessible image URL.</p></div>
        {draft.heroSlides.map((slide, index) => <fieldset key={index} className="space-y-3 rounded-lg border border-slate-200 p-4">
          <legend className="px-1 text-xs font-bold text-slate-800">Slide {index + 1}</legend>
          <Field label="Background image URL" type="url" value={slide.imageUrl} onChange={(value) => updateHeroSlide(index, 'imageUrl', value)} placeholder="https://example.com/hero.jpg" />
          {slide.imageUrl && <img src={slide.imageUrl} alt={`Preview for hero slide ${index + 1}`} className="h-32 w-full rounded-lg bg-slate-100 object-cover" />}
          <Field label="Image description (accessibility)" value={slide.imageAlt} onChange={(value) => updateHeroSlide(index, 'imageAlt', value)} placeholder="Describe the image" />
          <Field label="Small heading" value={slide.eyebrow} onChange={(value) => updateHeroSlide(index, 'eyebrow', value)} placeholder="Your trusted building partner" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Main heading" value={slide.title} onChange={(value) => updateHeroSlide(index, 'title', value)} placeholder="Build with" />
            <Field label="Highlighted heading" value={slide.highlight} onChange={(value) => updateHeroSlide(index, 'highlight', value)} placeholder="confidence." />
          </div>
          <label className="block text-xs font-semibold text-slate-700">Description<textarea value={slide.description} onChange={(event) => updateHeroSlide(index, 'description', event.target.value)} rows={3} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-blue-500" /></label>
        </fieldset>)}
      </section>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">{error}</p>}
      <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-xs font-bold text-white hover:bg-blue-800"><Save size={14} />{saved ? 'Saved' : 'Save storefront settings'}</button>
    </form>
  </div>
}

export function AdminApp() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [section, setSection] = useState('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [requests, setRequests] = useState([])
  const [bills, setBills] = useState([])
  const [branches, setBranches] = useState([])
  const [settings, setSettings] = useState({ businessName: 'Rajesh Traders', phone: BUSINESS_PHONE, address: '', deliveryNote: '', heroSlides: DEFAULT_HERO_SLIDES })
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [error, setError] = useState('')
  const [soundsEnabled, setSoundsEnabled] = useState(true)
  const [newRequestNotice, setNewRequestNotice] = useState('')
  const requestIdsRef = useRef(new Set())
  const noticeTimerRef = useRef(null)
  const isOwner = session?.role === 'owner'

  useEffect(() => {
    let active = true
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured for this deployment.')
      setAuthLoading(false)
      return undefined
    }

    async function readCurrentProfile(user) {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('display_name, role, branch_id, branches(name)')
        .eq('user_id', user.id)
        .maybeSingle()
      if (profileError) throw profileError
      if (!profile) throw new Error('This account has no business role assigned in user_profiles.')
      return {
        userId: user.id,
        email: user.email,
        name: profile.display_name,
        role: profile.role,
        branchId: profile.branch_id,
        branchName: profile.branches?.name || 'Main account',
      }
    }

    supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (sessionError) throw sessionError
      if (data.session?.user) {
        const profile = await readCurrentProfile(data.session.user)
        if (active) setSession(profile)
      }
      if (active) setAuthLoading(false)
    }).catch((loadError) => {
      if (active) {
        setError(`Unable to restore your Supabase session: ${describeSupabaseError(loadError)}`)
        setAuthLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && active) {
        setSession(null)
        setSection('Dashboard')
      }
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session || !isSupabaseConfigured) return undefined
    let active = true
    setWorkspaceLoading(true)
    setError('')
    Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('customer_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('bills').select('*').order('created_at', { ascending: false }),
      supabase.from('branches').select('*').order('name'),
      supabase.from('store_settings').select('*').eq('id', 1).single(),
    ]).then(([productResult, categoryResult, requestResult, billResult, branchResult, settingsResult]) => {
      const firstError = productResult.error || categoryResult.error || requestResult.error
        || billResult.error || branchResult.error || settingsResult.error
      if (firstError) throw firstError
      if (!active) return
      setProducts(productResult.data.map(fromProduct))
      setCategories(categoryResult.data.map(fromCategory))
      const loadedRequests = requestResult.data.map(fromRequest)
      requestIdsRef.current = new Set(loadedRequests.map((request) => request.id))
      setRequests(loadedRequests)
      setBills(billResult.data.map(fromBill))
      setBranches(branchResult.data.map(fromBranch))
      setSettings(fromSettings(settingsResult.data))
    }).catch((loadError) => {
      if (active) setError(`Unable to load workspace data: ${describeSupabaseError(loadError)}`)
    }).finally(() => {
      if (active) setWorkspaceLoading(false)
    })
    return () => { active = false }
  }, [session])

  useEffect(() => {
    if (!session || workspaceLoading || !isSupabaseConfigured) return undefined
    let active = true
    const channel = supabase
      .channel(`customer-requests-${session.userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'customer_requests',
      }, (payload) => {
        if (!active || requestIdsRef.current.has(payload.new.id)) return
        const request = fromRequest(payload.new)
        requestIdsRef.current.add(request.id)
        setRequests((current) => [request, ...current])
        setNewRequestNotice(`New ${request.type.toLowerCase()} from ${request.customer.name}`)
        if (soundsEnabled) playUiSound('notification')
        if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
        noticeTimerRef.current = window.setTimeout(() => setNewRequestNotice(''), 6000)
      })
      .subscribe()

    return () => {
      active = false
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
      void supabase.removeChannel(channel)
    }
  }, [session, workspaceLoading, soundsEnabled])

  async function logout() {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      setError(`Unable to sign out: ${describeSupabaseError(signOutError)}`)
      return
    }
    setSession(null)
    setSection('Dashboard')
  }

  async function saveCollection(next, current, table, toRow, setState) {
    const { error: upsertError } = await supabase.from(table).upsert(next.map(toRow), { onConflict: 'id' })
    if (upsertError) throw upsertError
    const nextIds = new Set(next.map((item) => item.id))
    const removedIds = current.filter((item) => !nextIds.has(item.id)).map((item) => item.id)
    if (removedIds.length > 0) {
      const { error: deleteError } = await supabase.from(table).delete().in('id', removedIds)
      if (deleteError) throw deleteError
    }
    setState(next)
  }

  async function saveProducts(next) {
    const savedProducts = []
    for (const product of next) {
      if (!product.image?.startsWith('data:')) {
        savedProducts.push(product)
        continue
      }
      const response = await fetch(product.image)
      if (!response.ok) throw new Error('Unable to read the selected product photo.')
      const blob = await response.blob()
      const extension = blob.type.split('/')[1] || 'jpg'
      const path = `${product.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, blob, {
        contentType: blob.type,
        upsert: false,
      })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      savedProducts.push({ ...product, image: data.publicUrl })
    }
    await saveCollection(savedProducts, products, 'products', toProduct, setProducts)
  }

  async function saveCategories(next) {
    await saveCollection(next, categories, 'categories', toCategory, setCategories)
  }

  async function saveBranches(next) {
    await saveCollection(next, branches, 'branches', toBranch, setBranches)
  }

  async function saveRequests(next) {
    const previousById = new Map(requests.map((request) => [request.id, request]))
    const writes = next.map((request) => {
      const previous = previousById.get(request.id)
      if (previous && previous.status === request.status && previous.branchId === request.branchId) return null
      return previous
        ? supabase.from('customer_requests').update({ status: request.status, branch_id: request.branchId }).eq('id', request.id)
        : supabase.from('customer_requests').insert(toRequest(request))
    }).filter(Boolean)
    const results = await Promise.all(writes)
    const failedWrite = results.find((result) => result.error)
    if (failedWrite) throw failedWrite.error
    setRequests(next)
  }

  async function deleteRequests(ids) {
    if (!ids.length) return
    const { error: deleteError } = await supabase.from('customer_requests').delete().in('id', ids)
    if (deleteError) throw deleteError
    const removedIds = new Set(ids)
    ids.forEach((id) => requestIdsRef.current.delete(id))
    setRequests((current) => current.filter((request) => !removedIds.has(request.id)))
  }

  async function saveBills(next) {
    const previousById = new Map(bills.map((bill) => [bill.id, bill]))
    const writes = next.map((bill) => {
      const previous = previousById.get(bill.id)
      if (previous && JSON.stringify(previous) === JSON.stringify(bill)) return null
      return previous
        ? supabase.from('bills').update({
          customer_name: bill.customer.name,
          phone: bill.customer.phone,
          location: bill.customer.location,
          items: bill.items,
          total: Number(bill.total),
          status: bill.status,
        }).eq('id', bill.id)
        : supabase.from('bills').insert(toBill(bill))
    }).filter(Boolean)
    const results = await Promise.all(writes)
    const failedWrite = results.find((result) => result.error)
    if (failedWrite) throw failedWrite.error
    setBills(next)
  }

  async function saveSettings(next) {
    const { error: settingsError } = await supabase.from('store_settings').upsert(toSettings(next), { onConflict: 'id' })
    if (settingsError) throw settingsError
    setSettings(next)
  }

  async function handleSave(save, next) {
    try {
      await save(next)
      setError('')
      playUiSound('success')
    } catch (saveError) {
      setError(describeSupabaseError(saveError))
      throw saveError
    }
  }

  if (authLoading) return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Connecting to business portal…</main>
  if (!session) return <><LoginScreen onLogin={(nextSession) => { setSession(nextSession); setError('') }} />{error && <p role="alert" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-rose-50 px-4 py-3 text-xs text-rose-700 shadow-lg">{error}</p>}</>

  let content
  if (section === 'Products & pricing' || section === 'Products') content = <ProductManagement products={products} onSave={(next) => handleSave(saveProducts, next)} categories={categories} onSaveCategories={(next) => handleSave(saveCategories, next)} canEdit={isOwner} />
  else if (section === 'Bills & enquiries') content = <RequestManagement session={session} requests={requests} saveRequests={(next) => handleSave(saveRequests, next)} bills={bills} saveBills={(next) => handleSave(saveBills, next)} branches={branches} clearRequests={(ids) => handleSave(deleteRequests, ids)} businessName={settings.businessName} />
  else if (section === 'Branches' && isOwner && selectedBranchId) {
    const selectedBranch = branches.find((branch) => branch.id === selectedBranchId)
    content = selectedBranch
      ? <BranchDetails branch={selectedBranch} requests={requests} bills={bills} onBack={() => setSelectedBranchId('')} />
        : <BranchManagement branches={branches} saveBranches={(next) => handleSave(saveBranches, next)} onSelectBranch={setSelectedBranchId} requests={requests} bills={bills} />
  }
      else if (section === 'Branches' && isOwner) content = <BranchManagement branches={branches} saveBranches={(next) => handleSave(saveBranches, next)} onSelectBranch={setSelectedBranchId} requests={requests} bills={bills} />
  else if (section === 'Settings' && isOwner) content = <SettingsPage settings={settings} saveSettings={(next) => handleSave(saveSettings, next)} error={error} setError={setError} />
  else content = <Dashboard session={session} requests={requests} branches={branches} onBranchSelect={(branchId) => { setSelectedBranchId(branchId); setSection('Branches') }} />

  return <div onClickCapture={(event) => {
    if (soundsEnabled && event.target.closest('button:not(:disabled)')) playUiSound('tap')
  }} className="min-h-screen bg-[#f7f7f5] md:grid md:grid-cols-[258px_minmax(0,1fr)]">
    <AdminSidebar session={session} section={section} onSection={(next) => { setSection(next); setSelectedBranchId(''); setError('') }} onLogout={logout} open={sidebarOpen} onClose={() => setSidebarOpen(false)} phone={settings.phone || BUSINESS_PHONE} />
    <div className="min-h-screen min-w-0">
      <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-t-2 border-slate-200 border-t-amber-500 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex items-center gap-3"><button onClick={() => setSidebarOpen(true)} aria-label="Open navigation" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"><Menu size={20} /></button><div><p className="text-xs font-bold text-slate-800">Rajesh Traders <span className="font-normal text-slate-400">/ Business portal</span></p><p className="mt-0.5 text-[10px] text-slate-400">{isOwner ? 'Main account · All branches' : `Branch account · ${session.branchName}`}</p></div></div>
        <div className="flex items-center gap-2 sm:gap-4"><Link to="/" className="hidden text-[10px] font-semibold text-slate-500 hover:text-blue-700 sm:inline">View public store</Link><span className="hidden h-7 w-px bg-slate-200 sm:block" /><div className="hidden text-right sm:block"><p className="text-[10px] font-semibold text-slate-700">{session.name}</p><p className="text-[9px] text-slate-400">{isOwner ? 'Owner' : 'Branch staff'}</p></div><button type="button" aria-label={soundsEnabled ? 'Turn interface sounds off' : 'Turn interface sounds on'} aria-pressed={soundsEnabled} title={soundsEnabled ? 'Interface and new request sounds on' : 'Sounds off'} onClick={() => setSoundsEnabled((enabled) => !enabled)} className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-2.5 text-slate-600 hover:bg-slate-50">{soundsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}</button><button onClick={logout} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"><LogOut size={14} /><span className="hidden sm:inline">Sign out</span></button></div>
      </header>
      <main className="mx-auto max-w-[1450px] p-4 sm:p-6 lg:p-8">
        {workspaceLoading && <p role="status" className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-800">Loading live business data…</p>}
        {error && <p role="alert" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">{error}</p>}
        {newRequestNotice && <button type="button" role="status" onClick={() => { setSection('Bills & enquiries'); setNewRequestNotice('') }} className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-left text-xs font-semibold text-amber-900 shadow-sm">{newRequestNotice} — open requests</button>}
        {content}
      </main>
      <footer className="px-4 pb-5 text-center text-[10px] text-slate-400">Rajesh Traders · Internal business workspace</footer>
    </div>
  </div>
}
