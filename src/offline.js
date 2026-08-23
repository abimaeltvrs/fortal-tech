import Dexie from 'dexie'

export const offlineDB = new Dexie('fortalTechOffline')

offlineDB.version(1).stores({
  clientes: 'id,nome,documento,telefone,email,updated_at,_syncStatus',
  syncQueue: '++queueId,entity,action,createdAt'
})

offlineDB.version(2).stores({
  clientes: 'id,nome,documento,telefone,email,updated_at,_syncStatus',
  agendamentos: 'id,cliente_id,tecnico_id,inicio,status,_syncStatus',
  syncQueue: '++queueId,entity,action,createdAt'
})

offlineDB.version(3).stores({
  clientes: 'id,nome,documento,telefone,email,updated_at,_syncStatus',
  agendamentos: 'id,cliente_id,tecnico_id,inicio,status,_syncStatus',
  ordensServico: 'id,numero,cliente_id,tecnico_id,status,data_visita,updated_at,_syncStatus',
  osSistemas: 'id,os_id,sistema',
  osChecklist: 'id,os_id,sistema,grupo,status',
  osMateriais: 'id,os_id,descricao',
  syncQueue: '++queueId,entity,action,createdAt'
})

export async function cacheClientes(clientes = []) {
  await offlineDB.transaction('rw', offlineDB.clientes, async () => {
    for (const c of clientes) await offlineDB.clientes.put({...c,_syncStatus:'synced'})
  })
}
export async function getCachedClientes(){ return offlineDB.clientes.orderBy('nome').toArray() }
export async function saveLocalCliente(c,status='pending'){ return offlineDB.clientes.put({...c,_syncStatus:status}) }
export async function removeLocalCliente(id){ return offlineDB.clientes.delete(id) }

export async function cacheAgendamentos(lista = []) {
  await offlineDB.transaction('rw', offlineDB.agendamentos, async () => {
    for (const a of lista) await offlineDB.agendamentos.put({...a,_syncStatus:'synced'})
  })
}
export async function getCachedAgendamentos(){ return offlineDB.agendamentos.orderBy('inicio').toArray() }
export async function saveLocalAgendamento(a,status='pending'){ return offlineDB.agendamentos.put({...a,_syncStatus:status}) }
export async function removeLocalAgendamento(id){ return offlineDB.agendamentos.delete(id) }

export async function queueChange(entity,action,payload){
  return offlineDB.syncQueue.add({entity,action,payload,createdAt:new Date().toISOString()})
}
export async function getSyncQueue(){ return offlineDB.syncQueue.orderBy('queueId').toArray() }
export async function removeQueueItem(id){ return offlineDB.syncQueue.delete(id) }

export async function cacheOrdensServico(lista=[]){
  await offlineDB.transaction('rw', offlineDB.ordensServico, async()=>{
    for(const x of lista) await offlineDB.ordensServico.put({...x,_syncStatus:'synced'})
  })
}
export async function getCachedOrdensServico(){ return offlineDB.ordensServico.orderBy('created_at').reverse().toArray() }
export async function saveLocalOS(x,status='pending'){ return offlineDB.ordensServico.put({...x,_syncStatus:status}) }
export async function removeLocalOS(id){ return offlineDB.ordensServico.delete(id) }

export async function replaceLocalOSChildren(osId,{sistemas=[],checklist=[],materiais=[]}={}){
  await offlineDB.transaction('rw',offlineDB.osSistemas,offlineDB.osChecklist,offlineDB.osMateriais,async()=>{
    await offlineDB.osSistemas.where('os_id').equals(osId).delete()
    await offlineDB.osChecklist.where('os_id').equals(osId).delete()
    await offlineDB.osMateriais.where('os_id').equals(osId).delete()
    if(sistemas.length) await offlineDB.osSistemas.bulkPut(sistemas)
    if(checklist.length) await offlineDB.osChecklist.bulkPut(checklist)
    if(materiais.length) await offlineDB.osMateriais.bulkPut(materiais)
  })
}

export async function getLocalOSChildren(osId){
  const [sistemas,checklist,materiais]=await Promise.all([
    offlineDB.osSistemas.where('os_id').equals(osId).toArray(),
    offlineDB.osChecklist.where('os_id').equals(osId).toArray(),
    offlineDB.osMateriais.where('os_id').equals(osId).toArray()
  ])
  return {sistemas,checklist,materiais}
}
