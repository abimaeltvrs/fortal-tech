import React,{useEffect,useMemo,useState} from 'react'
import {
  LayoutDashboard,CalendarDays,Users,ClipboardList,FileText,WalletCards,
  BarChart3,UserCog,Settings,Plus,Wrench,AlertTriangle,CheckCircle2,
  Menu,LogOut,Cloud,CloudOff,RefreshCcw,Clock,ChevronDown,
  UserPlus,CalendarPlus,Receipt,WalletMinimal
} from 'lucide-react'
import {supabase} from './supabase'
import Login from './Login'
import Clientes from './Clientes'
import Agenda from './Agenda'
import OrdensServico from './OrdensServico'
import DashboardReal from './DashboardReal'
import NotificationCenter from './NotificationCenter'
import Orcamentos from './Orcamentos'
import Financeiro from './Financeiro'
import InstallApp from './InstallApp'
import {syncPendingChanges} from './sync'

const pages=[
  ['dashboard','Dashboard',LayoutDashboard],['agenda','Agenda',CalendarDays],
  ['clientes','Clientes',Users],['os','Ordens de Serviço',ClipboardList],
  ['orcamentos','Orçamentos',FileText],['financeiro','Financeiro',WalletCards],
  ['relatorios','Relatórios',BarChart3],['usuarios','Usuários',UserCog],
  ['configuracoes','Configurações',Settings]
]

