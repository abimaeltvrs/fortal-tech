import {
  offlineDB, getSyncQueue, removeQueueItem,
  cacheClientes, cacheAgendamentos
} from './offline'

function cleanPayload(payload){
  const p={...payload}
  delete p._syncStatus
  delete p.cliente
  delete p.tecnico
  return p
}

export async function syncPendingChanges(supabase,onStatus=()=>{}){
  if(!supabase || !navigator.onLine) return {synced:0}
  const queue=await getSyncQueue()
  if(!queue.length){ onStatus('synced'); return {synced:0} }

  onStatus('syncing')
  let synced=0

  for(const item of queue){
    try{
      if(item.entity==='clientes'){
        if(item.action==='upsert'){
          const {data,error}=await supabase.from('clientes')
            .upsert(cleanPayload(item.payload),{onConflict:'id'}).select().single()
          if(error) throw error
          await offlineDB.clientes.put({...data,_syncStatus:'synced'})
        }
        if(item.action==='delete'){
          const {error}=await supabase.from('clientes').delete().eq('id',item.payload.id)
          if(error) throw error
        }
      }

      if(item.entity==='agendamentos'){
        if(item.action==='upsert'){
          const {data,error}=await supabase.from('agendamentos')
            .upsert(cleanPayload(item.payload),{onConflict:'id'}).select().single()
          if(error) throw error
          await offlineDB.agendamentos.put({...data,_syncStatus:'synced'})
        }
        if(item.action==='delete'){
          const {error}=await supabase.from('agendamentos').delete().eq('id',item.payload.id)
          if(error) throw error
        }
      }

      await removeQueueItem(item.queueId)
      synced++
    }catch(error){
      console.error('Erro de sincronização:',error)
      onStatus('pending')
      return {synced,error}
    }
  }

  try{
    const [{data:clientes},{data:agenda}]=await Promise.all([
      supabase.from('clientes').select('*').order('nome'),
      supabase.from('agendamentos').select('*').order('inicio')
    ])
    if(clientes) await cacheClientes(clientes)
    if(agenda) await cacheAgendamentos(agenda)
  }catch{}

  onStatus('synced')
  return {synced}
}
