import React,{useEffect,useMemo,useRef,useState} from 'react'
import {Newspaper,ChevronLeft,ChevronRight,Settings2,RefreshCcw,WifiOff,ExternalLink,X,Plus,Trash2} from 'lucide-react'

const DEFAULT_TOPICS=[
  'CFTV',
  'Controle de Acesso',
  'Segurança Eletrônica',
  'Redes e Infraestrutura',
  'Sistema de Alarme',
  'Nobreak e Energia'
]

function fmtDate(v){
  if(!v)return ''
  const d=new Date(v)
  if(Number.isNaN(d.getTime()))return ''
  return d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})
}

export default function NewsCarousel(){
  const [topics,setTopics]=useState(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem('fortal_news_topics')||'null')
      return Array.isArray(saved)&&saved.length?saved:DEFAULT_TOPICS
    }catch{return DEFAULT_TOPICS}
  })
  const [active,setActive]=useState(()=>localStorage.getItem('fortal_news_active')||'CFTV')
  const [items,setItems]=useState([])
  const [index,setIndex]=useState(0)
  const [loading,setLoading]=useState(false)
  const [offline,setOffline]=useState(!navigator.onLine)
  const [settings,setSettings]=useState(false)
  const [newTopic,setNewTopic]=useState('')
  const [lastUpdate,setLastUpdate]=useState('')
  const timer=useRef(null)

  const cacheKey=useMemo(()=>`fortal_news_cache_${active.toLowerCase().replace(/\s+/g,'_')}`,[active])

  async function load(force=false){
    setOffline(!navigator.onLine)
    const cached=localStorage.getItem(cacheKey)

    if(!navigator.onLine){
      if(cached){
        try{
          const data=JSON.parse(cached)
          setItems(data.items||[])
          setLastUpdate(data.updatedAt||'')
          setIndex(0)
        }catch{}
      }
      return
    }

    setLoading(true)
    try{
      const r=await fetch(`/api/news?topic=${encodeURIComponent(active)}&limit=8${force?'&t='+Date.now():''}`)
      if(!r.ok)throw new Error('Falha ao buscar notícias')
      const data=await r.json()
      setItems(data.items||[])
      setLastUpdate(data.updatedAt||new Date().toISOString())
      setIndex(0)
      localStorage.setItem(cacheKey,JSON.stringify(data))
    }catch{
      if(cached){
        try{
          const data=JSON.parse(cached)
          setItems(data.items||[])
          setLastUpdate(data.updatedAt||'')
        }catch{}
      }
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{
    localStorage.setItem('fortal_news_topics',JSON.stringify(topics))
    if(!topics.includes(active)){
      const next=topics[0]||'Tecnologia'
      setActive(next)
    }
  },[topics])

  useEffect(()=>{
    localStorage.setItem('fortal_news_active',active)
    load()
  },[active])

  useEffect(()=>{
    const on=()=>{setOffline(false);load(true)}
    const off=()=>setOffline(true)
    window.addEventListener('online',on)
    window.addEventListener('offline',off)
    return()=>{window.removeEventListener('online',on);window.removeEventListener('offline',off)}
  },[active])

  useEffect(()=>{
    clearInterval(timer.current)
    if(items.length>1){
      timer.current=setInterval(()=>setIndex(i=>(i+1)%items.length),7000)
    }
    return()=>clearInterval(timer.current)
  },[items.length])

  const current=items[index]

  function addTopic(){
    const v=newTopic.trim()
    if(!v)return
    if(!topics.some(x=>x.toLowerCase()===v.toLowerCase())){
      setTopics(t=>[...t,v])
    }
    setActive(v)
    setNewTopic('')
  }

  function removeTopic(topic){
    if(topics.length<=1)return
    setTopics(t=>t.filter(x=>x!==topic))
  }

  function prev(){
    if(!items.length)return
    setIndex(i=>(i-1+items.length)%items.length)
  }
  function next(){
    if(!items.length)return
    setIndex(i=>(i+1)%items.length)
  }

  return <section className="newsWidget">
    <div className="newsTop">
      <div className="newsTitle">
        <Newspaper size={18}/>
        <div><b>Notícias & Mercado</b><span>{offline?'Últimas notícias armazenadas':'Atualização online'}</span></div>
      </div>
      <div className="newsTools">
        <button title="Atualizar" onClick={()=>load(true)} disabled={loading}><RefreshCcw size={15} className={loading?'spin':''}/></button>
        <button title="Assuntos" onClick={()=>setSettings(true)}><Settings2 size={15}/></button>
      </div>
    </div>

    <div className="topicChips">
      {topics.map(t=><button key={t} className={active===t?'active':''} onClick={()=>setActive(t)}>{t}</button>)}
    </div>

    {!current?
      <div className="newsEmpty">
        {offline?<WifiOff size={22}/>:<Newspaper size={22}/>}
        <b>{offline?'Sem notícias armazenadas para este assunto':'Buscando notícias...'}</b>
        <span>{offline?'Conecte à internet uma vez para carregar esse tema.':'Aguarde a atualização.'}</span>
      </div>:
      <div className="newsCarousel">
        <button className="newsNav prev" onClick={prev}><ChevronLeft/></button>
        <article>
          <div className="newsMeta">
            <span>{current.source||active}</span>
            <em>{fmtDate(current.pubDate)}</em>
          </div>
          <h3>{current.title}</h3>
          {current.description&&<p>{current.description}</p>}
          <div className="newsBottom">
            <span>{index+1} de {items.length}{lastUpdate?` • Atualizado ${fmtDate(lastUpdate)}`:''}</span>
            <button onClick={()=>window.open(current.link,'_blank','noopener,noreferrer')}>Ler notícia <ExternalLink size={13}/></button>
          </div>
        </article>
        <button className="newsNav next" onClick={next}><ChevronRight/></button>
      </div>
    }

    <div className="newsDots">
      {items.map((_,i)=><button key={i} className={i===index?'active':''} onClick={()=>setIndex(i)}></button>)}
    </div>

    {settings&&<div className="modalBackdrop">
      <div className="newsSettingsModal">
        <div className="modalHead">
          <div><span className="eyebrow">NOTÍCIAS DO DASHBOARD</span><h2>Assuntos de interesse</h2></div>
          <button className="iconBtn" onClick={()=>setSettings(false)}><X/></button>
        </div>
        <p className="newsSettingsText">Escolha os temas que quer acompanhar. Você também pode adicionar qualquer assunto personalizado.</p>

        <div className="topicManage">
          {topics.map(t=><div key={t}>
            <button className={active===t?'selected':''} onClick={()=>setActive(t)}>{t}</button>
            <button className="removeTopic" disabled={topics.length<=1} onClick={()=>removeTopic(t)}><Trash2 size={14}/></button>
          </div>)}
        </div>

        <div className="addTopic">
          <input value={newTopic} onChange={e=>setNewTopic(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTopic()} placeholder="Ex.: Inteligência Artificial, Hikvision, Energia Solar..." />
          <button className="primary" onClick={addTopic}><Plus size={16}/> Adicionar</button>
        </div>
      </div>
    </div>}
  </section>
}
