const OPENAI='https://api.openai.com/v1'

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Método não permitido.'})
  if(!process.env.OPENAI_API_KEY)return res.status(500).json({error:'OPENAI_API_KEY não configurada.'})

  try{
    const {question,vectorStoreId,fabricante,modelo,nomeArquivo}=req.body||{}
    if(!question?.trim())return res.status(400).json({error:'Pergunta vazia.'})
    if(!vectorStoreId)return res.status(400).json({error:'Manual ainda não indexado.'})

    const instructions=[
      'Você é o Assistente Técnico da FORTAL TECH.',
      'Responda SOMENTE com base no conteúdo recuperado do manual técnico selecionado.',
      'Se o manual não trouxer informação suficiente, diga claramente que não encontrou essa informação no manual.',
      'Não invente valores, bornes, códigos, procedimentos ou configurações.',
      'Para procedimentos envolvendo eletricidade, alta tensão, cercas elétricas ou equipamentos energizados, destaque cuidados de segurança quando o manual trouxer essa orientação.',
      `Manual selecionado: ${fabricante||''} ${modelo||''} (${nomeArquivo||''}).`,
      'Responda em português do Brasil, de forma prática para um técnico de campo.'
    ].join('\n')

    const r=await fetch(`${OPENAI}/responses`,{
      method:'POST',
      headers:{
        Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        model:'gpt-5.6-luna',
        instructions,
        input:question.trim(),
        tools:[{
          type:'file_search',
          vector_store_ids:[vectorStoreId],
          max_num_results:6
        }],
        include:['file_search_call.results']
      })
    })

    const data=await r.json()
    if(!r.ok)throw new Error(data?.error?.message||`OpenAI respondeu ${r.status}`)

    let answer=data.output_text||''
    if(!answer){
      const msg=(data.output||[]).find(x=>x.type==='message')
      const out=msg?.content?.find(x=>x.type==='output_text')
      answer=out?.text||'Não encontrei uma resposta no manual.'
    }

    const citations=[]
    for(const item of data.output||[]){
      if(item.type!=='message')continue
      for(const c of item.content||[]){
        for(const a of c.annotations||[]){
          if(a.type==='file_citation'){
            citations.push({
              file_id:a.file_id||'',
              filename:a.filename||nomeArquivo||'Manual técnico'
            })
          }
        }
      }
    }

    const unique=[...new Map(citations.map(x=>[`${x.file_id}-${x.filename}`,x])).values()]

    return res.status(200).json({
      answer,
      citations:unique,
      manual:`${fabricante||''} ${modelo||''}`.trim()
    })
  }catch(e){
    console.error(e)
    return res.status(500).json({error:e.message||'Falha ao consultar o assistente.'})
  }
}
