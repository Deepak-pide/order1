create extension if not exists pgcrypto;

create table if not exists public.branches (
  id text primary key,
  name text not null,
  city text not null,
  manager_name text not null default '',
  is_main boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('owner', 'branch')),
  branch_id text references public.branches(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint branch_profile_requires_branch check (role <> 'branch' or branch_id is not null),
  constraint owner_profile_has_no_branch check (role <> 'owner' or branch_id is null)
);

create table if not exists public.categories (
  id text primary key,
  name text not null unique,
  detail text not null default ''
);

create table if not exists public.products (
  id text primary key,
  name text not null,
  description text not null,
  category text not null references public.categories(name) on update cascade on delete restrict,
  base_price numeric(12, 2) not null check (base_price > 0),
  discount_percent numeric(5, 2) not null default 0 check (discount_percent between 0 and 100),
  image_url text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  id integer primary key check (id = 1),
  business_name text not null,
  phone text not null,
  address text not null default '',
  delivery_note text not null default ''
);

create table if not exists public.customer_requests (
  id text primary key,
  request_type text not null check (request_type in ('Order', 'Enquiry')),
  status text not null default 'New' check (status in ('New', 'Contacted', 'Confirmed', 'Completed', 'Cancelled')),
  branch_id text not null references public.branches(id) on delete restrict,
  customer_name text not null,
  phone text not null,
  location text not null,
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  total numeric(12, 2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.bills (
  id text primary key,
  request_id text not null unique references public.customer_requests(id) on delete restrict,
  branch_id text not null references public.branches(id) on delete restrict,
  customer_name text not null,
  phone text not null,
  location text not null,
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  total numeric(12, 2) not null check (total >= 0),
  status text not null default 'Unpaid' check (status in ('Unpaid', 'Paid', 'Void')),
  created_at timestamptz not null default now()
);

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_profiles where user_id = auth.uid()
$$;

create or replace function public.current_user_branch_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select branch_id from public.user_profiles where user_id = auth.uid() and role = 'branch'
$$;

create or replace function public.is_store_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'owner', false)
$$;

create or replace function public.normalize_customer_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_item jsonb;
  product_row public.products%rowtype;
  quantity_value integer;
  verified_items jsonb := '[]'::jsonb;
  verified_total numeric(12, 2) := 0;
  unit_price numeric(12, 2);
begin
  if jsonb_array_length(new.items) = 0 then
    raise exception 'Add at least one product to the request';
  end if;

  for requested_item in select value from jsonb_array_elements(new.items)
  loop
    quantity_value := (requested_item->>'quantity')::integer;
    if quantity_value < 1 or quantity_value > 10000 then
      raise exception 'Product quantity is outside the allowed range';
    end if;

    select * into product_row
    from public.products
    where id = requested_item->>'productId' and active = true;

    if not found then
      raise exception 'A requested product is no longer available';
    end if;

    unit_price := round(product_row.base_price * (1 - product_row.discount_percent / 100), 2);
    verified_items := verified_items || jsonb_build_array(jsonb_build_object(
      'productId', product_row.id,
      'name', product_row.name,
      'quantity', quantity_value,
      'unitPrice', unit_price
    ));
    verified_total := verified_total + unit_price * quantity_value;
  end loop;

  new.items := verified_items;
  new.total := verified_total;
  new.status := 'New';
  return new;
end;
$$;

create or replace function public.normalize_bill()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_request public.customer_requests%rowtype;
begin
  select * into source_request
  from public.customer_requests
  where id = new.request_id;

  if not found or source_request.request_type <> 'Order' then
    raise exception 'A bill must refer to an order request';
  end if;
  if tg_op = 'INSERT' and source_request.status not in ('Confirmed', 'Completed') then
    raise exception 'Confirm the customer order before creating a bill';
  end if;

  new.branch_id := source_request.branch_id;
  new.customer_name := source_request.customer_name;
  new.phone := source_request.phone;
  new.location := source_request.location;
  new.items := source_request.items;
  new.total := source_request.total;
  if tg_op = 'INSERT' then
    new.status := 'Unpaid';
    new.created_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists customer_request_normalize on public.customer_requests;
create trigger customer_request_normalize
before insert on public.customer_requests
for each row execute function public.normalize_customer_request();

drop trigger if exists bill_from_confirmed_order on public.bills;
create trigger bill_from_confirmed_order
before insert or update on public.bills
for each row execute function public.normalize_bill();

create index if not exists customer_requests_branch_created_idx on public.customer_requests(branch_id, created_at desc);
create index if not exists bills_branch_created_idx on public.bills(branch_id, created_at desc);
create index if not exists products_active_category_idx on public.products(active, category);

alter table public.branches enable row level security;
alter table public.user_profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.store_settings enable row level security;
alter table public.customer_requests enable row level security;
alter table public.bills enable row level security;

drop policy if exists "Branches are publicly readable" on public.branches;
create policy "Branches are publicly readable" on public.branches for select using (true);
drop policy if exists "Owners manage branches" on public.branches;
create policy "Owners manage branches" on public.branches for all to authenticated
using (public.is_store_owner()) with check (public.is_store_owner());

drop policy if exists "Users read their own profile" on public.user_profiles;
create policy "Users read their own profile" on public.user_profiles for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Categories are publicly readable" on public.categories;
create policy "Categories are publicly readable" on public.categories for select using (true);
drop policy if exists "Owners manage categories" on public.categories;
create policy "Owners manage categories" on public.categories for all to authenticated
using (public.is_store_owner()) with check (public.is_store_owner());

drop policy if exists "Active products are public" on public.products;
create policy "Active products are public" on public.products for select
using (active or public.is_store_owner());
drop policy if exists "Owners manage products" on public.products;
create policy "Owners manage products" on public.products for all to authenticated
using (public.is_store_owner()) with check (public.is_store_owner());

drop policy if exists "Store settings are publicly readable" on public.store_settings;
create policy "Store settings are publicly readable" on public.store_settings for select using (true);
drop policy if exists "Owners manage store settings" on public.store_settings;
create policy "Owners manage store settings" on public.store_settings for all to authenticated
using (public.is_store_owner()) with check (public.is_store_owner());

drop policy if exists "Public may submit customer requests" on public.customer_requests;
create policy "Public may submit customer requests" on public.customer_requests for insert to anon, authenticated
with check (
  status = 'New'
  and exists (
    select 1 from public.branches
    where public.branches.id = public.customer_requests.branch_id
  )
);
drop policy if exists "Owners and assigned branch staff read requests" on public.customer_requests;
create policy "Owners and assigned branch staff read requests" on public.customer_requests for select to authenticated
using (public.is_store_owner() or branch_id = public.current_user_branch_id());
drop policy if exists "Owners and assigned branch staff update requests" on public.customer_requests;
create policy "Owners and assigned branch staff update requests" on public.customer_requests for update to authenticated
using (public.is_store_owner() or branch_id = public.current_user_branch_id())
with check (public.is_store_owner() or branch_id = public.current_user_branch_id());

drop policy if exists "Owners and assigned branch staff read bills" on public.bills;
create policy "Owners and assigned branch staff read bills" on public.bills for select to authenticated
using (public.is_store_owner() or branch_id = public.current_user_branch_id());
drop policy if exists "Owners and assigned branch staff create bills" on public.bills;
create policy "Owners and assigned branch staff create bills" on public.bills for insert to authenticated
with check (public.is_store_owner() or branch_id = public.current_user_branch_id());
drop policy if exists "Owners and assigned branch staff update bills" on public.bills;
create policy "Owners and assigned branch staff update bills" on public.bills for update to authenticated
using (public.is_store_owner() or branch_id = public.current_user_branch_id())
with check (public.is_store_owner() or branch_id = public.current_user_branch_id());

grant select on public.branches, public.categories, public.products, public.store_settings to anon, authenticated;
grant insert, update, delete on public.branches, public.categories, public.products, public.store_settings to authenticated;
grant select on public.user_profiles to authenticated;
grant insert on public.customer_requests to anon, authenticated;
grant select on public.customer_requests to authenticated;
revoke update on public.customer_requests from authenticated;
grant update (status, branch_id) on public.customer_requests to authenticated;
grant select, insert on public.bills to authenticated;
revoke update on public.bills from authenticated;
grant update (status) on public.bills to authenticated;

insert into public.branches (id, name, city, manager_name, is_main)
values ('main', 'Main Branch', '', '', true)
on conflict (id) do nothing;

insert into public.store_settings (id, business_name, phone, address, delivery_note)
values (1, 'Rajesh Traders', '+91 91793 49919', '', 'Quality building materials. Contact us for delivery and bulk pricing.')
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 4194304, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Product photos are publicly readable" on storage.objects;
create policy "Product photos are publicly readable" on storage.objects for select
using (bucket_id = 'product-images');
drop policy if exists "Owners upload product photos" on storage.objects;
create policy "Owners upload product photos" on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and public.is_store_owner());
drop policy if exists "Owners update product photos" on storage.objects;
create policy "Owners update product photos" on storage.objects for update to authenticated
using (bucket_id = 'product-images' and public.is_store_owner())
with check (bucket_id = 'product-images' and public.is_store_owner());
