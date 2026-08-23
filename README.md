# FORTAL TECH V1.5.2

Correções:
- restaura e reforça a geração/download do PDF da OS;
- adiciona fallback de download caso `doc.save()` falhe no navegador/PWA;
- mensagem de sucesso ao gerar o PDF;
- erro técnico de PDF aparece no app se ainda houver falha.

Regra de atendimento corretivo:
- `Manutenção corretiva / diagnóstico` só aparece quando o tipo de atendimento for `Manutenção Corretiva`;
- nos demais tipos esse bloco não aparece e não precisa ser preenchido;
- a numeração das seções se ajusta automaticamente;
- o PDF também só inclui a seção corretiva quando a OS for realmente corretiva.

Não há SQL novo nesta versão.
