export const OS_DB_FIELDS=[
  'id','numero','cliente_id','tipo_atendimento','prioridade','data_visita','status',
  'horario_chegada','horario_termino','tecnico_id','motivo','problema_relatado',
  'diagnostico','causa_identificada','servico_executado','pendencias','recomendacoes',
  'necessita_orcamento','condicao_final','observacoes','encerrada_em','created_at','updated_at'
]

export function sanitizeOSPayload(input={}){
  const out={}
  for(const key of OS_DB_FIELDS){
    if(Object.prototype.hasOwnProperty.call(input,key)) out[key]=input[key]
  }
  return out
}

export function stripRelationFields(input={}){
  const p={...input}
  for(const key of [
    '_syncStatus','cliente','clientes','tecnico','tecnicos','profiles',
    'os_sistemas','os_checklist','os_materiais','os_fotos','os_assinaturas'
  ]) delete p[key]
  return p
}
