# FORTAL TECH V1.3.4

Melhorias na operação das Ordens de Serviço:

- `Data da visita` passa a ser obrigatória;
- `Horário de chegada` passa a ser obrigatório;
- ao criar uma OS, data e horário atual já vêm preenchidos;
- atualização rápida de status diretamente na lista de OS;
- não é necessário abrir a OS completa para mudar o status;
- status disponíveis:
  - Agendada
  - Em atendimento
  - Aguardando material
  - Aguardando orçamento
  - Concluída
  - Cancelada
- ao salvar como `Concluída`, o sistema registra automaticamente:
  - `horario_termino`
  - `encerrada_em`
- se uma OS concluída for reaberta para outro status, os campos de conclusão são limpos.

Não há SQL novo nesta versão.
