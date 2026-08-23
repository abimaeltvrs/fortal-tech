-- FORTAL TECH - Estrutura inicial do Supabase (V1)

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  perfil text not null default 'tecnico' check (perfil in ('admin','tecnico')),
  ativo boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  documento text,
  telefone text,
  email text,
  endereco text,
  cidade text,
  uf text,
  cep text,
  responsavel text,
  latitude numeric,
  longitude numeric,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists agendamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete cascade,
  tecnico_id uuid references profiles(id),
  os_id uuid,
  titulo text,
  tipo_atendimento text,
  prioridade text default 'media',
  sistema text,
  inicio timestamptz not null,
  fim_previsto timestamptz,
  status text default 'agendado',
  endereco_atendimento text,
  observacoes text,
  created_at timestamptz default now()
);

create table if not exists ordens_servico (
  id uuid primary key default gen_random_uuid(),
  numero text unique not null,
  cliente_id uuid references clientes(id),
  tecnico_id uuid references profiles(id),
  tipo_atendimento text,
  prioridade text,
  data_visita date,
  horario_chegada time,
  horario_termino time,
  motivo text,
  status text default 'aberta',
  diagnostico text,
  causa text,
  servico_executado text,
  resultado text,
  pendencias text,
  recomendacoes text,
  necessita_orcamento boolean default false,
  condicao_final text,
  encerrada_em timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table agendamentos
  add constraint agendamentos_os_fk
  foreign key (os_id) references ordens_servico(id) on delete set null;

create table if not exists os_sistemas (
  id uuid primary key default gen_random_uuid(),
  os_id uuid references ordens_servico(id) on delete cascade,
  sistema text not null
);

create table if not exists os_checklist (
  id uuid primary key default gen_random_uuid(),
  os_id uuid references ordens_servico(id) on delete cascade,
  sistema text not null,
  item text not null,
  status text check (status in ('ok','irregular','nao_aplicavel')),
  observacao text
);

create table if not exists os_materiais (
  id uuid primary key default gen_random_uuid(),
  os_id uuid references ordens_servico(id) on delete cascade,
  descricao text not null,
  quantidade numeric default 1
);

create table if not exists orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero text unique not null,
  cliente_id uuid references clientes(id),
  os_id uuid references ordens_servico(id),
  status text default 'elaboracao',
  validade date,
  desconto numeric default 0,
  total numeric default 0,
  observacoes text,
  created_at timestamptz default now()
);

create table if not exists orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid references orcamentos(id) on delete cascade,
  descricao text not null,
  quantidade numeric default 1,
  valor_unitario numeric default 0,
  tipo text default 'servico' check (tipo in ('servico','material'))
);

create table if not exists financeiro (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('entrada','saida')),
  descricao text not null,
  categoria text,
  cliente_id uuid references clientes(id),
  os_id uuid references ordens_servico(id),
  orcamento_id uuid references orcamentos(id),
  valor numeric not null default 0,
  vencimento date,
  pago boolean default false,
  pago_em date,
  forma_pagamento text,
  created_at timestamptz default now()
);

-- Segurança base (RLS)
alter table profiles enable row level security;
alter table clientes enable row level security;
alter table agendamentos enable row level security;
alter table ordens_servico enable row level security;
alter table os_sistemas enable row level security;
alter table os_checklist enable row level security;
alter table os_materiais enable row level security;
alter table orcamentos enable row level security;
alter table orcamento_itens enable row level security;
alter table financeiro enable row level security;

-- Observação: as policies definitivas serão criadas na próxima etapa
-- separando acesso de ADMIN e TÉCNICO.
