export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Método não permitido.'})
  if(!process.env.GEMINI_API_KEY) return res.status(500).json({error:'GEMINI_API_KEY não configurada na Vercel.'})

  try{
    const {question,signedUrl,fabricante,modelo,nomeArquivo}=req.body||{}
    if(!question?.trim()) return res.status(400).json({error:'Pergunta vazia.'})
    if(!signedUrl) return res.status(400).json({error:'Manual não informado.'})

    const pdfResponse=await fetch(signedUrl)
    if(!pdfResponse.ok) throw new Error(`Não foi possível abrir o PDF no Supabase (${pdfResponse.status}).`)

    const contentType=pdfResponse.headers.get('content-type')||'application/pdf'
    const bytes=Buffer.from(await pdfResponse.arrayBuffer())

    if(bytes.length>50*1024*1024){
      return res.status(413).json({error:'Este PDF ultrapassa 50 MB, limite usado pelo assistente Gemini.'})
    }

    const prompt=[
      'Você é o Assistente Técnico da FORTAL TECH.',
      `Manual selecionado: ${fabricante||''} ${modelo||''} (${nomeArquivo||''}).`,
      'Analise SOMENTE o PDF fornecido para responder.',
      'Se a resposta não estiver claramente presente no manual, diga: "Não encontrei essa informação neste manual."',
      'Não invente códigos de erro, bornes, tensões, configurações, procedimentos ou especificações.',
      'Quando possível, cite a seção/título do manual que embasa a resposta.',
      'Se conseguir identificar com segurança o número da página no conteúdo do documento, informe a página; caso contrário, não invente número de página.',
      'Para procedimentos elétricos, alta tensão, cerca elétrica ou equipamento energizado, inclua os cuidados de segurança descritos no manual.',
      'Responda em português do Brasil, de forma objetiva e prática para um técnico de campo.',
      '',
      `Pergunta do técnico: ${question.trim()}`
    ].join('\n')

    const body={
      contents:[{
        role:'user',
        parts:[
          {inline_data:{mime_type:contentType.includes('pdf')?'application/pdf':contentType,data:bytes.toString('base64')}},
          {text:prompt}
        ]
      }],
      generationConfig:{
        temperature:0.15,
        maxOutputTokens:1800
      }
    }

    const url=`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`
    const r=await fetch(url,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body)
    })
    const data=await r.json().catch(()=>({}))
    if(!r.ok){
      const msg=data?.error?.message||`Gemini respondeu ${r.status}`
      throw new Error(msg)
    }

    const answer=(data.candidates?.[0]?.content?.parts||[])
      .map(p=>p.text||'')
      .filter(Boolean)
      .join('\n')
      .trim()

    if(!answer) throw new Error('O Gemini não retornou uma resposta para este manual.')

    return res.status(200).json({
      answer,
      source:`${fabricante||''} ${modelo||''}`.trim(),
      filename:nomeArquivo||'Manual técnico',
      model:'gemini-3.5-flash-lite'
    })
  }catch(e){
    console.error('Gemini manual chat:',e)
    return res.status(500).json({error:e.message||'Falha ao consultar o manual com Gemini.'})
  }
}
