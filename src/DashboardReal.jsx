import NewsCarousel from './NewsCarousel'
import React,{useEffect,useMemo,useState} from 'react'
import {ClipboardList,CheckCircle2,Clock3,AlertTriangle,CalendarDays,Filter,RefreshCcw} from 'lucide-react'
import {cacheOrdensServico,getCachedOrdensServico,getCachedClientes,cacheClientes} from './offline'

const labels={
  aberta:'Aberta',agendada:'Agendada',em_atendimento:'Em atendimento',
  aguardando_material:'Aguardando material',aguardando_orcamento:'Aguardando orçamento',
  concluida:'Concluída',cancelada:'Cancelada'
}
function localDate(v){
  if(!v)return '-'
  const [y,m,d]=String(v).slice(0,10).split('-')
  return `${d}/${m}/${y}`
}
export default function DashboardReal({supabase,profile,session,onQuickCreate}){
  const [os,setOs]=useState([])
  const [clientes,setClientes]=useState([])
  const [periodo,setPeriodo]=useState('mes')
  const [cliente,setCliente]=useState('')
  const [loading,setLoading]=useState(false)

  async function carregar(){
    setLoading(true)
    try{
      if(navigator.onLine){
        let q=supabase.from('ordens_servico').select('*,clientes(nome)').order('created_at',{ascending:false})
        if(profile.perfil!=='admin') q=q.eq('tecnico_id',session.user.id)
        const [or,cr]=await Promise.all([q,supabase.from('clientes').select('*').order('nome')])
        if(or.error)throw or.error
        setOs(or.data||[]);setClientes(cr.data||[])
        await cacheOrdensServico(or.data||[]);await cacheClientes(cr.data||[])
      }else{
        setOs(await getCachedOrdensServico());setClientes(await getCachedClientes())
      }
    }finally{setLoading(false)}
  }
  useEffect(()=>{carregar()},[profile.perfil])

  const filtradas=useMemo(()=>{
    const now=new Date()
    return os.filter(x=>{
      if(cliente&&x.cliente_id!==cliente)return false
      const raw=x.data_visita||x.created_at
      if(!raw)return periodo==='todos'
      const d=new Date(String(raw).length===10?raw+'T12:00:00':raw)
      if(periodo==='hoje')return d.toDateString()===now.toDateString()
      if(periodo==='mes')return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()
      if(periodo==='ano')return d.getFullYear()===now.getFullYear()
      return true
    })
  },[os,periodo,cliente])

  const count=s=>filtradas.filter(x=>s.includes(x.status)).length
  const abertas=count(['aberta','agendada','em_atendimento','aguardando_material','aguardando_orcamento'])
  const concluidas=count(['concluida'])
  const pendentes=count(['aguardando_material','aguardando_orcamento'])
  const emergenciais=filtradas.filter(x=>x.prioridade==='emergencial').length

  return <>
    <div className="toolbar">
      <div><span className="eyebrow">VISÃO GERAL</span><h2>Dashboard</h2><p>Controle real das Ordens de Serviço da FORTAL TECH.</p></div>
      <button className="primary" onClick={onQuickCreate}>+ Criar</button>
    </div>
    <NewsCarousel/>

    <div className="dashboardFilters">
      <div><Filter size={15}/><select value={periodo} onChange={e=>setPeriodo(e.target.value)}>
        <option value="hoje">Hoje</option><option value="mes">Este mês</option>
        <option value="ano">Este ano</option><option value="todos">Todo o período</option>
      </select></div>
      <div><select value={cliente} onChange={e=>setCliente(e.target.value)}>
        <option value="">Todos os clientes</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
      </select></div>
      <button className="iconBtn" onClick={carregar} title="Atualizar"><RefreshCcw size={16} className={loading?'spin':''}/></button>
    </div>
    <div className="cards dashboardCards">
      <div className="card"><ClipboardList/><div><span>OS ativas</span><strong>{abertas}</strong></div></div>
      <div className="card"><CheckCircle2/><div><span>Concluídas</span><strong>{concluidas}</strong></div></div>
      <div className="card"><Clock3/><div><span>Pendentes</span><strong>{pendentes}</strong></div></div>
      <div className="card"><AlertTriangle/><div><span>Emergenciais</span><strong>{emergenciais}</strong></div></div>
    </div>
    <div className="grid2">
      <section className="panel">
        <h3>Ordens de Serviço no período</h3>
        {filtradas.length===0?<div className="emptySmall"><CalendarDays/><b>Nenhuma OS neste filtro</b></div>:
        <div className="dashOsList">{filtradas.slice(0,10).map(x=><div className="dashOs" key={x.id}>
          <div><b>{x.numero}</b><span>{x.clientes?.nome||clientes.find(c=>c.id===x.cliente_id)?.nome||'Cliente'} • {localDate(x.data_visita)}</span></div>
          <em className={`status-${x.status}`}>{labels[x.status]||x.status}</em>
        </div>)}</div>}
      </section>
      <section className="panel">
        <h3>Resumo por status</h3>
        <div className="statusSummary">
          {Object.entries(labels).map(([key,label])=><div key={key}><span>{label}</span><strong>{count([key])}</strong></div>)}
        </div>
      </section>
    </div>
  </>
}
