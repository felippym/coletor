alter table public.product_review_tickets
  add column if not exists status text not null default 'em_aberto';

alter table public.product_review_tickets drop constraint if exists product_review_tickets_status_check;
alter table public.product_review_tickets add constraint product_review_tickets_status_check
  check (status in ('em_aberto', 'concluido'));

comment on column public.product_review_tickets.status is 'em_aberto | concluido';
