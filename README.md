# FORTAL TECH V1.12.6 — Hotfix de salvamento da OS

Erro corrigido:
`Could not find the 'clientes' column of 'ordens_servico' in the schema cache`

Causa:
- a consulta da lista de OS usa relacionamento com `clientes`;
- ao abrir uma OS para edição, o objeto podia carregar também a propriedade auxiliar `clientes`;
- o salvamento anterior espalhava o objeto completo do formulário no payload;
- o Supabase recebia `clientes` como se fosse uma coluna da tabela `ordens_servico`.

Correção:
- o salvamento agora usa uma lista explícita de campos permitidos;
- somente colunas reais de `ordens_servico` são enviadas ao Supabase;
- campos de relacionamento/join nunca são enviados;
- rascunhos antigos são higienizados ao serem restaurados;
- a edição da OS também carrega apenas os campos editáveis.

Benefício:
Essa proteção evita erros semelhantes com propriedades auxiliares como:
- clientes;
- profiles;
- técnicos;
- sistemas;
- checklist;
- materiais;
- fotos;
- assinaturas.

Não há SQL novo.

O rascunho existente continua disponível.
