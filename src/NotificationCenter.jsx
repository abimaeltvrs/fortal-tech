import React,{useEffect,useMemo,useState} from 'react'
import {Bell,CalendarDays,AlertTriangle,Clock3,X,CheckCircle2,Sparkles,ChevronLeft} from 'lucide-react'
import {APP_VERSION,RELEASE_NOTES} from './releaseNotes'

function fmt(v){
  if(!v)return ''
  return new Date(v).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})
}

export default function NotificationCenter({supabase,profile,session,onOpenAgenda,onOpenOS}){
  const [open,setOpen]=useState(false)
  const [showHistory,setShowHistory]=useState(false)
  const userKey=session?.user?.id||'anon'
  const versionReadKey=`fortal_release_read_${userKey}_${APP_VERSION}`
  const [releaseRead,setReleaseRead]=useState(()=>localStorage.getItem(versionReadKey)==='1')
  useEffect(()=>{setReleaseRead(localStorage.getItem(versionReadKey)==='1')},[versionReadKey])
  const [agenda,setAgenda]=useState([])
  const [os,setOs]=useState([])
  const [lidos,setLidos]=useState(()=>new Set(JSON.parse(localStorage.getItem('fortal_notificacoes_lidas')||'[]')))

  async function carregar(){
    if(!navigator.onLine)return
    const now=new Date()
    const future=new Date(now.getTime()+48*60*60*1000)

    let aq=supabase.from('agendamentos')
      .select('*,clientes(nome)')
      .gte('inicio',now.toISOString())
      .lte('inicio',future.toISOString())
      .neq('status','cancelado')
      .order('inicio')

    let oq=supabase.from('ordens_servico')
      .select('*,clientes(nome)')
      .in('status',['aberta','agendada','em_atendimento','aguardando_material','aguardando_orcamento'])
      .order('updated_at',{ascending:false})

    if(profile.perfil!=='admin'){
      aq=aq.eq('tecnico_id',session.user.id)
      oq=oq.eq('tecnico_id',session.user.id)
    }

    const [ar,or]=await Promise.all([aq,oq])
    setAgenda(ar.data||[])
    setOs(or.data||[])
  }

  useEffect(()=>{
    carregar()
    const id=setInterval(carregar,60000)
    return()=>clearInterval(id)
  },[profile.perfil,session.user.id])

  const itens=useMemo(()=>{
    const a=agenda
      .filter(x=>x.lembrete_ativo!==false)
      .map(x=>({
        id:'a-'+x.id,
        sourceId:x.id,
        tipo:'agenda',
        titulo:x.clientes?.nome||'Atendimento agendado',
        texto:`${x.tipo_atendimento||'Atendimento'} • ${fmt(x.inicio)}`,
        prioridade:1,
        lida:lidos.has('a-'+x.id)
      }))

    const o=os.map(x=>({
      id:'o-'+x.id,
      sourceId:x.id,
      tipo:'os',
      titulo:x.clientes?.nome||x.numero,
      texto:
        x.status==='aguardando_material'?'OS aguardando material':
        x.status==='aguardando_orcamento'?'OS aguardando orçamento':
        x.status==='em_atendimento'?'OS em atendimento':
        x.status==='agendada'?'OS agendada':
        'OS aberta',
      prioridade:2,
      lida:lidos.has('o-'+x.id)
    }))

    return [...a,...o]
  },[agenda,os,lidos])

  function persistirLidos(next){
    const arr=[...next]
    localStorage.setItem('fortal_notificacoes_lidas',JSON.stringify(arr))
    setLidos(next)
  }

  function marcarLida(id,e){
    e?.stopPropagation()
    const next=new Set(lidos)
    next.add(id)
    persistirLidos(next)
  }

  function abrirItem(item){
    marcarLida(item.id)
    setOpen(false)
    if(item.tipo==='agenda') onOpenAgenda?.(item.sourceId)
    if(item.tipo==='os') onOpenOS?.(item.sourceId)
  }

  const naoLidas=itens.filter(x=>!x.lida).length+(releaseRead?0:1)
  function marcarVersaoLida(){localStorage.setItem(versionReadKey,'1');setReleaseRead(true)}

  return <>
    <button className="notifButton" onClick={()=>{setOpen(!open);setShowHistory(false)}} title="Notificações">
      <Bell size={18}/>
      {naoLidas>0&&<span>{naoLidas>99?'99+':naoLidas}</span>}
    </button>

    {open&&<>
      <button className="notifOverlay" onClick={()=>setOpen(false)}></button>
      <div className="notifPanel">
        <div className="notifHead">
          <div><span className="eyebrow">FORTAL TECH</span><h3>{showHistory?'Histórico de versões':'Notificações'}</h3></div>
          <button className="iconBtn" onClick={()=>setOpen(false)}><X size={17}/></button>
        </div>

        {showHistory ? <div className="notifList">
          <button className="releaseBack" onClick={()=>setShowHistory(false)}><ChevronLeft size={16}/> Voltar às notificações</button>
          {RELEASE_NOTES.map(r=><div className="releaseEntry" key={r.version}>
            <b>V{r.version} — {r.title}</b>
            {r.date&&<small>{new Date(r.date+'T12:00:00').toLocaleDateString('pt-BR')}</small>}
            <ul>{r.changes.map((c,i)=><li key={i}>{c}</li>)}</ul>
          </div>)}
        </div> : <>
        <div className="releaseArea">
          {!releaseRead&&<div className="releaseNotice">
            <div className="releaseHeading"><Sparkles size={18}/><b>FORTAL TECH atualizado — V{APP_VERSION}</b></div>
            <p>{RELEASE_NOTES[0].title}</p>
            <ul>{RELEASE_NOTES[0].changes.map((c,i)=><li key={i}>{c}</li>)}</ul>
            <button onClick={marcarVersaoLida}>Marcar novidade como lida</button>
          </div>}
          <button className="releaseHistoryLink" onClick={()=>{marcarVersaoLida();setShowHistory(true)}}>Ver histórico de versões</button>
        </div>
        {itens.length===0?
          <div className="notifEmpty"><CheckCircle2/><b>Tudo em dia</b><span>Nenhum agendamento próximo ou OS pendente.</span></div>:
          <div className="notifList">
            {itens.map(x=><div className={`notifItem ${x.lida?'read':''}`} key={x.id} onClick={()=>abrirItem(x)}>
              <div className={`notifIcon ${x.tipo}`}>
                {x.tipo==='agenda'?<CalendarDays size={17}/>:<AlertTriangle size={17}/>}
              </div>
              <div className="notifText"><b>{x.titulo}</b><span>{x.texto}</span></div>
              <button className="markReadBtn" onClick={(e)=>marcarLida(x.id,e)} disabled={x.lida}>
                {x.lida?'Lida':'Marcar como lida'}
              </button>
            </div>)}
          </div>
        }
        </>}
      </div>
    </>}
  </>
}
