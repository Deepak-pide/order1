export const BUSINESS_PHONE = '+91 91793 49919'

export const DEFAULT_HERO_SLIDES = [
  {
    imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=2000&q=85',
    imageAlt: 'Construction workers building a new home',
    eyebrow: 'Your trusted building partner',
    title: 'Build with',
    highlight: 'confidence. Build for life.',
    description: 'From the first brick to the finishing touch, get quality cement, steel, roofing and tools at prices that work for you.',
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=85',
    imageAlt: 'Modern home under construction',
    eyebrow: 'Materials for every stage',
    title: 'The right materials.',
    highlight: 'A stronger build.',
    description: 'Explore building essentials for your home, site or next big project, with support from our team.',
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1503387762-592dea58ef23?auto=format&fit=crop&w=2000&q=85',
    imageAlt: 'Architectural plans for a building project',
    eyebrow: 'Wholesale and retail',
    title: 'Plan your build.',
    highlight: 'We can help.',
    description: 'Browse the catalog, send us your requirements and our team will follow up with you.',
  },
]

export function formatRupees(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)
}

export function sellingPrice(product) {
  return Number(product.basePrice) * (1 - Number(product.discountPercent || 0) / 100)
}

export function fromProduct(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    basePrice: Number(row.base_price),
    discountPercent: Number(row.discount_percent),
    image: row.image_url || '',
    tag: Number(row.discount_percent) > 0 ? `${row.discount_percent}% OFF` : 'IN STOCK',
    color: 'bg-amber-50',
    active: row.active,
  }
}

export function toProduct(product) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    base_price: Number(product.basePrice),
    discount_percent: Number(product.discountPercent || 0),
    image_url: product.image || null,
    active: product.active,
  }
}

export function fromCategory(row) {
  return { id: row.id, name: row.name, detail: row.detail || '' }
}

export function toCategory(category) {
  return { id: category.id, name: category.name, detail: category.detail || '' }
}

export function fromBranch(row) {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    manager: row.manager_name || '',
    isMain: row.is_main,
  }
}

export function toBranch(branch) {
  return {
    id: branch.id,
    name: branch.name,
    city: branch.city,
    manager_name: branch.manager || '',
    is_main: Boolean(branch.isMain),
  }
}

export function fromRequest(row) {
  return {
    id: row.id,
    type: row.request_type,
    status: row.status,
    branchId: row.branch_id,
    customer: { name: row.customer_name, phone: row.phone, location: row.location },
    items: row.items || [],
    total: Number(row.total),
    createdAt: row.created_at,
  }
}

export function toRequest(request) {
  return {
    id: request.id,
    request_type: request.type,
    status: request.status,
    branch_id: request.branchId,
    customer_name: request.customer.name,
    phone: request.customer.phone,
    location: request.customer.location,
    items: request.items,
    total: Number(request.total),
    created_at: request.createdAt,
  }
}

export function fromBill(row) {
  return {
    id: row.id,
    requestId: row.request_id,
    branchId: row.branch_id,
    customer: { name: row.customer_name, phone: row.phone, location: row.location },
    items: row.items || [],
    total: Number(row.total),
    createdAt: row.created_at,
    status: row.status,
  }
}

export function toBill(bill) {
  return {
    id: bill.id,
    request_id: bill.requestId,
    branch_id: bill.branchId,
    customer_name: bill.customer.name,
    phone: bill.customer.phone,
    location: bill.customer.location,
    items: bill.items,
    total: Number(bill.total),
    created_at: bill.createdAt,
    status: bill.status,
  }
}

export function fromSettings(row) {
  return {
    businessName: row.business_name,
    phone: row.phone,
    address: row.address,
    deliveryNote: row.delivery_note,
    heroSlides: Array.isArray(row.hero_slides) && row.hero_slides.length
      ? row.hero_slides
      : DEFAULT_HERO_SLIDES,
  }
}

export function toSettings(settings) {
  return {
    id: 1,
    business_name: settings.businessName,
    phone: settings.phone,
    address: settings.address,
    delivery_note: settings.deliveryNote,
    hero_slides: settings.heroSlides,
  }
}
