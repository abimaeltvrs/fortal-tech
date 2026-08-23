import React, { useMemo, useState } from 'react'
import {
  LayoutDashboard, CalendarDays, Users, ClipboardList, FileText,
  WalletCards, BarChart3, UserCog, Settings, Plus, MapPin, Clock,
  Wrench, AlertTriangle, CheckCircle2, Menu
} from 'lucide-react'

const pages = [
  ['dashboard','Dashboard',LayoutDashboard],
  ['agenda','Agenda',CalendarDays],
  ['clientes','Clientes',Users],
  ['os','Ordens de Serviço',ClipboardList],
  ['orcamentos','Orçamentos',FileText],
  ['financeiro','Financeiro',WalletCards],
  ['relatorios','Relatórios',BarChart3],
  ['usuarios','Usuários',UserCog],
  ['configuracoes','Configurações',Settings],
]

const cards = [
  ['OS abertas','8',ClipboardList],
  ['Atendimentos hoje','4',CalendarDays],
  ['Orçamentos pendentes','3',FileText],
  ['A receber','R$ 4.850,00',WalletCards],
]

const agendaDemo = [
  {hora:'08:00', cliente:'Condomínio Atlântico', tipo:'Preventiva', sistema:'CFTV', status:'Confirmado'},
  {hora:'10:30', cliente:'Edifício Central', tipo:'Corretiva', sistema:'Controle de Acesso', status:'Agendado'},
  {hora:'14:00', cliente:'Empresa Horizonte', tipo:'Visita Técnica', sistema:'Rede', status:'Agendado'},
]

function Dashboard(){
  return <>
    <div className="toolbar">
      <div><h2>Visão geral</h2><p>Acompanhe o movimento da FORTAL TECH.</p></div>
      <button className="primary"><Plus size={18}/> Nova OS</button>
    </div>

    <div className="cards">
      {cards.map(([label,value,Icon]) => (
        <div className="card" key={label}>
          <div className="cardIcon"><Icon size={22}/></div>
          <div><span>{label}</span><strong>{value}</strong></div>
        </div>
      ))}
    </div>

    <div className="grid2">
      <section className="panel">
        <div className="panelTitle"><div><h3>Agenda de hoje</h3><p>Próximos atendimentos</p></div><CalendarDays size={20}/></div>
        <div className="agendaList">
          {agendaDemo.map(a => (
            <div className="agendaItem" key={a.hora+a.cliente}>
              <div className="time"><Clock size={16}/>{a.hora}</div>
              <div className="grow"><b>{a.cliente}</b><span>{a.tipo} • {a.sistema}</span></div>
              <span className="badge">{a.status}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panelTitle"><div><h3>Pendências técnicas</h3><p>Itens que exigem atenção</p></div><AlertTriangle size={20}/></div>
        <div className="pending"><b>Condomínio Atlântico</b><span>Substituir câmera 08</span></div>
        <div className="pending"><b>Edifício Central</b><span>Aguardando orçamento de fonte</span></div>
        <div className="pending ok"><CheckCircle2 size={18}/><span>Demais atendimentos em dia</span></div>
      </section>
    </div>
  </>
}

function Agenda(){
  return <>
    <div className="toolbar">
      <div><h2>Agenda</h2><p>Controle de visitas, retornos e atendimentos.</p></div>
      <button className="primary"><Plus size={18}/> Novo agendamento</button>
    </div>
    <section className="panel">
      <div className="agendaHeader">
        <button>Hoje</button><button>Semana</button><button>Mês</button>
      </div>
      {agendaDemo.map(a => (
        <div className="agendaItem large" key={a.hora+a.cliente}>
          <div className="time"><Clock size={16}/>{a.hora}</div>
          <div className="grow">
            <b>{a.cliente}</b>
            <span>{a.tipo} • {a.sistema}</span>
          </div>
          <button className="ghost"><MapPin size={16}/> Rota</button>
          <span className="badge">{a.status}</span>
        </div>
      ))}
    </section>
  </>
}

function Placeholder({title}){
  return <section className="panel empty">
    <Wrench size={42}/>
    <h2>{title}</h2>
    <p>Módulo preparado para a próxima etapa da V1.</p>
  </section>
}

export default function App(){
  const [page,setPage] = useState('dashboard')
  const [open,setOpen] = useState(false)
  const current = useMemo(() => pages.find(p=>p[0]===page),[page])

  return <div className="app">
    <aside className={open ? 'sidebar open' : 'sidebar'}>
      <div className="brand">
        <div className="logo">FT</div>
        <div><b>FORTAL TECH</b><span>Gestão Técnica</span></div>
      </div>
      <nav>
        {pages.map(([id,label,Icon]) => <button
          key={id}
          className={page===id?'active':''}
          onClick={()=>{setPage(id);setOpen(false)}}>
          <Icon size={19}/>{label}
        </button>)}
      </nav>
      <div className="profile">
        <div className="avatar">AD</div>
        <div><b>Administrador</b><span>Acesso total</span></div>
      </div>
    </aside>

    <main>
      <header>
        <button className="menuBtn" onClick={()=>setOpen(!open)}><Menu/></button>
        <div><span className="eyebrow">FORTAL TECH</span><h1>{current?.[1]}</h1></div>
        <div className="status">● Sistema online</div>
      </header>
      <div className="content">
        {page==='dashboard' ? <Dashboard/> :
         page==='agenda' ? <Agenda/> :
         <Placeholder title={current?.[1]}/>}
      </div>
    </main>
  </div>
}
