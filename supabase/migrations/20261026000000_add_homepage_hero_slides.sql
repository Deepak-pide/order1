alter table public.store_settings
add column if not exists hero_slides jsonb not null default '[
  {
    "imageUrl": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=2000&q=85",
    "imageAlt": "Construction workers building a new home",
    "eyebrow": "Your trusted building partner",
    "title": "Build with",
    "highlight": "confidence. Build for life.",
    "description": "From the first brick to the finishing touch, get quality cement, steel, roofing and tools at prices that work for you."
  },
  {
    "imageUrl": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=85",
    "imageAlt": "Modern home under construction",
    "eyebrow": "Materials for every stage",
    "title": "The right materials.",
    "highlight": "A stronger build.",
    "description": "Explore building essentials for your home, site or next big project, with support from our team."
  },
  {
    "imageUrl": "https://images.unsplash.com/photo-1503387762-592dea58ef23?auto=format&fit=crop&w=2000&q=85",
    "imageAlt": "Architectural plans for a building project",
    "eyebrow": "Wholesale and retail",
    "title": "Plan your build.",
    "highlight": "We can help.",
    "description": "Browse the catalog, send us your requirements and our team will follow up with you."
  }
]'::jsonb;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'customer_requests'
    )
  then
    alter publication supabase_realtime add table public.customer_requests;
  end if;
end;
$$;
