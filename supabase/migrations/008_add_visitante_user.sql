-- Adiciona usuário visitante (senha padrão: secret)
insert into public.users (username, password_hash) values
  ('visitante', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW')
on conflict (username) do update set password_hash = excluded.password_hash;
