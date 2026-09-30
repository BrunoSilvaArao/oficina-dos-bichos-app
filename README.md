# Oficina dos Bichos — Web App / PWA — V4

Protótipo funcional em **Next.js + TypeScript + Tailwind CSS** para a Oficina dos Bichos.

## O que mudou na V4

- Cancelamento pelo cliente na própria agenda.
- Cancelamento no painel administrativo libera o horário automaticamente.
- Agenda por **profissional/equipe**, não mais um único horário global da clínica.
- Exemplo: Veterinário às 14:00 e Banho & Tosa às 14:00 podem coexistir quando usam recursos diferentes.
- Dois atendimentos do mesmo profissional/equipe no mesmo horário continuam bloqueados.
- Painel administrativo para cadastrar profissionais/equipes.
- Painel para configurar horários por data ou repetir semanalmente.
- Possibilidade de bloquear uma data inteira para um serviço/profissional.
- Painel administrativo da Loja Pet para cadastrar, editar, ocultar e excluir produtos.
- Cadastro de preço, estoque, categoria, descrição e foto/emoji do produto.
- Loja do cliente lê o catálogo configurado pelo administrador.
- Indicador de estoque e itens com estoque baixo no painel.

## Rotas principais

### Cliente
- `/` — início
- `/agenda` — calendário e agendamentos
- `/agenda/novo` — novo agendamento
- `/pets` — pets
- `/loja` — loja
- `/carrinho` — carrinho
- `/perfil` — perfil

### Administração
- `/admin` — dashboard
- `/admin/agenda` — agenda administrativa e status
- `/admin/horarios` — profissionais/equipes e disponibilidade
- `/admin/produtos` — produtos, preços e estoque

## Rodar no Windows

No terminal, dentro da pasta do projeto:

```powershell
npm.cmd install
npm.cmd run dev
```

Depois abra:

- Cliente: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

## Teste recomendado

1. Entre em `/admin/horarios`.
2. Escolha o Dr. John, serviço Veterinário, uma data e disponibilize 14:00.
3. Escolha a Equipe Banho & Tosa, a mesma data e também disponibilize 14:00.
4. No app do cliente, faça um atendimento veterinário às 14:00.
5. Faça outro Banho & Tosa às 14:00 — deve ser permitido.
6. Tente outro atendimento com o mesmo profissional/equipe às 14:00 — deve ficar ocupado.
7. Cancele o primeiro agendamento no cliente ou admin.
8. Volte a criar um agendamento com o mesmo profissional às 14:00 — o horário deve ter sido liberado.
9. Entre em `/admin/produtos`, cadastre um produto e depois confira em `/loja`.

## Importante sobre esta versão

A V4 ainda usa **localStorage** para demonstração. Isso significa que os dados ficam somente no navegador/computador atual.

Para uso real na clínica, a próxima etapa recomendada é conectar o sistema ao **Supabase/PostgreSQL**, com autenticação, perfis de acesso e bloqueio de concorrência no banco. Assim, cliente e clínica poderão usar dispositivos diferentes e o mesmo horário não poderá ser reservado simultaneamente por duas pessoas.

Fotos de produtos nesta versão também ficam no armazenamento local do navegador e são limitadas para demonstração. Na versão real, devem ser enviadas ao Supabase Storage.
