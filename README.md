# FORTAL TECH V1.13 — Agenda avançada

Melhorias:
- calendário mensal visual e clicável;
- contador de compromissos por dia;
- navegação entre meses;
- atalhos Dia / Semana / Mês;
- cards interativos:
  - Hoje;
  - Próximas 24h;
  - Atrasados;
  - Lembretes agora;
- filtros por:
  - status;
  - cliente;
  - sistema;
- destaque visual de compromisso atrasado;
- cores diferentes por status;
- endereço exibido diretamente no compromisso;
- vínculo opcional com uma OS;
- botão para abrir a OS relacionada;
- rota para atendimento;
- conclusão rápida;
- edição e exclusão;
- lembrete dentro do aplicativo;
- rascunho automático da Agenda;
- funcionamento offline/sincronização preservados.

Não há SQL novo: o campo `os_id` e os campos de lembrete já fazem parte da estrutura atual da Agenda.

Teste recomendado:
1. Crie um novo agendamento.
2. Vincule cliente + OS.
3. Ative lembrete de 15 minutos.
4. Atualize a página antes de salvar para testar o rascunho.
5. Salve e confirme o evento no calendário.
6. Toque no dia do calendário.
7. Use o botão da OS vinculada.
