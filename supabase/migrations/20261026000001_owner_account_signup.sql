create or replace function public.assign_initial_owner_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(new.email, '')) = 'dg3667610@gmail.com' then
    insert into public.user_profiles (user_id, display_name, role, branch_id)
    values (
      new.id,
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        'Rajesh Traders Administrator'
      ),
      'owner',
      null
    )
    on conflict (user_id) do update
    set display_name = excluded.display_name,
        role = 'owner',
        branch_id = null;
  end if;
  return new;
end;
$$;

drop trigger if exists assign_initial_owner_profile on auth.users;
create trigger assign_initial_owner_profile
after insert or update on auth.users
for each row execute function public.assign_initial_owner_profile();

insert into public.user_profiles (user_id, display_name, role, branch_id)
select
  id,
  coalesce(
    nullif(btrim(raw_user_meta_data ->> 'full_name'), ''),
    'Rajesh Traders Administrator'
  ),
  'owner',
  null
from auth.users
where lower(email) = 'dg3667610@gmail.com'
on conflict (user_id) do update
set display_name = excluded.display_name,
    role = 'owner',
    branch_id = null;
