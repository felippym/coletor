-- Atualiza senha do usuário ipanema para 102030
update public.users
set password_hash = '$2b$10$sUOVue284p6mgWnCuCgD.Ooi4fnPVHJqXc/6cAZPpd8S91RsvSvNW'
where username = 'ipanema';
