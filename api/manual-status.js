const OPENAI='https://api.openai.com/v1'
export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Método não permitido.'})
  try{
    const {vectorStoreId,fileId}=req.body||{}
    if(!vectorStoreId||!fileId)return res.status(400).json({error:'IDs não informados.'})
    const r=await fetch(`${OPENAI}/vector_stores/${vectorStoreId}/files`,{
      headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`}
    })
    const data=await r.json()
    if(!r.ok)throw new Error(data?.error?.message||'Falha ao consultar status.')
    const item=data.data?.find(x=>x.file_id===fileId)||data.data?.[0]
    return res.status(200).json({status:item?.status||'unknown'})
  }catch(e){
    return res.status(500).json({error:e.message})
  }
}
