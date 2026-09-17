# Copa Laranjeiras de Futsal

Primeira versão da plataforma de divulgação e inscrição da Copa Laranjeiras.

## Rodar localmente

Requer Node.js 18 ou superior e um banco Postgres (Supabase):

```bash
npm install
cp .env.example .env   # preencha DATABASE_URL com a connection string do seu Postgres
psql "$DATABASE_URL" -f db/schema.sql   # cria as tabelas (só precisa rodar uma vez)
npm start
```

Acesse `http://localhost:3000`. O painel da organização fica em `http://localhost:3000/admin` (login necessário).

Se você já tem dados no antigo `data/database.json`, rode `npm run migrate` depois de aplicar o schema para importar usuários e times existentes para o Postgres.

## O que já está nesta versão

- MVC separado em `src/models`, `src/views`, `src/controllers`, `src/services` e `src/middleware`.
- Rotas públicas para landing, inscrição, cadastro e login.
- Autenticação com sessão HttpOnly, senha derivada com `scrypt` e proteção por papel.
- Primeiro usuário cadastrado recebe papel `admin`; os seguintes recebem `organizer`.
- Painel administrativo com consultas, filtros, pagamentos e autorização de times.
- Chaveamento gerado a partir dos times autorizados.
- Persistência em Postgres (Supabase), com schema em `db/schema.sql` e models em `src/models/*.model.js`.
- Painel do time com links diretos de pagamento (cartão de crédito, Pix à vista e Pix parcelado), configurados em `src/config.js`.

## Próxima integração

O pagamento hoje é feito por links externos (InfinitePay/C6) e a confirmação do status ("pago"/"50% pago") ainda é manual, feita pelo admin no painel. O próximo passo é conectar um webhook desses provedores para confirmar os pagamentos automaticamente, além de adicionar recuperação de senha.
