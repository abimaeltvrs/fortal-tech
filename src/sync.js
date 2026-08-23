import { offlineDB, getSyncQueue, removeQueueItem, cacheClientes } from './offline'
export async function syncPendingChanges(supabase,onStatus=()=>{}){
  if(!supabase || !navigator.onLine) return {synced:0}
  const queue=await getSyncQueue()
  if(!queue.length){onStatus('synced');return {synced:0}}
  onStatus('syncing')
  let synced=0
  for(const item of queue){
    try{
      if(item.entity==='clientes'){
        if(item.action==='upsert'){
          const payload={...item.payload}; delete payload._syncStatus
          const {data,error}=await supabase.from('clientes').upsert(payload,{onConflict:'id'}).select().single()
          if(error) throw error
          await offlineDB.clientes.put({...data,_syncStatus:'synced'})
        }
        if(item.action==='delete'){
          const {error}=await supabase.from('clientes').delete().eq('id',item.payload.id)
          if(error) throw error
        }
      }
      await removeQueueItem(item.queueId); synced++
    }catch(error){console.error(error);onStatus('pending');return {synced,error}}
  }
  const {data}=await supabase.from('clientes').select('*').order('nome')
  if(data) await cacheClientes(data)
  onStatus('synced'); return {synced}
}
