import React,{useEffect,useMemo,useRef,useState} from 'react'
import {BookOpen,Upload,Search,Trash2,FileText,MessageSquare,Send,ExternalLink,Loader2,BrainCircuit,CheckCircle2,RefreshCcw} from 'lucide-react'

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
  const [mensagens,setMensagens]=useState([
    {role:'assistant',text:'Selecione um manual com status Pronto e faça sua pergunta. Eu vou pesquisar somente naquele documento.'}
  ])
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
        nome_arquivo:arquivo.name,arquivo_path:path,status_indexacao:'pendente'
      }).select().single()
      if(dbErr)throw dbErr
      setFabricante('');setModelo('');setCategoria('');setArquivo(null)
      if(inputRef.current)inputRef.current.value=''
      setSucesso('Manual enviado. Agora toque em “Indexar IA”.')
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

  async function indexar(m){
    setIndexando(m.id);setErro('');setSucesso('')
    try{
      await supabase.from('manuais_tecnicos').update({status_indexacao:'processando'}).eq('id',m.id)
      setLista(x=>x.map(i=>i.id===m.id?{...i,status_indexacao:'processando'}:i))
      const signedUrl=await signed(m)
      const r=await fetch('/api/index-manual',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({signedUrl,filename:m.nome_arquivo,fabricante:m.fabricante,modelo:m.modelo})
      })
      const data=await r.json()
      if(!r.ok)throw new Error(data.error||'Falha na indexação.')

      let status=data.status
      if(data.pending){
        for(let i=0;i<15&&status!=='completed';i++){
          await new Promise(resolve=>setTimeout(resolve,1500))
          const sr=await fetch('/api/manual-status',{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({vectorStoreId:data.vector_store_id,fileId:data.openai_file_id})
          })
          const sd=await sr.json()
          if(!sr.ok)throw new Error(sd.error||'Falha ao consultar indexação.')
          status=sd.status
          if(status==='failed'||status==='cancelled')throw new Error(`Indexação terminou como ${status}.`)
        }
      }

      const pronto=status==='completed'
      const {error}=await supabase.from('manuais_tecnicos').update({
        openai_file_id:data.openai_file_id,
        vector_store_id:data.vector_store_id,
        status_indexacao:pronto?'pronto':'processando',
        indexado_em:pronto?new Date().toISOString():null
      }).eq('id',m.id)
      if(error)throw error
      await carregar()
      setSucesso(pronto?'Manual indexado. O Assistente Técnico já pode consultá-lo.':'Manual enviado para indexação. Tente atualizar o status em alguns instantes.')
    }catch(e){
      await supabase.from('manuais_tecnicos').update({status_indexacao:'erro'}).eq('id',m.id)
      await carregar()
      setErro(`Não foi possível indexar o manual: ${e.message}`)
    }finally{setIndexando(null)}
  }

  async function verificarStatus(m){
    if(!m.vector_store_id||!m.openai_file_id)return indexar(m)
    setIndexando(m.id)
    try{
      const r=await fetch('/api/manual-status',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({vectorStoreId:m.vector_store_id,fileId:m.openai_file_id})
      })
      const data=await r.json()
      if(!r.ok)throw new Error(data.error)
      const status=data.status==='completed'?'pronto':data.status
      await supabase.from('manuais_tecnicos').update({
        status_indexacao:status,indexado_em:status==='pronto'?new Date().toISOString():m.indexado_em
      }).eq('id',m.id)
      await carregar()
    }catch(e){setErro(e.message)}
    finally{setIndexando(null)}
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
    if(m.status_indexacao!=='pronto'||!m.vector_store_id){
      setErro('Este manual ainda não está pronto para consultas. Use “Indexar IA”.');return
    }
    setErro('')
    setPergunta('')
    setMensagens(x=>[...x,{role:'user',text:q}])
    setPerguntando(true)
    try{
      const r=await fetch('/api/manual-chat',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          question:q,vectorStoreId:m.vector_store_id,
          fabricante:m.fabricante,modelo:m.modelo,nomeArquivo:m.nome_arquivo
        })
      })
      const data=await r.json()
      if(!r.ok)throw new Error(data.error||'Falha na consulta.')
      setMensagens(x=>[...x,{
        role:'assistant',text:data.answer,
        source:`Fonte: ${m.fabricante} ${m.modelo} • ${m.nome_arquivo}`
      }])
    }catch(e){
      setMensagens(x=>[...x,{role:'assistant',text:`Não consegui consultar o manual agora: ${e.message}`}])
    }finally{setPerguntando(false)}
  }

  const filtrados=useMemo(()=>{
    const q=busca.toLowerCase().trim()
    if(!q)return lista
    return lista.filter(m=>[m.fabricante,m.modelo,m.categoria,m.nome_arquivo].filter(Boolean).join(' ').toLowerCase().includes(q))
  },[lista,busca])

  const selected=lista.find(x=>x.id===manualSelecionado)

  return <>
    <div className="toolbar">
      <div><h2>Manuais / Assistente Técnico</h2><p>Consulte os manuais dos fabricantes usando inteligência artificial.</p></div>
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
              <em className={`indexStatus st-${m.status_indexacao}`}>
                {m.status_indexacao==='pronto'?<><CheckCircle2 size={11}/> Pronto para IA</>:
                 m.status_indexacao==='processando'?<><Loader2 className="spin" size={11}/> Indexando</>:
                 m.status_indexacao==='erro'?'Erro na indexação':'Aguardando indexação'}
              </em>
            </div>
            <div className="manualCardActions" onClick={e=>e.stopPropagation()}>
              <button title="Abrir PDF" onClick={()=>abrir(m)}><ExternalLink size={15}/></button>
              {admin&&m.status_indexacao!=='pronto'&&<button title="Indexar IA" disabled={indexando===m.id} onClick={()=>m.status_indexacao==='processando'&&m.vector_store_id?verificarStatus(m):indexar(m)}><BrainCircuit size={15}/></button>}
              {admin&&<button title="Excluir" onClick={()=>excluir(m)}><Trash2 size={15}/></button>}
            </div>
          </div>)}
        </div>
      </section>

      <section className="panel manualChat">
        <div className="manualChatHead"><MessageSquare size={18}/><div><h3>Assistente Técnico</h3><span>{selected?`${selected.fabricante} ${selected.modelo} • ${selected.status_indexacao}`:'Selecione um manual'}</span></div></div>
        <div className="chatMessages">
          {mensagens.map((m,i)=><div key={i} className={`chatBubble ${m.role}`}>
            <div>{m.text}</div>{m.source&&<small>{m.source}</small>}
          </div>)}
          {perguntando&&<div className="chatBubble assistant typing"><Loader2 className="spin" size={15}/> Consultando o manual...</div>}
          <div ref={chatEnd}/>
        </div>
        <form className="manualAsk" onSubmit={perguntar}>
          <input disabled={perguntando} value={pergunta} onChange={e=>setPergunta(e.target.value)} placeholder="Ex.: O que significa o erro E9?"/>
          <button className="primary" disabled={perguntando||!selected}><Send size={16}/></button>
        </form>
        <div className="aiSetupNotice">O assistente pesquisa somente o manual selecionado. Confirme procedimentos críticos diretamente no PDF quando necessário.</div>
      </section>
    </div>
  </>
}
