drop policy if exists "Owners and assigned staff delete unbilled requests" on public.customer_requests;
create policy "Owners and assigned staff delete unbilled requests"
on public.customer_requests for delete to authenticated
using (
  not exists (
    select 1
    from public.bills
    where public.bills.request_id = public.customer_requests.id
  )
  and (
    public.is_store_owner()
    or public.customer_requests.branch_id = public.current_user_branch_id()
  )
);

grant delete on public.customer_requests to authenticated;