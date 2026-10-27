import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  HardHat,
  LogIn,
  Menu,
  Package,
  PackageCheck,
  Phone,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
  X,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AdminApp } from './admin/AdminApp.jsx'
import { DEFAULT_HERO_SLIDES, fromBranch, fromCategory, fromProduct, fromSettings, formatRupees, sellingPrice } from './lib/storeData.js'
import { describeSupabaseError, isSupabaseConfigured, supabase } from './lib/supabase.js'
import { playUiSound } from './lib/uiSounds.js'

function categoryImage(categoryName) {
  const name = categoryName.toLowerCase()
  if (/bar|rod|steel/.test(name)) return '/categories/bars.png'
  if (/cement/.test(name)) return '/categories/cement.png'
  if (/paint/.test(name)) return '/categories/paints.png'
  if (/sheet/.test(name)) return '/categories/sheets.png'
  return ''
}

function categorySlug(categoryName) {
  return categoryName.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function SearchBox({ search, onSearch, products, categories, onSelectCategory, onSelectProduct, className = '' }) {
  const [focused, setFocused] = useState(false)
  const query = search.trim().toLowerCase()
  const productSuggestions = query
    ? products.filter((product) => product.active && `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(query)).slice(0, 6)
    : []
  const categorySuggestions = query
    ? categories.filter((category) => category.name.toLowerCase().includes(query))
    : []

  return <div className={`relative ${className}`} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) window.setTimeout(() => setFocused(false), 100)
  }}>
    <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-amber-400">
      <Search size={16} className="shrink-0 text-slate-400" />
      <input value={search} onFocus={() => setFocused(true)} onChange={(event) => onSearch(event.target.value)} placeholder="Search products..." aria-label="Search products" aria-expanded={focused && Boolean(query)} className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400" />
      {search && <button type="button" aria-label="Clear search" onClick={() => { onSearch(''); setFocused(false) }} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={14} /></button>}
    </label>
    {focused && query && <div role="listbox" aria-label="Search suggestions" className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
      {categorySuggestions.map((category) => <button key={category.id} type="button" role="option" onClick={() => { onSelectCategory(category.name); setFocused(false) }} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-amber-50"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-50">{categoryImage(category.name) ? <img src={categoryImage(category.name)} alt="" className="h-8 w-8 object-contain" /> : <Package size={17} className="text-slate-500" />}</span><span className="min-w-0"><span className="block truncate text-xs font-semibold text-slate-800">{category.name}</span><span className="block text-[10px] text-slate-500">Category</span></span><ArrowRight size={14} className="ml-auto shrink-0 text-slate-400" /></button>)}
      {productSuggestions.map((product) => <button key={product.id} type="button" role="option" onClick={() => { onSelectProduct(product); setFocused(false) }} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-amber-50"><span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100">{product.image ? <img src={product.image} alt="" className="h-full w-full object-cover" /> : <Package size={17} className="text-slate-500" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-800">{product.name}</span><span className="block truncate text-[10px] text-slate-500">{product.category} · {formatRupees(sellingPrice(product))}</span></span><ArrowRight size={14} className="shrink-0 text-slate-400" /></button>)}
      {categorySuggestions.length === 0 && productSuggestions.length === 0 && <p className="px-3 py-3 text-xs text-slate-500">No matching products or categories.</p>}
    </div>}
  </div>
}

function Header({ cartCount, search, onSearch, products, categories, onSelectCategory, onSelectProduct, onCart, settings }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const nav = [
    ['Home', '#home'],
    ['Shop', '#products'],
    ['Categories', '#categories'],
    ['About us', '#about'],
    ['Contact', '#contact'],
  ]
  const chooseCategory = (category) => { onSelectCategory(category); setMenuOpen(false) }
  const chooseProduct = (product) => { onSelectProduct(product); setMenuOpen(false) }

  return (
    <>
      <div className="bg-[#101820] px-4 py-2 text-center text-[11px] font-medium tracking-wide text-white sm:text-xs">
        {settings.deliveryNote || 'Quality materials. Fair prices. Delivered to your site.'} <span className="ml-1 font-bold text-amber-400">Call us: {settings.phone}</span>
      </div>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950"><HardHat size={23} strokeWidth={2.5} /></span>
            <span>
              <span className="block text-[17px] font-extrabold leading-5 tracking-tight text-slate-900">{settings.businessName}</span>
              <span className="mt-0.5 block text-[9px] font-semibold tracking-[0.2em] text-slate-500">BUILDING MATERIALS</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 lg:flex">
            {nav.map(([label, href], index) => <a key={label} href={location.pathname === '/' ? href : `/${href}`} className={`text-[13px] font-semibold transition hover:text-amber-600 ${index === 0 ? 'text-amber-600' : 'text-slate-600'}`}>{label}</a>)}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/admin" className="hidden items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-slate-600 transition hover:bg-amber-50 hover:text-amber-700 sm:inline-flex"><LogIn size={15} /> Business login</Link>
            <SearchBox search={search} onSearch={onSearch} products={products} categories={categories} onSelectCategory={chooseCategory} onSelectProduct={chooseProduct} className="hidden w-44 md:block lg:w-56" />
            <button onClick={onCart} aria-label="Shopping cart" className="relative flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-slate-700 transition hover:border-amber-400 hover:text-slate-950">
              <ShoppingCart size={18} />
              <span className="hidden text-xs font-semibold sm:block">Cart</span>
              <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-slate-950">{cartCount}</span>
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden">{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
          </div>
        </div>
        {menuOpen && <nav className="border-t border-slate-100 bg-white px-4 py-3 shadow-lg lg:hidden">
          <SearchBox search={search} onSearch={onSearch} products={products} categories={categories} onSelectCategory={chooseCategory} onSelectProduct={chooseProduct} className="mb-2 w-full md:hidden" />
          {nav.map(([label, href]) => <a key={label} href={location.pathname === '/' ? href : `/${href}`} onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700">{label}</a>)}
          <Link to="/admin" onClick={() => setMenuOpen(false)} className="mt-1 flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-50"><LogIn size={16} /> Administrator & branch login</Link>
        </nav>}
      </header>
    </>
  )
}

function Hero({ phone, slides = DEFAULT_HERO_SLIDES }) {
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [slides.length])

  const slide = slides[activeSlide % slides.length] || DEFAULT_HERO_SLIDES[0]

  return (
    <section id="home" className="relative isolate min-h-[470px] overflow-hidden bg-[#101820] sm:min-h-[520px]">
      <img key={slide.imageUrl} src={slide.imageUrl} alt={slide.imageAlt} className="absolute inset-0 -z-20 h-full w-full object-cover object-center transition-opacity duration-700" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#101820]/95 via-[#101820]/80 to-[#101820]/20" />
      <div className="mx-auto flex min-h-[470px] max-w-7xl items-center px-5 py-14 sm:min-h-[520px] sm:px-8 lg:px-10">
        <div key={activeSlide} className="max-w-2xl animate-[fadeIn_.5s_ease-out]">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300 sm:text-xs"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> {slide.eyebrow}</div>
          <h1 className="text-[40px] font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl">{slide.title} <span className="text-amber-400">{slide.highlight}</span></h1>
          <p className="mt-5 max-w-lg text-sm leading-6 text-slate-200 sm:text-base sm:leading-7">{slide.description}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a href="#products" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 text-sm font-bold text-slate-950 transition hover:bg-amber-400">Explore products <ArrowRight size={17} /></a>
            <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/35 px-6 text-sm font-semibold text-white transition hover:bg-white/10"><Phone size={16} /> Talk to our team</a>
          </div>
          <div aria-label={`Hero slide ${activeSlide + 1} of ${slides.length}`} className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 sm:bottom-7">
            {slides.map((item, index) => <span key={`${item.imageUrl}-${index}`} aria-current={activeSlide === index ? 'true' : undefined} className={`h-2 rounded-full transition-all ${activeSlide === index ? 'w-6 bg-amber-400' : 'w-2 bg-white/60'}`} />)}
          </div>
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-slate-200 sm:gap-x-8">
            <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-amber-400" /> Trusted quality</span>
            <span className="flex items-center gap-2"><Truck size={17} className="text-amber-400" /> Site delivery</span>
            <span className="flex items-center gap-2"><PackageCheck size={16} className="text-amber-400" /> 100% genuine</span>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 right-0 hidden w-[30%] max-w-[420px] border-l border-t border-white/15 bg-slate-950/65 p-5 text-white backdrop-blur sm:block">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-400">A better way to build</p>
        <p className="mt-1 text-sm font-semibold">Everything your project needs, all in one place.</p>
      </div>
    </section>
  )
}

function CategorySection({ categories }) {
  return (
    <section id="categories" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
      <div className="mb-7 flex items-end justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Shop by category</p><h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Everything for your build</h2></div>
        <a href="#products" className="hidden items-center gap-1 text-xs font-bold text-slate-700 hover:text-amber-700 sm:flex">All products <ArrowRight size={15} /></a>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {categories.map((category) => <Link key={category.id} to={`/category/${categorySlug(category.name)}`} className="group flex min-h-[128px] items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md sm:gap-4 sm:p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 p-1">{categoryImage(category.name) ? <img src={categoryImage(category.name)} alt="" className="h-full w-full object-contain" /> : <Package size={21} strokeWidth={1.8} />}</span>
          <span><span className="block text-xs font-bold text-slate-900 sm:text-sm">{category.name}</span><span className="mt-1 hidden text-[11px] leading-4 text-slate-500 sm:block">{category.detail}</span></span>
          <ArrowRight size={15} className="ml-auto hidden shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-amber-600 sm:block" />
        </Link>)}
      </div>
    </section>
  )
}

function ProductSection({ search, products, categoryFilter, onClearCategory, onAdd, onEnquiry, showAllByDefault = false }) {
  const [showAll, setShowAll] = useState(false)
  const visibleProducts = useMemo(() => products.filter((product) => product.active
    && (!categoryFilter || product.category === categoryFilter)
    && `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(search.toLowerCase())), [products, search, categoryFilter])

  useEffect(() => setShowAll(false), [search, categoryFilter])
  return (
    <section id="products" className="border-y border-slate-200 bg-[#f7f7f5]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="mb-7 flex items-end justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">{categoryFilter || 'Picked for your project'}</p><h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{categoryFilter ? `${categoryFilter} products` : 'Popular products'}</h2></div>
          {categoryFilter && !showAllByDefault && <button type="button" onClick={onClearCategory} className="text-xs font-semibold text-amber-800 hover:text-amber-950">Show all categories</button>}
          {!categoryFilter && <a href="#contact" className="hidden items-center gap-1 text-xs font-bold text-slate-700 hover:text-amber-700 sm:flex">Need bulk pricing? <ArrowRight size={15} /></a>}
        </div>
        {visibleProducts.length > 0 ? <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {visibleProducts.map((product, index) => <article key={product.id} className={`overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg ${!showAllByDefault && !showAll && index >= 4 && index < 8 ? 'hidden md:block' : ''} ${!showAllByDefault && !showAll && index >= 8 ? 'hidden lg:block' : ''}`}>
            <div className={`relative aspect-[1.25] overflow-hidden ${product.color || 'bg-amber-50'}`}>
              {product.image ? <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-cover transition duration-300 hover:scale-105" /> : <div className="flex h-full items-center justify-center text-amber-700"><Package size={38} strokeWidth={1.4} /></div>}
              <span className="absolute left-2.5 top-2.5 rounded bg-white/95 px-2 py-1 text-[8px] font-extrabold tracking-wider text-slate-800 sm:left-3 sm:top-3 sm:text-[9px]">{product.tag}</span>
            </div>
            <div className="p-3.5 sm:p-4">
              <h3 className="truncate text-xs font-bold text-slate-900 sm:text-sm">{product.name}</h3>
              <p className="mt-1 truncate text-[10px] text-slate-500 sm:text-xs">{product.description}</p>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-2"><span className="text-sm font-extrabold text-slate-900 sm:text-base">{formatRupees(sellingPrice(product))}</span>{Number(product.discountPercent) > 0 && <><span className="text-[10px] text-slate-400 line-through">{formatRupees(product.basePrice)}</span><span className="text-[9px] font-bold text-emerald-700">{product.discountPercent}% OFF</span></>}</div>
              <button onClick={() => onAdd(product)} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 text-[10px] font-bold text-white transition hover:bg-amber-500 hover:text-slate-950 sm:text-xs"><ShoppingCart size={14} /> Add to cart</button>
              <button onClick={() => onEnquiry(product)} className="mt-2 inline-flex h-8 w-full items-center justify-center rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-600 transition hover:border-amber-400 hover:text-amber-700 sm:text-xs">Enquire about this</button>
            </div>
          </article>)}
        </div> : <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center"><Search size={24} className="mx-auto text-slate-400" /><p className="mt-3 text-sm font-semibold text-slate-800">{products.length === 0 ? 'Our product catalog is being updated.' : `No products match “${search}”`}</p><p className="mt-1 text-xs text-slate-500">{products.length === 0 ? 'Please call us for current products and pricing.' : 'Try a different product or category name.'}</p></div>}
        {!showAllByDefault && visibleProducts.length > 4 && <div className="mt-7 flex justify-center"><button type="button" onClick={() => setShowAll((expanded) => !expanded)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:border-amber-400 hover:text-amber-800">{showAll ? 'Show fewer products' : `Show all ${visibleProducts.length} products`}<ArrowRight size={14} className={showAll ? '-rotate-90' : 'rotate-90'} /></button></div>}
      </div>
    </section>
  )
}

function Storefront() {
  const location = useLocation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [branches, setBranches] = useState([])
  const [settings, setSettings] = useState({ businessName: 'Rajesh Traders', phone: '+91 91793 49919', address: '', deliveryNote: '', heroSlides: DEFAULT_HERO_SLIDES })
  const [storeLoading, setStoreLoading] = useState(true)
  const [storeError, setStoreError] = useState('')
  const [cart, setCart] = useState([])
  const [modal, setModal] = useState('')
  const [requestType, setRequestType] = useState('Order')
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || 'main')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [contact, setContact] = useState({ name: '', phone: '', location: '' })
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [sending, setSending] = useState(false)
  const requestInFlight = useRef(false)
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0)
  const categorySlugFromPath = location.pathname.match(/^\/category\/([^/]+)/)?.[1] || ''
  const selectedCategory = categories.find((category) => categorySlug(category.name) === categorySlugFromPath)
  const categoryFilter = selectedCategory?.name || ''
  const isCategoryRoute = Boolean(categorySlugFromPath)

  useEffect(() => {
    let cancelled = false
    async function loadStore() {
      if (!isSupabaseConfigured) {
        setStoreError('Store connection is not configured. Add the Supabase URL and publishable key to the deployment environment.')
        setStoreLoading(false)
        return
      }
      try {
        const [productResult, categoryResult, branchResult, settingsResult] = await Promise.all([
          supabase.from('products').select('*').order('name'),
          supabase.from('categories').select('*').order('name'),
          supabase.from('branches').select('*').order('name'),
          supabase.from('store_settings').select('*').eq('id', 1).single(),
        ])
        const resultError = productResult.error || categoryResult.error || branchResult.error || settingsResult.error
        if (cancelled) return
        if (resultError) {
          setStoreError(`Unable to load the live store: ${describeSupabaseError(resultError)}`)
        } else {
          setProducts(productResult.data.map(fromProduct))
          setCategories(categoryResult.data.map(fromCategory))
          setBranches(branchResult.data.map(fromBranch))
          setSettings(fromSettings(settingsResult.data))
        }
      } catch (loadError) {
        if (!cancelled) setStoreError(`Unable to connect to the live store: ${describeSupabaseError(loadError)}`)
      } finally {
        if (!cancelled) setStoreLoading(false)
      }
    }
    loadStore()
    return () => { cancelled = true }
  }, [])

  function addToCart(product) {
    setCart((items) => {
      const existing = items.find((item) => item.product.id === product.id)
      if (existing) return items.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      return [...items, { product, quantity: 1 }]
    })
    setNotice(`${product.name} added to your cart`)
    playUiSound('tap')
    window.setTimeout(() => setNotice(''), 2600)
  }

  function openRequest(type, product) {
    if (product) {
      setCart([{ product, quantity: 1 }])
      setSelectedProductId(product.id)
    } else {
      setSelectedProductId(products.find((item) => item.active)?.id || '')
    }
    setSelectedBranchId(branches[0]?.id || '')
    setRequestType(type)
    setFormError('')
    setModal('cart')
  }

  async function submitRequest(event) {
    event.preventDefault()
    if (requestInFlight.current) return
    const cleanContact = {
      name: contact.name.trim(),
      phone: contact.phone.trim(),
      location: contact.location.trim(),
    }
    if (!cleanContact.name || !cleanContact.phone || !cleanContact.location) {
      setFormError('Please enter your name, phone number, and delivery location.')
      return
    }
    if (!/^[+()\d\s-]{8,18}$/.test(cleanContact.phone)) {
      setFormError('Enter a valid phone number so our team can contact you.')
      return
    }
    if (cart.length === 0) {
      setFormError('Add a product to your request before sending it.')
      return
    }

    if (!isSupabaseConfigured) {
      setFormError('The store is not connected yet. Please contact us by phone.')
      return
    }
    const branchId = selectedBranchId || branches[0]?.id
    if (!branchId) {
      setFormError('No service branch is available yet. Please contact us by phone.')
      return
    }
    const submittedCart = cart
    const requestPayload = {
      id: `RT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      request_type: requestType,
      status: 'New',
      branch_id: branchId,
      customer_name: cleanContact.name,
      phone: cleanContact.phone,
      location: cleanContact.location,
      items: submittedCart.map(({ product, quantity }) => ({ productId: product.id, name: product.name, quantity, unitPrice: sellingPrice(product) })),
      total: 0,
    }
    requestInFlight.current = true
    setSending(true)
    setModal('')
    setCart([])
    setContact({ name: '', phone: '', location: '' })
    setNotice('Sending your request…')
    try {
      const { error } = await supabase.from('customer_requests').insert(requestPayload)
      if (error) {
        setCart(submittedCart)
        setContact(cleanContact)
        setModal('details')
        setNotice('')
        setFormError(`We couldn't send your enquiry: ${describeSupabaseError(error)}. Please try again or call us.`)
        return
      }
    } catch (sendError) {
      setCart(submittedCart)
      setContact(cleanContact)
      setModal('details')
      setNotice('')
      setFormError(`We couldn't send your enquiry: ${describeSupabaseError(sendError)}. Please try again or call us.`)
      return
    } finally {
      requestInFlight.current = false
      setSending(false)
    }
    setFormError('')
    playUiSound('success')
    setNotice('Your enquiry has been sent to Rajesh Traders.')
    window.setTimeout(() => setNotice(''), 4000)
  }

  function updateQuantity(productId, quantity) {
    setCart((items) => items.map((item) => item.product.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item))
  }

  function searchProducts(value) {
    setSearch(value)
    if (value && isCategoryRoute) navigate('/')
  }

  function selectCategory(category) {
    setSearch('')
    navigate(`/category/${categorySlug(category)}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function selectProduct(product) {
    if (isCategoryRoute) navigate('/')
    setSearch(product.name)
    window.setTimeout(() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }), 0)
  }

  function goHome() {
    navigate('/')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header cartCount={cartCount} search={search} onSearch={searchProducts} products={products} categories={categories} onSelectCategory={selectCategory} onSelectProduct={selectProduct} onCart={() => setModal('cart')} settings={settings} />
      <main>
        {!isCategoryRoute && <Hero phone={settings.phone} slides={settings.heroSlides} />}
        {storeError && <div role="alert" className="mx-auto max-w-7xl px-4 pt-5 text-sm text-rose-700">{storeError}</div>}
        {!isCategoryRoute && <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-slate-200 px-4 py-5 sm:grid-cols-4 sm:px-6 lg:px-8">
            {[['Cement & steel', 'Reliable building essentials'], ['Wholesale & retail', 'Options for every project'], ['Site delivery', 'Ask about your area'], ['Customer support', 'Talk to our team']].map(([title, subtitle]) => <div key={title} className="px-3 py-2 text-center sm:px-4"><p className="text-sm font-extrabold text-slate-900 sm:text-base">{title}</p><p className="mt-1 text-[10px] text-slate-500 sm:text-xs">{subtitle}</p></div>)}
          </div>
        </div>}
        {isCategoryRoute && <section className="border-b border-slate-200 bg-white"><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><button type="button" onClick={goHome} className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-amber-800"><ArrowRight size={14} className="rotate-180" /> All products</button>{selectedCategory ? <><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Shop by category</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">{selectedCategory.name}</h1><p className="mt-2 text-sm text-slate-500">{selectedCategory.detail || `Browse all ${selectedCategory.name.toLowerCase()} products.`}</p></> : storeLoading ? <><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Shop by category</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">Loading category…</h1></> : <><h1 className="text-2xl font-extrabold text-slate-900">Category not found</h1><p className="mt-2 text-sm text-slate-500">This category may have been removed from the store.</p></>}</div></section>}
        {!isCategoryRoute && categories.length > 0 && <CategorySection categories={categories} />}
        {storeLoading ? <div className="border-y border-slate-200 bg-[#f7f7f5] px-4 py-16 text-center text-sm text-slate-500">Loading the live product catalog…</div> : selectedCategory ? <ProductSection search={search} products={products} categoryFilter={categoryFilter} onClearCategory={goHome} onAdd={addToCart} onEnquiry={(product) => openRequest('Enquiry', product)} showAllByDefault /> : isCategoryRoute ? null : <ProductSection search={search} products={products} categoryFilter="" onClearCategory={() => {}} onAdd={addToCart} onEnquiry={(product) => openRequest('Enquiry', product)} />}
        {!isCategoryRoute && <section id="about" className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-2 md:items-center lg:px-8 lg:py-20">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Built on trust</p><h2 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl">Good materials make a stronger tomorrow.</h2><p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">Rajesh Traders helps homeowners, contractors and builders find reliable materials without the hassle. Get honest guidance, dependable brands and delivery that keeps your project moving.</p><a href="#contact" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-amber-700 hover:text-amber-800">Get to know us <ArrowRight size={16} /></a></div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {[['Genuine brands', 'Only trusted, quality-assured products'], ['Helpful advice', 'Real people who know building'], ['On-time delivery', 'Materials delivered to your site'], ['Fair prices', 'Great value for every project']].map(([title, copy], index) => <div key={title} className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5"><span className="text-xl font-extrabold text-amber-600">0{index + 1}</span><h3 className="mt-3 text-xs font-bold text-slate-900 sm:text-sm">{title}</h3><p className="mt-1 text-[10px] leading-4 text-slate-500 sm:text-xs">{copy}</p></div>)}
          </div>
        </section>}
        {!isCategoryRoute && <section id="contact" className="bg-amber-500">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center lg:px-8">
            <div><p className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">Planning a big project?</p><p className="mt-1 text-sm text-slate-800">Talk to us for bulk orders and a quote tailored to your needs.</p></div>
            <button onClick={() => openRequest('Enquiry')} className="inline-flex h-11 items-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800"><Phone size={16} /> Request a quote</button>
          </div>
        </section>}
      </main>
      <footer className="bg-[#101820] text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
          <div><Link to="/" className="inline-flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-slate-950"><HardHat size={20} /></span><span className="text-sm font-extrabold text-white">{settings.businessName}</span></Link><p className="mt-3 max-w-xs text-xs leading-5 text-slate-400">Your dependable local partner for quality building materials and hardware.</p></div>
          <div><h3 className="text-xs font-bold text-white">Explore</h3><div className="mt-3 grid grid-cols-2 gap-y-2 text-xs text-slate-400">{[['Shop products', '#products'], ['Categories', '#categories'], ['About us', '#about'], ['Contact', '#contact']].map(([label, href]) => <a key={label} href={isCategoryRoute ? `/${href}` : href} className="hover:text-white">{label}</a>)}</div></div>
          <div><h3 className="text-xs font-bold text-white">Visit or call us</h3><p className="mt-3 text-xs leading-5 text-slate-400">{settings.address || 'Call us for store location and delivery details.'}</p><a href={`tel:${settings.phone.replace(/[^\d+]/g, '')}`} className="mt-2 inline-block text-xs font-semibold text-amber-400 hover:text-amber-300">{settings.phone}</a><Link to="/admin" className="mt-3 flex items-center gap-1 text-[11px] text-slate-500 hover:text-white"><LogIn size={13} /> Administrator / branch login</Link></div>
        </div>
        <div className="border-t border-white/10 px-4 py-4 text-center text-[10px] text-slate-500">© 2026 Rajesh Traders. All rights reserved.</div>
      </footer>
      {modal && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal('') }}>
        <div role="dialog" aria-modal="true" aria-labelledby="request-title" className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">{modal === 'cart' ? 'Step 1 · Review' : 'Step 2 · Your details'}</p><h2 id="request-title" className="mt-1 text-xl font-extrabold text-slate-900">{modal === 'cart' ? 'Your order' : 'Where should we contact you?'}</h2></div><button onClick={() => setModal('')} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>
          {modal === 'cart' && cart.length > 0 ? <div className="mt-5 space-y-3">{cart.map(({ product, quantity }) => <div key={product.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{product.name}</p><p className="mt-1 text-xs text-slate-500">{formatRupees(sellingPrice(product))} each</p></div><div className="flex items-center gap-2"><button onClick={() => quantity === 1 ? setCart((items) => items.filter((item) => item.product.id !== product.id)) : updateQuantity(product.id, quantity - 1)} aria-label={`Decrease ${product.name} quantity`} className="h-8 w-8 rounded-lg border border-slate-200 text-lg">−</button><span className="w-5 text-center text-sm font-bold">{quantity}</span><button onClick={() => updateQuantity(product.id, quantity + 1)} aria-label={`Increase ${product.name} quantity`} className="h-8 w-8 rounded-lg border border-slate-200 text-lg">+</button></div></div>)}<div className="flex justify-between border-t border-slate-100 pt-3 text-sm font-bold"><span>Estimated total</span><span>{formatRupees(cart.reduce((sum, item) => sum + sellingPrice(item.product) * item.quantity, 0))}</span></div><p className="text-[10px] leading-4 text-slate-500">Final availability and pricing will be confirmed by our team.</p><button onClick={() => { setFormError(''); setModal('details') }} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 text-sm font-extrabold text-slate-950 transition hover:bg-amber-400">Continue <ArrowRight size={16} /></button></div> : modal === 'cart' ? <div className="mt-5">{requestType === 'Enquiry' ? <div className="rounded-lg border border-slate-200 p-4"><label className="block text-xs font-semibold text-slate-700">Choose a product for your enquiry<select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-amber-500">{products.filter((product) => product.active).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><button onClick={() => { const product = products.find((item) => item.id === selectedProductId); if (product) setCart([{ product, quantity: 1 }]) }} className="mt-3 h-10 w-full rounded-lg bg-slate-900 text-xs font-bold text-white hover:bg-slate-800">Add product</button></div> : <div className="rounded-xl bg-slate-50 p-5 text-center"><ShoppingCart size={24} className="mx-auto text-slate-400" /><p className="mt-2 text-sm font-semibold">Your cart is empty</p><p className="mt-1 text-xs text-slate-500">Add products to start an order.</p><button onClick={() => { setModal(''); document.querySelector('#products')?.scrollIntoView({ behavior: 'smooth' }) }} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white">Browse products</button></div>}</div> : null}
          {modal === 'details' && cart.length > 0 && <>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5"><span className="truncate text-xs font-medium text-slate-600">{cart.length === 1 ? cart[0].product.name : `${cart.length} products`} · {cart.reduce((sum, item) => sum + item.quantity, 0)} items</span><button onClick={() => { setFormError(''); setModal('cart') }} className="shrink-0 text-[10px] font-bold text-amber-800 hover:text-amber-950">Edit order</button></div>
            <form onSubmit={submitRequest} className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">Your name<input required autoComplete="name" value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-amber-500" placeholder="Enter your full name" /></label>
              <label className="block text-xs font-semibold text-slate-700">Phone number<input required type="tel" autoComplete="tel" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-amber-500" placeholder="+91 91793 49919" /></label>
              <label className="block text-xs font-semibold text-slate-700">Delivery location<input required autoComplete="street-address" value={contact.location} onChange={(event) => setContact({ ...contact, location: event.target.value })} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-amber-500" placeholder="Area, city or site address" /></label>
              {branches.length > 1 && <label className="block text-xs font-semibold text-slate-700">Preferred branch<select className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-amber-500" value={selectedBranchId} onChange={(event) => setSelectedBranchId(event.target.value)}><option value="">Choose nearest branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.city ? `${branch.name} · ${branch.city}` : branch.name}</option>)}</select></label>}
              {formError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{formError}</p>}
              <button type="submit" disabled={sending} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 text-sm font-extrabold text-slate-950 transition hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60">{sending ? 'Sending…' : 'Send enquiry'} {!sending && <ArrowRight size={16} />}</button>
              <p className="text-center text-[10px] leading-4 text-slate-500">Your details and product request will be shared with Rajesh Traders so the team can contact you.</p>
            </form>
          </>}
        </div>
      </div>}
      {notice && <div role="status" className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-semibold text-white shadow-xl"><ShoppingCart size={15} className="text-amber-400" />{notice}</div>}
    </div>
  )
}

export default function App() {
  const location = useLocation()
  if (location.pathname.startsWith('/admin')) return <AdminApp />
  return <Storefront />
}
