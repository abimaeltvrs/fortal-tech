# FORTAL TECH V1.12.7 — Hotfix de Build

Correção do erro de compilação da V1.12.6/V1.12.5.

Erro da Vercel:
`src/Financeiro.jsx: Expected "as" but found "{"`

Causa:
- a importação de `drafts.js` foi inserida dentro do bloco de importação do `lucide-react`.

Correção:
- import do `lucide-react` restaurado;
- import de `drafts.js` movido para uma linha independente;
- funcionalidades da V1.12.6 mantidas, incluindo correção do payload da OS e rascunho automático.

Não há SQL novo.
