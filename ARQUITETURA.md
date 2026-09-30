# Arquitetura prevista — Oficina dos Bichos

## Frontend
- Next.js / React / TypeScript
- Tailwind CSS
- PWA mobile-first para clientes
- Dashboard responsivo para administração

## Módulos do MVP
1. Autenticação e tutores
2. Pets
3. Serviços
4. Profissionais/equipes
5. Disponibilidade e escalas
6. Agendamentos
7. Cancelamentos e status
8. Loja / catálogo / estoque
9. Carrinho e pedidos
10. Painel administrativo

## Regra de agenda
A unidade de conflito é o **profissional/equipe (resourceId)**.

- Mesmo profissional + mesma data + mesmo horário: bloqueado.
- Profissionais/equipes diferentes + mesmo horário: permitido.
- Status `Cancelado`: não ocupa horário.
- Disponibilidade específica de uma data tem prioridade sobre regra semanal.

## Estrutura sugerida no Supabase

- `profiles`
- `pets`
- `services`
- `professionals`
- `professional_services`
- `availability_rules`
- `appointments`
- `medical_records`
- `vaccines`
- `products`
- `orders`
- `order_items`

No banco real, deve existir uma proteção transacional/constraint para impedir reserva duplicada do mesmo profissional, data e horário enquanto o agendamento estiver ativo.

## Armazenamento
- V4: localStorage, somente para protótipo.
- Produção: Supabase PostgreSQL + Supabase Auth + Supabase Storage.
