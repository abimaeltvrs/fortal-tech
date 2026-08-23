import {
  offlineDB, getSyncQueue, removeQueueItem,
  cacheClientes, cacheAgendamentos, cacheOrdensServico, replaceLocalOSChildren
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

      if(item.entity==='ordens_servico'){
        if(item.action==='upsert_bundle'){
          const bundle=item.payload
          const osPayload=cleanPayload(bundle.os)
          const {data:osData,error:osError}=await supabase.from('ordens_servico')
            .upsert(osPayload,{onConflict:'id'}).select().single()
          if(osError) throw osError

          await supabase.from('os_sistemas').delete().eq('os_id',osData.id)
          await supabase.from('os_checklist').delete().eq('os_id',osData.id)
          await supabase.from('os_materiais').delete().eq('os_id',osData.id)

          if(bundle.sistemas?.length){
            const {error}=await supabase.from('os_sistemas').insert(bundle.sistemas.map(x=>({...x,os_id:osData.id})))
            if(error) throw error
          }
          if(bundle.checklist?.length){
            const {error}=await supabase.from('os_checklist').insert(bundle.checklist.map(x=>({...x,os_id:osData.id})))
            if(error) throw error
          }
          if(bundle.materiais?.length){
            const {error}=await supabase.from('os_materiais').insert(bundle.materiais.map(x=>({...x,os_id:osData.id})))
            if(error) throw error
          }

          await offlineDB.ordensServico.put({...osData,_syncStatus:'synced'})
          await replaceLocalOSChildren(osData.id,{
            sistemas:bundle.sistemas||[],
            checklist:bundle.checklist||[],
            materiais:bundle.materiais||[]
          })
        }
        if(item.action==='delete'){
          const {error}=await supabase.from('ordens_servico').delete().eq('id',item.payload.id)
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
    const [{data:clientes},{data:agenda},{data:osLista}]=await Promise.all([
      supabase.from('clientes').select('*').order('nome'),
      supabase.from('agendamentos').select('*').order('inicio'),
      supabase.from('ordens_servico').select('*').order('created_at',{ascending:false})
    ])
    if(clientes) await cacheClientes(clientes)
    if(agenda) await cacheAgendamentos(agenda)
    if(osLista) await cacheOrdensServico(osLista)

  }catch{}

  onStatus('synced')
  return {synced}
}
