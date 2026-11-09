// Atualize este arquivo a cada nova versão publicada.
export const APP_VERSION = '1.16.5'
export const RELEASE_NOTES = [
  {version:'1.16.5',date:'2026-11-09',title:'Backup operacional e restauração',changes:['Backup ZIP de clientes, OS, orçamentos, históricos e fotos.','Restauração com prévia, preservação de registros existentes e confirmação.','Alerta de armazenamento apenas a partir de 80% do banco.']},
  {version:'1.16.4',date:'2026-11-09',title:'Gerenciamento de armazenamento',changes:['Painel de consumo do Storage e banco em Configurações.','Backup ZIP de fotos e manuais com inventário.','Limpeza manual apenas de arquivos órfãos, após backup e confirmação.']},
  {version:'1.16.3',date:'2026-11-09',title:'Tipo de placa personalizado',changes:['Opção Outra permite digitar livremente o tipo de placa no orçamento eletrônico.','O tipo personalizado é preservado ao editar e aparece no PDF.']},
  {version:'1.16.2',date:'2026-11-09',title:'Técnico de Reparo Eletrônico',changes:['Novo perfil técnico especializado, com orçamentos e OS.','Permissões protegidas por políticas do Supabase; sem acesso financeiro ou administração.','Orçamentos de reparo podem ser aprovados sem criar lançamento financeiro automaticamente.']},
  {version:'1.16.1',date:'2026-11-09',title:'Orçamento de reparo eletrônico',changes:['Nova modalidade de orçamento para placas eletrônicas com diagnóstico e identificação.','Calculadora interna de custos e preço sugerido, com garantia informada no PDF.','Atalho Orçamentos substitui Agenda na barra inferior para administradores.']},
  {version:'1.16.0',date:'2026-11-09',title:'Contatos de clientes existentes',changes:['Botões Ligar e WhatsApp sempre visíveis para clientes antigos e novos.','Ao faltar telefone, o cadastro pode ser corrigido diretamente pela lista.','Melhor tratamento de números com DDD e prefixo zero.']},
  {version:'1.15.9',date:'2026-11-09',title:'Cadastro inteligente e WhatsApp',changes:['Consulta pública de CNPJ com preenchimento assistido de dados cadastrais.','Botão WhatsApp na lista e no perfil do cliente.','Validação do telefone e preservação dos dados já informados.']},
  {version:'1.15.8',date:'2026-10-09',title:'Correção dos textos do orçamento em PDF',changes:['Corrigido texto sobreposto ao cabeçalho.', 'Ajustadas quebras de linha e de página no PDF do orçamento.']},
  {version:'1.15.7',date:'2026-10-09',title:'Correção no salvamento de orçamentos',changes:['Corrigido envio indevido do relacionamento clientes ao Supabase.','Edição e recuperação de rascunhos preservam apenas os campos do orçamento.']},
  {version:'1.15.4',date:'2026-10-09',title:'OS em PDF com layout profissional',changes:['Novo cabeçalho e rodapé preto e dourado, com logo e contatos oficiais.','Novo destaque de identificação e status da OS.','Seções, tabelas e fotografias reorganizadas com controle de quebra de página.']},
  {version:'1.15.3',date:'2026-10-09',title:'Logo e contatos oficiais nos PDFs',changes:['Cabeçalho dos PDFs com a logomarca oficial FORTAL TECH.','Contato padronizado: fortaltech2026@gmail.com, (21) 98384-3349 e Fortaleza.','Mantida a paleta preto, grafite, dourado e branco.']},
  {version:'1.15.2',date:'2026-10-09',title:'PDFs profissionais',changes:['Identidade visual unificada em OS, Orçamentos, Relatórios e Histórico do Cliente.','Logo oficial, cabeçalhos grafite e dourado, e rodapés paginados.']},
  {version:'1.15.1',date:'2026-10-09',title:'Novidades e histórico de versões',changes:[
    'Notificações de atualizações do aplicativo com versão e resumo das mudanças.',
    'Histórico de versões disponível na Central de Notificações.',
    'Aviso de novidade exibido apenas uma vez por versão e usuário.'
  ]},
  {version:'1.15.0',date:'2026-10-09',title:'OS mais inteligentes',changes:[
    'Histórico de atendimentos anteriores ao selecionar um cliente.',
    'Duplicação de OS para agilizar atendimentos recorrentes.'
  ]},
  {version:'1.14.7',title:'Dashboard',changes:['Ajustes nas consultas e na atualização dos indicadores do Dashboard.']},
  {version:'1.14.6',title:'Carregamento animado',changes:['Animação da logo ao abrir e atualizar o aplicativo.']},
  {version:'1.14.5',title:'Orçamentos',changes:['Inclusão sequencial de materiais e serviços.']},
  {version:'1.14.4',title:'Orçamentos',changes:['Rolagem automática e campos numéricos vazios em novos itens.']}
]
