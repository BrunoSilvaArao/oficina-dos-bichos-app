# Oficina dos Bichos — Web App / PWA — V5

Versão preparada para transformar o protótipo em um sistema com dados centralizados no **Supabase** e publicação no **Vercel**.

## O que está implementado

- Cadastro, login, logout e recuperação de senha via Supabase Auth.
- Perfil do cliente e cadastro de pets.
- Agendamento por serviço e profissional/equipe.
- Horários controlados pelo painel administrativo.
- Regras semanais e bloqueios por data específica.
- Proteção no banco contra dois agendamentos ativos para o mesmo profissional, data e horário.
- Cancelamento pelo cliente com liberação automática do horário.
- Painel administrativo de agenda e alteração de status.
- Cadastro/ativação de profissionais e equipes por setor.
- Loja Pet com catálogo, preço, estoque e visibilidade.
- Carrinho local e checkout transacional no banco, com baixa de estoque.
- PWA/manifest para instalação no celular.
- RLS (Row Level Security) para separar dados de clientes e administração.
- Modo demonstração local quando as variáveis do Supabase não estão configuradas.

## 1. Instalar e rodar

Requer Node.js 20+.

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## 2. Preparar o Supabase

No projeto escolhido do Supabase, execute o arquivo:

```text
supabase/migrations/20261002_production.sql
```

Ele cria as tabelas, índices, políticas de segurança, funções RPC e dados iniciais.

Depois copie `.env.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
NEXT_PUBLIC_CLINIC_WHATSAPP=5535999999999
```

Use apenas a chave pública/anon no frontend. **Nunca** coloque `service_role` em variável `NEXT_PUBLIC_*`.

## 3. Criar o administrador da clínica

1. Abra `/login` e crie a conta do responsável.
2. Confirme o e-mail, se a confirmação estiver habilitada no Supabase Auth.
3. No SQL Editor, edite e execute:

```text
supabase/SET_ADMIN.sql
```

Depois de novo login, a conta terá acesso ao painel `/admin`.

## 4. Configurações importantes do Supabase Auth

Em Authentication > URL Configuration, configure a URL publicada do sistema como **Site URL** e permita o endereço `/login` nos redirects. Isso é necessário para confirmação de cadastro e recuperação de senha.

## 5. Publicar no Vercel

No projeto do Vercel, adicione as mesmas variáveis de ambiente usadas no `.env.local` e faça um novo deploy. O projeto continua sendo um Next.js padrão, sem dependência de chave secreta no navegador.

## Estrutura principal

```text
src/app/                 telas e rotas Next.js
src/lib/backend.ts       camada de acesso a dados
src/lib/supabase-rest.ts autenticação e REST/RPC do Supabase
src/lib/storage.ts       fallback do modo demonstração
supabase/migrations/     banco, RLS, funções e dados iniciais
supabase/SET_ADMIN.sql   promoção da conta administrativa
```

## Observação de implantação

O código está pronto para apontar para um projeto Supabase. A migração deve ser aplicada **somente no projeto definitivo da clínica**, para evitar criar a estrutura na base errada.

## V6 — Agenda semanal e pedidos

Esta versão adiciona:
- expediente semanal por profissional/serviço, com repetição automática;
- exceções por data e bloqueio geral da clínica;
- cálculo dos horários pela duração de cada serviço;
- bloqueio por profissional, permitindo atendimentos paralelos por profissionais diferentes;
- reagendamento administrativo e liberação de horário ao cancelar;
- checkout com retirada ou entrega e endereço completo;
- painel administrativo de pedidos, itens, cliente, pagamento, recebimento e status.

A migração correspondente está em `supabase/V6_AGENDA_PEDIDOS.sql`.


## V7 - Mobile administrativo e notificações

- painel administrativo redesenhado para uso no celular;
- navegação inferior fixa no admin;
- agenda e produtos em cartões no mobile;
- central de notificações para cliente e clínica;
- notificações automáticas para novo agendamento, reagendamento, cancelamento e mudanças de status;
- notificações automáticas para novo pedido e mudanças de status do pedido;
- estrutura pronta para a próxima etapa de integração com WhatsApp Business API.
