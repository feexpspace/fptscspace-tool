-- Duyệt nghiệm thu video
-- Chạy trong Supabase SQL Editor

-- Quyền duyệt nghiệm thu (do admin cấp)
alter table public.users
    add column if not exists can_approve boolean not null default false;

-- Trạng thái nghiệm thu của từng clip
-- acceptance_status: null = chưa duyệt, 'approved' = được duyệt, 'rejected' = không duyệt
alter table public.videos
    add column if not exists acceptance_status text
        check (acceptance_status in ('approved', 'rejected')),
    add column if not exists acceptance_note text,
    add column if not exists acceptance_by uuid references public.users(id) on delete set null,
    add column if not exists acceptance_at timestamptz;

create index if not exists videos_acceptance_status_idx on public.videos (acceptance_status);
