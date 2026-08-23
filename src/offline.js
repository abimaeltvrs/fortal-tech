import Dexie from 'dexie'
export const offlineDB = new Dexie('fortalTechOffline')
offlineDB.version(1).stores({
  clientes: 'id,nome,documento,telefone,email,updated_at,_syncStatus',
  syncQueue: '++queueId,entity,action,createdAt'
})
export async function cacheClientes(clientes=[]){
  await offlineDB.transaction('rw', offlineDB.clientes, async()=>{
    await offlineDB.clientes.clear()
    if(clientes.length) await offlineDB.clientes.bulkPut(clientes.map(c=>({...c,_syncStatus:'synced'})))
  })
}
export const getCachedClientes=()=>offlineDB.clientes.orderBy('nome').toArray()
export const saveLocalCliente=(c,status='pending')=>offlineDB.clientes.put({...c,_syncStatus:status})
export const removeLocalCliente=id=>offlineDB.clientes.delete(id)
export const queueChange=(entity,action,payload)=>offlineDB.syncQueue.add({entity,action,payload,createdAt:new Date().toISOString()})
export const getSyncQueue=()=>offlineDB.syncQueue.orderBy('queueId').toArray()
export const removeQueueItem=id=>offlineDB.syncQueue.delete(id)
