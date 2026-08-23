import React,{useEffect,useMemo,useRef,useState} from 'react'
import {BookOpen,Upload,Search,Trash2,FileText,MessageSquare,Send,ExternalLink,Loader2,CheckCircle2,Eraser,Image as ImageIcon,AlertTriangle,ChevronRight} from 'lucide-react'

export default function Manuais({supabase,profile}){
  const [lista,setLista]=useState([])
  const [busca,setBusca]=useState('')
  const [fabricante,setFabricante]=useState('')
  const [modelo,setModelo]=useState('')
  const [categoria,setCategoria]=useState('')
  const [arquivo,setArquivo]=useState(null)
  const [loading,setLoading]=useState(false)
  const [indexando,setIndexando]=useState(null)
  const [perguntando,setPerguntando]=useState(false)
  const [erro,setErro]=useState('')
  const [sucesso,setSucesso]=useState('')
  const [manualSelecionado,setManualSelecionado]=useState('')
  const [pergunta,setPergunta]=useState('')
  const initialMessages=[
    {role:'assistant',text:'Selecione um manual e faça sua pergunta. O Gemini vai analisar somente o PDF selecionado.'}
  ]
  const [mensagens,setMensagens]=useState(initialMessages)
  const inputRef=useRef(null)
  const chatEnd=useRef(null)
  const admin=profile?.perfil==='admin'

  async function carregar(){
    setLoading(true);setErro('')
    const {data,error}=await supabase.from('manuais_tecnicos').select('*').order('created_at',{ascending:false})
    if(error)setErro(error.message)
    else setLista(data||[])
    setLoading(false)
  }
  useEffect(()=>{carregar()},[])
  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:'smooth'})},[mensagens,perguntando])

  async function upload(e){
    e.preventDefault()
    if(!arquivo||!fabricante.trim()||!modelo.trim()){
      setErro('Preencha fabricante, modelo e selecione o PDF.')
      return
    }
    setLoading(true);setErro('');setSucesso('')
    try{
      if((arquivo.name.split('.').pop()||'').toLowerCase()!=='pdf')throw new Error('Envie um arquivo PDF.')
      const path=`${Date.now()}_${crypto.randomUUID()}.pdf`
      const {error:upErr}=await supabase.storage.from('manuais-tecnicos').upload(path,arquivo,{contentType:'application/pdf'})
      if(upErr)throw upErr
      const {data,error:dbErr}=await supabase.from('manuais_tecnicos').insert({
        fabricante:fabricante.trim(),modelo:modelo.trim(),categoria:categoria.trim()||null,
        nome_arquivo:arquivo.name,arquivo_path:path,status_indexacao:'pronto'
      }).select().single()
      if(dbErr)throw dbErr
      setFabricante('');setModelo('');setCategoria('');setArquivo(null)
      if(inputRef.current)inputRef.current.value=''
      setSucesso('Manual enviado e pronto para consultas com Gemini.')
      await carregar()
      setManualSelecionado(data.id)
    }catch(e){setErro(e.message||'Falha ao enviar manual.')}
    finally{setLoading(false)}
  }

  async function signed(m){
    const {data,error}=await supabase.storage.from('manuais-tecnicos').createSignedUrl(m.arquivo_path,600)
    if(error)throw error
    return data.signedUrl
  }

  async function abrir(m){
    try{window.open(await signed(m),'_blank','noopener,noreferrer')}
    catch(e){setErro(e.message)}
  }


  async function excluir(m){
    if(!confirm(`Excluir o manual ${m.fabricante} ${m.modelo}?`))return
    const {error}=await supabase.from('manuais_tecnicos').delete().eq('id',m.id)
    if(error){setErro(error.message);return}
    await supabase.storage.from('manuais-tecnicos').remove([m.arquivo_path])
    if(manualSelecionado===m.id)setManualSelecionado('')
    carregar()
  }

  async function perguntar(e){
    e.preventDefault()
    const q=pergunta.trim()
    const m=lista.find(x=>x.id===manualSelecionado)
    if(!q)return
    if(!m){setErro('Selecione um manual.');return}
    if(!m.arquivo_path){
      setErro('Este manual não possui um PDF disponível para consulta.');return
    }
    setErro('')
    setPergunta('')
    setMensagens(x=>[...x,{role:'user',text:q}])
    setPerguntando(true)
    try{
      const signedUrl=await signed(m)
      const r=await fetch('/api/gemini-manual-chat',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          question:q,signedUrl,
          fabricante:m.fabricante,modelo:m.modelo,nomeArquivo:m.nome_arquivo
        })
      })
      const data=await r.json()
      if(!r.ok)throw new Error(data.error||'Falha na consulta.')
      const r=data.resposta||{}
      setMensagens(x=>[...x,{
        role:'assistant',
        structured:true,
        resumo:r.resumo||'',
        causa:r.causa||'',
        procedimento:r.procedimento||[],
        atencao:r.atencao||[],
        secao:r.secao||'',
        pagina:r.pagina||null,
        figura:r.figura||'',
        visual_relevante:Boolean(r.visual_relevante),
        observacao:r.observacao||'',
        source:`${m.fabricante} ${m.modelo} • ${m.nome_arquivo}`,
        manualId:m.id
      }])
    }catch(e){
      setMensagens(x=>[...x,{role:'assistant',text:`Não consegui consultar o manual agora: ${e.message}`}])
    }finally{setPerguntando(false)}
  }


  function limparConversa(){
    setMensagens([...initialMessages])
    setErro('')
    setSucesso('')
  }

  async function abrirReferenciaVisual(msg){
    const manual=lista.find(x=>x.id===msg.manualId)
    if(!manual)return
    try{
      const url=await signed(manual)
      const page=msg.pagina?`#page=${msg.pagina}`:''
      window.open(`${url}${page}`,'_blank','noopener,noreferrer')
    }catch(e){
      setErro(`Não foi possível abrir a referência visual: ${e.message}`)
    }
  }

  const filtrados=useMemo(()=>{
    const q=busca.toLowerCase().trim()
    if(!q)return lista
    return lista.filter(m=>[m.fabricante,m.modelo,m.categoria,m.nome_arquivo].filter(Boolean).join(' ').toLowerCase().includes(q))
  },[lista,busca])

  const selected=lista.find(x=>x.id===manualSelecionado)

  return <>
    <div className="toolbar">
      <div><h2>Manuais / Assistente Técnico</h2><p>Consulte os manuais dos fabricantes com Gemini, usando o próprio PDF como fonte.</p></div>
    </div>
    {erro&&<div className="warningBox">{erro}</div>}
    {sucesso&&<div className="successBox">{sucesso}</div>}

    {admin&&<section className="panel manualUpload">
      <h3>Adicionar manual</h3>
      <form onSubmit={upload}>
        <input placeholder="Fabricante *" value={fabricante} onChange={e=>setFabricante(e.target.value)}/>
        <input placeholder="Modelo / equipamento *" value={modelo} onChange={e=>setModelo(e.target.value)}/>
        <input placeholder="Categoria (ex.: Cancela)" value={categoria} onChange={e=>setCategoria(e.target.value)}/>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={e=>setArquivo(e.target.files?.[0]||null)}/>
        <button className="primary" disabled={loading}><Upload size={16}/> {loading?'Enviando...':'Enviar PDF'}</button>
      </form>
    </section>}

    <div className="manualLayout">
      <section className="panel manualLibrary">
        <h3>Biblioteca de manuais</h3>
        <div className="searchBar"><Search size={17}/><input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar fabricante, modelo..."/></div>
        <div className="manualList">
          {filtrados.length===0?<div className="emptySmall"><BookOpen size={34}/><b>Nenhum manual cadastrado</b></div>:
          filtrados.map(m=><div className={`manualCard ${manualSelecionado===m.id?'selected':''}`} key={m.id} onClick={()=>setManualSelecionado(m.id)}>
            <FileText size={21}/>
            <div className="manualMeta">
              <b>{m.fabricante} • {m.modelo}</b>
              <span>{m.categoria||'Manual técnico'}</span>
              <small>{m.nome_arquivo}</small>
              <em className="indexStatus st-pronto"><CheckCircle2 size={11}/> Pronto para Gemini</em>
            </div>
            <div className="manualCardActions" onClick={e=>e.stopPropagation()}>
              <button title="Abrir PDF" onClick={()=>abrir(m)}><ExternalLink size={15}/></button>
              {admin&&<button title="Excluir" onClick={()=>excluir(m)}><Trash2 size={15}/></button>}
            </div>
          </div>)}
        </div>
      </section>

      <section className="panel manualChat">
        <div className="manualChatHead">
          <MessageSquare size={18}/>
          <div className="manualChatTitle"><h3>Assistente Técnico</h3><span>{selected?`${selected.fabricante} ${selected.modelo} • Gemini`:'Selecione um manual'}</span></div>
          <button type="button" className="clearChatBtn" onClick={limparConversa} title="Limpar conversa"><Eraser size={15}/> Limpar</button>
        </div>
        <div className="chatMessages">
          {mensagens.map((m,i)=><div key={i} className={`chatBubble ${m.role} ${m.structured?'structuredAnswer':''}`}>
            {!m.structured&&<div>{m.text}</div>}

            {m.structured&&<>
              {m.resumo&&<div className="answerBlock answerSummary">
                <b>Resposta</b>
                <p>{m.resumo}</p>
              </div>}

              {m.causa&&<div className="answerBlock">
                <b>Causa</b>
                <p>{m.causa}</p>
              </div>}

              {m.procedimento?.length>0&&<div className="answerBlock">
                <b>Procedimento</b>
                <ol>{m.procedimento.map((x,n)=><li key={n}>{x}</li>)}</ol>
              </div>}

              {m.atencao?.length>0&&<div className="answerBlock warningAnswer">
                <b><AlertTriangle size={13}/> Atenção</b>
                <ul>{m.atencao.map((x,n)=><li key={n}>{x}</li>)}</ul>
              </div>}

              {m.observacao&&<div className="answerBlock">
                <b>Observação</b>
                <p>{m.observacao}</p>
              </div>}

              <div className="answerSource">
                <span>Fonte</span>
                <b>{m.source}</b>
                {m.secao&&<em>Seção: {m.secao}</em>}
                {m.pagina&&<em>Página: {m.pagina}</em>}
                {m.figura&&<em>Figura/diagrama: {m.figura}</em>}
              </div>

              {m.visual_relevante&&m.pagina&&<button type="button" className="visualReferenceBtn" onClick={()=>abrirReferenciaVisual(m)}>
                <ImageIcon size={17}/>
                <div><b>Abrir referência visual</b><span>Ver página {m.pagina} do manual{m.figura?` • ${m.figura}`:''}</span></div>
                <ChevronRight size={16}/>
              </button>}
            </>}
            {!m.structured&&m.source&&<small>{m.source}</small>}
          </div>)}
          {perguntando&&<div className="chatBubble assistant typing"><Loader2 className="spin" size={15}/> Consultando o manual...</div>}
          <div ref={chatEnd}/>
        </div>
        <form className="manualAsk" onSubmit={perguntar}>
          <input disabled={perguntando} value={pergunta} onChange={e=>setPergunta(e.target.value)} placeholder="Ex.: O que significa o erro E9?"/>
          <button className="primary" disabled={perguntando||!selected}><Send size={16}/></button>
        </form>
        <div className="aiSetupNotice">O Gemini analisa somente o PDF selecionado. Para procedimentos críticos, confirme a orientação diretamente no manual.</div>
      </section>
    </div>
  </>
}
