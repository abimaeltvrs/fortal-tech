import React,{useEffect,useMemo,useRef,useState} from 'react'
import {BookOpen,Upload,Search,Trash2,FileText,MessageSquare,Send,ExternalLink,Loader2} from 'lucide-react'

export default function Manuais({supabase,profile}){
  const [lista,setLista]=useState([])
  const [busca,setBusca]=useState('')
  const [fabricante,setFabricante]=useState('')
  const [modelo,setModelo]=useState('')
  const [categoria,setCategoria]=useState('')
  const [arquivo,setArquivo]=useState(null)
  const [loading,setLoading]=useState(false)
  const [erro,setErro]=useState('')
  const [sucesso,setSucesso]=useState('')
  const [manualSelecionado,setManualSelecionado]=useState('')
  const [pergunta,setPergunta]=useState('')
  const [mensagens,setMensagens]=useState([
    {role:'assistant',text:'Selecione um manual e faça uma pergunta. Quando a IA estiver configurada, as respostas serão baseadas no conteúdo dos PDFs e indicarão a fonte.'}
  ])
  const inputRef=useRef(null)
  const admin=profile?.perfil==='admin'

  async function carregar(){
    setLoading(true);setErro('')
    const {data,error}=await supabase.from('manuais_tecnicos').select('*').order('created_at',{ascending:false})
    if(error)setErro(error.message)
    else setLista(data||[])
    setLoading(false)
  }
  useEffect(()=>{carregar()},[])

  async function upload(e){
    e.preventDefault()
    if(!arquivo||!fabricante.trim()||!modelo.trim()){
      setErro('Preencha fabricante, modelo e selecione o PDF.')
      return
    }
    setLoading(true);setErro('');setSucesso('')
    try{
      const ext=(arquivo.name.split('.').pop()||'pdf').toLowerCase()
      if(ext!=='pdf')throw new Error('Envie um arquivo PDF.')
      const path=`${Date.now()}_${crypto.randomUUID()}.pdf`
      const {error:upErr}=await supabase.storage.from('manuais-tecnicos').upload(path,arquivo,{contentType:'application/pdf'})
      if(upErr)throw upErr
      const {error:dbErr}=await supabase.from('manuais_tecnicos').insert({
        fabricante:fabricante.trim(),
        modelo:modelo.trim(),
        categoria:categoria.trim()||null,
        nome_arquivo:arquivo.name,
        arquivo_path:path,
        status_indexacao:'pendente'
      })
      if(dbErr)throw dbErr
      setFabricante('');setModelo('');setCategoria('');setArquivo(null)
      if(inputRef.current)inputRef.current.value=''
      setSucesso('Manual enviado. Ele já está disponível na biblioteca.')
      await carregar()
    }catch(e){setErro(e.message||'Falha ao enviar manual.')}
    finally{setLoading(false)}
  }

  async function abrir(m){
    const {data,error}=await supabase.storage.from('manuais-tecnicos').createSignedUrl(m.arquivo_path,3600)
    if(error){setErro(error.message);return}
    window.open(data.signedUrl,'_blank','noopener,noreferrer')
  }

  async function excluir(m){
    if(!confirm(`Excluir o manual ${m.fabricante} ${m.modelo}?`))return
    setErro('')
    const {error}=await supabase.from('manuais_tecnicos').delete().eq('id',m.id)
    if(error){setErro(error.message);return}
    await supabase.storage.from('manuais-tecnicos').remove([m.arquivo_path])
    if(manualSelecionado===m.id)setManualSelecionado('')
    carregar()
  }

  function perguntar(e){
    e.preventDefault()
    const q=pergunta.trim()
    if(!q)return
    const m=lista.find(x=>x.id===manualSelecionado)
    setMensagens(x=>[
      ...x,
      {role:'user',text:q},
      {role:'assistant',text:m
        ? `O módulo de consulta já está preparado para usar o manual ${m.fabricante} ${m.modelo}. Falta apenas conectar a API de IA e executar a indexação do PDF para eu responder usando o conteúdo e citar as páginas.`
        : 'Selecione um manual antes de fazer a consulta.'}
    ])
    setPergunta('')
  }

  const filtrados=useMemo(()=>{
    const q=busca.toLowerCase().trim()
    if(!q)return lista
    return lista.filter(m=>[m.fabricante,m.modelo,m.categoria,m.nome_arquivo].filter(Boolean).join(' ').toLowerCase().includes(q))
  },[lista,busca])

  return <>
    <div className="toolbar">
      <div><h2>Manuais / Assistente Técnico</h2><p>Biblioteca técnica e consultas baseadas nos manuais dos fabricantes.</p></div>
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
            <div><b>{m.fabricante} • {m.modelo}</b><span>{m.categoria||'Manual técnico'}</span><small>{m.nome_arquivo}</small></div>
            <div className="manualCardActions" onClick={e=>e.stopPropagation()}>
              <button title="Abrir PDF" onClick={()=>abrir(m)}><ExternalLink size={15}/></button>
              {admin&&<button title="Excluir" onClick={()=>excluir(m)}><Trash2 size={15}/></button>}
            </div>
          </div>)}
        </div>
      </section>

      <section className="panel manualChat">
        <div className="manualChatHead"><MessageSquare size={18}/><div><h3>Assistente Técnico</h3><span>{manualSelecionado?`Manual: ${lista.find(x=>x.id===manualSelecionado)?.fabricante||''} ${lista.find(x=>x.id===manualSelecionado)?.modelo||''}`:'Selecione um manual'}</span></div></div>
        <div className="chatMessages">
          {mensagens.map((m,i)=><div key={i} className={`chatBubble ${m.role}`}>{m.text}</div>)}
        </div>
        <form className="manualAsk" onSubmit={perguntar}>
          <input value={pergunta} onChange={e=>setPergunta(e.target.value)} placeholder="Ex.: O que significa o erro E9?"/>
          <button className="primary"><Send size={16}/></button>
        </form>
        <div className="aiSetupNotice">A biblioteca já funciona. O próximo passo é conectar a IA para ler/indexar os PDFs e responder com manual + página como fonte.</div>
      </section>
    </div>
  </>
}
