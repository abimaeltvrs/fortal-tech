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
      return res.status(413).json({error:'Este PDF ultrapassa 50 MB, limite usado pelo Assistente Técnico.'})
    }

    const prompt=[
      'Você é o Assistente Técnico da FORTAL TECH.',
      `Manual selecionado: ${fabricante||''} ${modelo||''} (${nomeArquivo||''}).`,
      'Analise SOMENTE o PDF fornecido para responder.',
      'Se a informação não estiver claramente presente, diga isso e não invente.',
      'Não invente códigos de erro, bornes, tensões, configurações, procedimentos, páginas ou figuras.',
      'Para procedimentos elétricos, alta tensão, cerca elétrica ou equipamento energizado, destaque cuidados de segurança presentes no manual.',
      'Se a pergunta pedir para MOSTRAR, LOCALIZAR, IDENTIFICAR VISUALMENTE, ver BORNES, LIGAÇÃO, DIAGRAMA, ESQUEMA, FIGURA ou COMPONENTE, procure obrigatoriamente no PDF uma página visualmente útil.',
      'Se houver uma imagem, desenho, tabela, diagrama, esquema elétrico ou figura útil, informe a página e o nome/número da figura quando conseguir identificá-los com segurança.',
      'Use como pagina o número da página do PDF que contém a melhor referência visual ou textual. Nunca invente.',
      'Se não houver referência visual relevante, retorne visual_relevante=false.',
      'Responda em português do Brasil, de forma objetiva e prática para um técnico de campo.',
      '',
      'RETORNE SOMENTE JSON VÁLIDO, SEM MARKDOWN, COM ESTA ESTRUTURA:',
      JSON.stringify({
        resumo:"resposta curta e direta",
        causa:"causa provável segundo o manual ou vazio",
        procedimento:["passo 1","passo 2"],
        atencao:["cuidado 1"],
        secao:"nome da seção do manual ou vazio",
        pagina:null,
        figura:"",
        visual_relevante:false,
        observacao:"informação adicional ou vazio"
      }),
      '',
      `Pergunta do técnico: ${question.trim()}`
    ].join('\n')

    const body={
      contents:[{
        role:'user',
        parts:[
          {
            inline_data:{
              mime_type:contentType.includes('pdf')?'application/pdf':contentType,
              data:bytes.toString('base64')
            }
          },
          {text:prompt}
        ]
      }],
      generationConfig:{
        temperature:0.1,
        maxOutputTokens:2200,
        responseMimeType:'application/json'
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
      throw new Error(data?.error?.message||`Gemini respondeu ${r.status}`)
    }

    const raw=(data.candidates?.[0]?.content?.parts||[])
      .map(p=>p.text||'')
      .filter(Boolean)
      .join('\n')
      .trim()

    if(!raw) throw new Error('O Gemini não retornou uma resposta para este manual.')

    let parsed
    try{
      parsed=JSON.parse(raw.replace(/^```json\s*/i,'').replace(/```$/,'').trim())
    }catch{
      parsed={
        resumo:raw,
        causa:'',
        procedimento:[],
        atencao:[],
        secao:'',
        pagina:null,
        figura:'',
        visual_relevante:false,
        observacao:''
      }
    }

    const pagina=Number.isFinite(Number(parsed.pagina)) && Number(parsed.pagina)>0
      ? Number(parsed.pagina)
      : null

    const visualIntent=/\b(mostre|mostrar|visual|imagem|figura|diagrama|esquema|borne|bornes|liga[cç][aã]o|onde fica|componente|conector|terminal)\b/i.test(question)
    const visualRelevante=Boolean(pagina && (parsed.visual_relevante || visualIntent))

    return res.status(200).json({
      resposta:{
        resumo:String(parsed.resumo||'').trim(),
        causa:String(parsed.causa||'').trim(),
        procedimento:Array.isArray(parsed.procedimento)?parsed.procedimento.filter(Boolean).map(String):[],
        atencao:Array.isArray(parsed.atencao)?parsed.atencao.filter(Boolean).map(String):[],
        secao:String(parsed.secao||'').trim(),
        pagina,
        figura:String(parsed.figura||'').trim(),
        visual_relevante:visualRelevante,
        observacao:String(parsed.observacao||'').trim()
      },
      source:`${fabricante||''} ${modelo||''}`.trim(),
      filename:nomeArquivo||'Manual técnico',
      model:'gemini-3.5-flash-lite'
    })
  }catch(e){
    console.error('Gemini manual chat:',e)
    return res.status(500).json({error:e.message||'Falha ao consultar o manual com Gemini.'})
  }
}