function Dashboard({session,profile,onQuickCreate}){
  const [agenda,setAgenda]=useState([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    ;(async()=>{
      if(!supabase || !navigator.onLine){setLoading(false);return}
      const ini=new Date(); ini.setHours(0,0,0,0)
      const fim=new Date(); fim.setHours(23,59,59,999)
      let q=supabase.from('agendamentos').select('*,clientes(nome)').gte('inicio',ini.toISOString()).lte('inicio',fim.toISOString()).order('inicio')
      if(profile?.perfil!=='admin') q=q.eq('tecnico_id',session.user.id)
      const {data}=await q
      setAgenda(data||[]); setLoading(false)
    })()
  },[session.user.id,profile?.perfil])

  return <>
    <div className="toolbar">
      <div><h2>Visão geral</h2><p>Acompanhe o movimento da FORTAL TECH.</p></div>
      <button className="primary" onClick={onQuickCreate}><Plus size={18}/> Criar <ChevronDown size={16}/></button>
    </div>

    <div className="cards">
      <div className="card"><div className="cardIcon"><ClipboardList size={22}/></div><div><span>OS abertas</span><strong>—</strong></div></div>
      <div className="card"><div className="cardIcon"><CalendarDays size={22}/></div><div><span>Atendimentos hoje</span><strong>{loading?'…':agenda.length}</strong></div></div>
      <div className="card"><div className="cardIcon"><FileText size={22}/></div><div><span>Orçamentos pendentes</span><strong>—</strong></div></div>
      <div className="card"><div className="cardIcon"><WalletCards size={22}/></div><div><span>A receber</span><strong>—</strong></div></div>
    </div>

    <div className="grid2">
      <section className="panel">
        <div className="panelTitle"><div><h3>Agenda de hoje</h3><p>Atendimentos reais cadastrados</p></div><CalendarDays size={20}/></div>
        {agenda.length===0 ? <div className="emptyDash">Nenhum atendimento agendado para hoje.</div> :
          agenda.map(a=><div className="agendaItem" key={a.id}>
            <div className="time"><Clock size={16}/>{new Date(a.inicio).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
            <div className="grow"><b>{a.clientes?.nome||'Cliente'}</b><span>{a.tipo_atendimento} • {a.sistema||'Sistema'}</span></div>
            <span className="badge">{a.status}</span>
          </div>)
        }
      </section>
      <section className="panel">
        <div className="panelTitle"><div><h3>Pendências técnicas</h3><p>Será alimentado pelas OS</p></div><AlertTriangle size={20}/></div>
        <div className="pending ok"><CheckCircle2 size={18}/><span>Aguardando implantação do módulo de OS.</span></div>
      </section>
    </div>
  </>
}

const Placeholder=({title})=><section className="panel empty"><Wrench size={42}/><h2>{title}</h2><p>Módulo preparado para a próxima etapa.</p></section>

export default function App(){
  const [session,setSession]=useState(null)
  const [profile,setProfile]=useState(null)
  const [loading,setLoading]=useState(true)
  const [page,setPage]=useState('dashboard')
  const [open,setOpen]=useState(false)
  const [online,setOnline]=useState(navigator.onLine)
  const [syncStatus,setSyncStatus]=useState('synced')
  const [quickCreate,setQuickCreate]=useState(false)
  const [openAgendaId,setOpenAgendaId]=useState(null)
  const [openOSId,setOpenOSId]=useState(null)
  const [financeOrcamentoId,setFinanceOrcamentoId]=useState(null)

  function abrirCriacao(tipo){
    setQuickCreate(false)
    if(tipo==='os'){
      setPage('os')
      setTimeout(()=>window.dispatchEvent(new Event('fortal:new-os')),50)
    }
    if(tipo==='agenda'){
      setPage('agenda')
      setTimeout(()=>window.dispatchEvent(new Event('fortal:new-agendamento')),50)
    }
    if(tipo==='cliente'){
      setPage('clientes')
      setTimeout(()=>window.dispatchEvent(new Event('fortal:new-cliente')),50)
    }
    if(tipo==='orcamento'){
      setPage('orcamentos')
      setTimeout(()=>window.dispatchEvent(new Event('fortal:new-orcamento')),50)
    }
    if(tipo==='financeiro'){
      setPage('financeiro')
    }
  }

  useEffect(()=>{
    if(!supabase){setLoading(false);return}
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)})
    const {data:l}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s))
    return()=>l.subscription.unsubscribe()
  },[])

  useEffect(()=>{
    ;(async()=>{
      if(!session?.user||!supabase){setProfile(null);return}
      const {data}=await supabase.from('profiles').select('*').eq('id',session.user.id).single()
      setProfile(data)
    })()
  },[session])

  useEffect(()=>{
    const on=async()=>{
      setOnline(true)
      if(supabase){
        setSyncStatus('syncing')
        await syncPendingChanges(supabase,setSyncStatus)
      }
    }
    const off=()=>{setOnline(false);setSyncStatus('pending')}
    window.addEventListener('online',on);window.addEventListener('offline',off)
    return()=>{window.removeEventListener('online',on);window.removeEventListener('offline',off)}
  },[])

  useEffect(()=>{
    const go=(e)=>{
      setPage('orcamentos')
      setTimeout(()=>window.dispatchEvent(new CustomEvent('fortal:orcamento-from-os',{detail:e.detail})),80)
    }
    window.addEventListener('fortal:go-orcamento',go)
    return()=>window.removeEventListener('fortal:go-orcamento',go)
  },[])

  useEffect(()=>{
    const openFinance=(e)=>{
      setFinanceOrcamentoId(e.detail||null)
      setPage('financeiro')
    }
    window.addEventListener('fortal:open-finance',openFinance)
    return()=>window.removeEventListener('fortal:open-finance',openFinance)
  },[])

  const current=useMemo(()=>pages.find(p=>p[0]===page),[page])
  if(loading)return <div className="boot">Carregando FORTAL TECH...</div>
  if(!supabase)return <div className="boot errorBox">Supabase não configurado. Verifique as variáveis de ambiente.</div>
  if(!session)return <Login supabase={supabase}/>
  if(!profile)return <div className="boot">Carregando perfil...</div>

  const role=profile.perfil==='admin'?'ADMINISTRADOR':'TÉCNICO'
  const visible=pages.filter(([id])=>profile.perfil==='admin'||!['financeiro','relatorios','usuarios','configuracoes','orcamentos'].includes(id))

  return <div className="app">
    {open && <button className="sidebarOverlay" aria-label="Fechar menu" onClick={()=>setOpen(false)}></button>}
    <aside className={open?'sidebar open':'sidebar'}>
      <div className="brand"><div className="logo">FT</div><div><b>FORTAL TECH</b><span>Gestão Técnica</span></div></div>
      <nav>{visible.map(([id,l,I])=><button key={id} className={page===id?'active':''} onClick={()=>{setPage(id);setOpen(false)}}><I size={19}/>{l}</button>)}</nav>
      <div className="sidebarInstall"><InstallApp/></div>
      <div className="profile">
        <div className="avatar">{(profile.nome||session.user.email||'US').slice(0,2).toUpperCase()}</div>
        <div className="profileText">
          <b>{profile.nome||session.user.email}</b>
          <span>{role}</span>
          <button className="simpleLogout" onClick={()=>supabase.auth.signOut()}><LogOut size={14}/> Sair</button>
        </div>
      </div>
    </aside>

    {quickCreate && <button className="quickCreateOverlay" aria-label="Fechar atalhos" onClick={()=>setQuickCreate(false)}></button>}
    {quickCreate && <div className="quickCreateMenu">
      <button onClick={()=>abrirCriacao('os')}><ClipboardList size={18}/><span><b>Nova OS</b><small>Criar ordem de serviço</small></span></button>
      <button onClick={()=>abrirCriacao('agenda')}><CalendarPlus size={18}/><span><b>Novo agendamento</b><small>Adicionar atendimento à agenda</small></span></button>
      <button onClick={()=>abrirCriacao('cliente')}><UserPlus size={18}/><span><b>Novo cliente</b><small>Cadastrar cliente ou condomínio</small></span></button>
      {profile.perfil==='admin' && <button onClick={()=>abrirCriacao('orcamento')}><Receipt size={18}/><span><b>Novo orçamento</b><small>Criar proposta comercial</small></span></button>}
      {profile.perfil==='admin' && <button onClick={()=>abrirCriacao('financeiro')}><WalletMinimal size={18}/><span><b>Movimentação</b><small>Registrar entrada ou saída</small></span></button>}
    </div>}

    <main>
      <header>
        <button className="menuBtn" onClick={()=>setOpen(!open)}><Menu/></button>
        <div><span className="eyebrow">FORTAL TECH</span><h1>{current?.[1]}</h1></div>
        <div className="headerRight">
          <NotificationCenter
            supabase={supabase}
            profile={profile}
            session={session}
            onOpenAgenda={(id)=>{setOpenAgendaId(id);setPage('agenda')}}
            onOpenOS={(id)=>{setOpenOSId(id);setPage('os')}}
          />
        <div className={`connection ${online?'online':'offline'} ${syncStatus==='syncing'?'syncing':''}`} title="Status de conexão e sincronização">
          {online?<Cloud size={16}/>:<CloudOff size={16}/>}
          <span>{!online?'Modo offline':syncStatus==='syncing'?'Sincronizando...':syncStatus==='pending'?'Aguardando sincronização':'Online'}</span>
          {syncStatus==='syncing'&&<RefreshCcw className="spin" size={14}/>}
        </div>
        </div>
      </header>
      <div className="content">
        {page==='dashboard'?<DashboardReal supabase={supabase} session={session} profile={profile} onQuickCreate={()=>setQuickCreate(true)}/>:
         page==='agenda'?<Agenda supabase={supabase} profile={profile} session={session} setSyncStatus={setSyncStatus} openItemId={openAgendaId} clearOpenItem={()=>setOpenAgendaId(null)}/>:
         page==='clientes'?<Clientes supabase={supabase} setSyncStatus={setSyncStatus}/>:
         page==='os'?<OrdensServico supabase={supabase} profile={profile} session={session} setSyncStatus={setSyncStatus} openItemId={openOSId} clearOpenItem={()=>setOpenOSId(null)}/>:
         page==='orcamentos'?<Orcamentos supabase={supabase} profile={profile} session={session}/>:
         page==='financeiro'?<Financeiro supabase={supabase} orcamentoFiltro={financeOrcamentoId} clearFiltro={()=>setFinanceOrcamentoId(null)}/>:
         <Placeholder title={current?.[1]}/>}
      </div>
    </main>
  </div>
}
