# Rajesh Traders

## Connect the Supabase project

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set the project's Supabase URL and active publishable key (or legacy anon key). Use either `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; the Vite app accepts both. The URL and key must come from the same project. After changing the file, restart Vite. Never put a service-role key or an account password in a browser environment variable.
3. In Supabase Dashboard → SQL Editor, run [`supabase/migrations/20260601000000_storefront_and_admin.sql`](./supabase/migrations/20260601000000_storefront_and_admin.sql).
4. Run [`supabase/migrations/20261026000000_add_homepage_hero_slides.sql`](./supabase/migrations/20261026000000_add_homepage_hero_slides.sql) to enable editable homepage slides and live new-request notifications in the admin portal.
5. Run [`supabase/migrations/20261026000001_owner_account_signup.sql`](./supabase/migrations/20261026000001_owner_account_signup.sql) to assign the owner role only to `dg3667610@gmail.com` at account creation and to assign it to that email if it already exists.
6. Start the app with `npm run dev`, open `/admin`, select **Create the administrator account**, and sign up as `dg3667610@gmail.com` with a strong password. Confirm the email if Supabase requires it, then sign in. The database migration, not client-side form data, grants the owner role.
7. Add actual categories and products, verify prices, set the store address, and create actual branch records in the admin portal before sharing the site. Owners can change the home-page hero text and image URLs under Settings; use public images around 2000 × 900 px.

Admin users can turn interface and new-request sounds on or off from the volume button in the workspace header. Browsers may require an initial user interaction before playing audio.

Create branch staff users in Supabase Authentication, then assign each profile to a branch from the SQL Editor:

```sql
insert into public.user_profiles (user_id, display_name, role, branch_id)
select id, 'Branch Staff Name', 'branch', 'BRANCH_ID'
from auth.users
where email = 'BRANCH_USER_EMAIL'
on conflict (user_id) do update
set display_name = excluded.display_name, role = 'branch', branch_id = excluded.branch_id;
```

Public requests are insert-only for guests. Database row-level security limits staff to their assigned branch; do not disable RLS or expose a service-role key in the browser.

## Deploying publicly

The Supabase database connection does not itself publish the website. Deploy the Vite app to a static host and configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as build-time environment variables there. Configure the deployed URL in Supabase Authentication → URL Configuration.
