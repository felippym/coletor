-- Usuários de teste: Kelly (Leblon) e Joana (Ipanema)
-- Senha para ambos: teste123

insert into public.users (username, password_hash, loja_id) values
  ('kelly', '$2b$10$KvQQoHdoEcDiYPK52ltrxuKbGj5kskl79J8lU.VLgySQQ8JKfVANG', (select id from public.lojas where name = 'Leblon' limit 1)),
  ('joana', '$2b$10$tRGhcDyI4zH/QuFb8qM9uOtqyafsIhy/02yICC6dRUGsPnmMOg.F.', (select id from public.lojas where name = 'Ipanema' limit 1))
on conflict (username) do update set
  password_hash = excluded.password_hash,
  loja_id = excluded.loja_id;
