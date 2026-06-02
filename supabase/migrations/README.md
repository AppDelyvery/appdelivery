# Migrations — APPDELYVERY

O schema completo (tabelas, enums, PostGIS, função `find_entregadores_proximos`, RLS)
está especificado em `build-spec/02-BANCO-DADOS.md` no segundo-cérebro.

Migrations prontas (rodar em ordem no **SQL Editor** do Supabase do APPDELYVERY):
- `0001_schema.sql` — extensões (PostGIS/pgcrypto), enums, tabelas, índices e a função de matching `find_entregadores_proximos`.
- `0002_rls.sql` — RLS v1 (helpers `auth_role()`/`is_admin()` SECURITY DEFINER), políticas por papel, e a função pública `get_rastreio_publico(token)`.

Depois de rodar, ligar Realtime nas tabelas `pedidos` (status) e usar Broadcast no canal `pedido:{id}` (posição ao vivo — não gravar cada ping).

Regras duras que valem aqui:
- **Migration antes do push** — coluna/tabela nova entra em prod antes do `git push`.
- **RLS sem subquery na própria tabela** — usar função `SECURITY DEFINER` (evita recursão).
- **Não gravar cada ping de GPS** — posição ao vivo via Realtime Broadcast; só amostra em `rastreios`.
- **Antecedentes são dado sensível (LGPD)** — só admin, nunca expostos ao negócio.
