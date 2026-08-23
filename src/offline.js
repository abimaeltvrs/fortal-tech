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
