# Arquitetura — Oficina dos Bichos V5

## Aplicação

- **Frontend/PWA:** Next.js 16 + React 19 + TypeScript + Tailwind CSS.
- **Hospedagem:** Vercel.
- **Backend de dados:** Supabase Postgres + Auth + PostgREST/RPC.
- **Fallback local:** `localStorage`, apenas para demonstração sem Supabase configurado.

## Dados de produção

O banco possui:

- `profiles`: conta/perfil do usuário e papel (`client`, `staff`, `admin`).
- `pets`: pets pertencentes ao usuário autenticado.
- `services`: serviços da clínica.
- `professionals`: veterinários/equipes/setores.
- `professional_services`: vínculo entre profissional e serviço.
- `availability_rules`: grade semanal e exceções por data.
- `appointments`: agendamentos.
- `products`: catálogo e estoque.
- `orders` e `order_items`: pedidos da loja.

## Segurança

A aplicação usa RLS no Supabase. Clientes só leem/alteram os próprios dados; rotinas administrativas dependem de papel `admin` ou `staff`. O papel não pode ser promovido pelo próprio cliente. A função de promoção por e-mail é destinada ao SQL Editor e não é liberada para `anon`/`authenticated`.

## Concorrência de agenda

Além da checagem de disponibilidade, existe índice único parcial em:

```text
(professional_id, appointment_date, appointment_time)
WHERE status <> 'cancelled'
```

Assim, mesmo que duas pessoas tentem confirmar a mesma vaga simultaneamente, o banco aceita somente uma. Quando o agendamento é cancelado, a vaga volta a ficar livre.

## Checkout

`place_order` executa a validação e a baixa de estoque em uma transação no banco. Os produtos são bloqueados durante a operação para impedir venda concorrente acima do estoque disponível.
