const OPENAI='https://api.openai.com/v1'

async function oa(path,options={}){
  const headers={Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,...(options.headers||{})}
  const r=await fetch(`${OPENAI}${path}`,{...options,headers})
  const data=await r.json().catch(()=>({}))
  if(!r.ok) throw new Error(data?.error?.message||`OpenAI respondeu ${r.status}`)
  return data
}

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Método não permitido.'})
  if(!process.env.OPENAI_API_KEY)return res.status(500).json({error:'OPENAI_API_KEY não configurada na Vercel.'})

  try{
    const {signedUrl,filename,fabricante,modelo}=req.body||{}
    if(!signedUrl||!filename)return res.status(400).json({error:'PDF não informado.'})

    const pdf=await fetch(signedUrl)
    if(!pdf.ok)throw new Error(`Não foi possível baixar o PDF do Supabase (${pdf.status}).`)
    const blob=await pdf.blob()

    const fd=new FormData()
    fd.append('purpose','assistants')
    fd.append('file',new File([blob],filename,{type:'application/pdf'}))

    const file=await oa('/files',{method:'POST',body:fd})

    const store=await oa('/vector_stores',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:`FORTAL TECH - ${fabricante||''} ${modelo||filename}`.slice(0,120)})
    })

    await oa(`/vector_stores/${store.id}/files`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({file_id:file.id})
    })

    let status='in_progress'
    let last=null
    for(let i=0;i<20;i++){
      await new Promise(r=>setTimeout(r,1200))
      last=await oa(`/vector_stores/${store.id}/files`)
      const item=last.data?.find(x=>x.file_id===file.id)||last.data?.[0]
      status=item?.status||status
      if(status==='completed')break
      if(status==='failed'||status==='cancelled')throw new Error(`Falha na indexação: ${status}`)
    }

    if(status!=='completed'){
      return res.status(202).json({
        ok:true,
        pending:true,
        openai_file_id:file.id,
        vector_store_id:store.id,
        status
      })
    }

    return res.status(200).json({
      ok:true,
      openai_file_id:file.id,
      vector_store_id:store.id,
      status:'completed'
    })
  }catch(e){
    console.error(e)
    return res.status(500).json({error:e.message||'Falha ao indexar o manual.'})
  }
}
