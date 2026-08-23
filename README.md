# FORTAL TECH V1.5

Fechamento do fluxo técnico da Ordem de Serviço.

Inclui:
- fotos `Antes`, `Durante`, `Depois` e `Irregularidade`;
- câmera/galeria no celular;
- armazenamento das fotos no Supabase Storage;
- assinatura do responsável pelo cliente;
- nome e cargo do responsável;
- assinatura do técnico;
- botão `Finalizar OS`;
- para finalizar, exige assinatura do cliente e do técnico;
- conclusão registra horário e data/hora de encerramento;
- PDF da OS passa a incluir:
  - fotos;
  - assinatura do cliente;
  - assinatura do técnico;
  - aceite do serviço;
  - materiais e valores;
  - checklists e diagnóstico.

Offline:
- fotos e assinaturas podem ficar registradas localmente no aparelho.
- a sincronização estruturada da OS continua funcionando.
- o envio automático de mídias pendentes será reforçado em uma próxima revisão específica.

Antes de testar:
1. Execute `supabase/v1.5_fotos_assinaturas.sql`.
2. Atualize o GitHub.
3. Aguarde a Vercel ficar Ready.
