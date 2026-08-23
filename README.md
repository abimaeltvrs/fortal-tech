# FORTAL TECH V1.3.2

Hotfix de salvamento da Ordem de Serviço.

Correção:
- campos `horario_chegada` e `horario_termino` vazios agora são enviados como `null`;
- `data_visita` vazia também passa a ser enviada como `null`;
- evita o erro `invalid input syntax for type time`.

Não é necessário executar SQL nesta versão.
