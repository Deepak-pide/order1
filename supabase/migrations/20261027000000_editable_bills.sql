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

  if tg_op = 'INSERT' then
    if source_request.status not in ('Confirmed', 'Completed') then
      raise exception 'Confirm the customer order before creating a bill';
    end if;

    new.branch_id := source_request.branch_id;
    new.customer_name := source_request.customer_name;
    new.phone := source_request.phone;
    new.location := source_request.location;
    new.items := source_request.items;
    new.total := source_request.total;
    new.status := 'Unpaid';
    new.created_at := now();
  end if;

  return new;
end;
$$;

revoke update on public.bills from authenticated;
grant update (customer_name, phone, location, items, total, status) on public.bills to authenticated;