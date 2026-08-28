const PREFIX='fortaltech:draft:'

export function saveDraft(key,data){
  try{
    localStorage.setItem(PREFIX+key,JSON.stringify({
      saved_at:new Date().toISOString(),
      data
    }))
    return true
  }catch{
    return false
  }
}

export function loadDraft(key){
  try{
    const raw=localStorage.getItem(PREFIX+key)
    if(!raw)return null
    const parsed=JSON.parse(raw)
    return parsed&&parsed.data!==undefined?parsed:null
  }catch{
    return null
  }
}

export function clearDraft(key){
  try{localStorage.removeItem(PREFIX+key)}catch{}
}

export function draftAgeLabel(iso){
  if(!iso)return ''
  const ms=Date.now()-new Date(iso).getTime()
  if(!Number.isFinite(ms)||ms<0)return ''
  const min=Math.floor(ms/60000)
  if(min<1)return 'agora'
  if(min<60)return `há ${min} min`
  const h=Math.floor(min/60)
  if(h<24)return `há ${h}h`
  const d=Math.floor(h/24)
  return `há ${d} dia${d>1?'s':''}`
}
