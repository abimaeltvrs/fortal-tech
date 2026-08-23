import React,{useEffect,useMemo,useState} from 'react'
import {X,ClipboardList,CalendarDays,Receipt,Package,AlertTriangle,FileDown} from 'lucide-react'
function br(v){if(!v)return '-';const [y,m,d]=String(v).slice(0,10).split('-');return `${d}/${m}/${y}`}
const lbl={aberta:'Aberta',agendada:'Agendada',em_atendimento:'Em atendimento',aguardando_material:'Aguardando material',aguardando_orcamento:'Aguardando orçamento',concluida:'Concluída',cancelada:'Cancelada'}
export default function HistoricoCliente({supabase,cliente,onClose}){
 const [os,setOs]=useState([]);const [agenda,setAgenda]=useState([]);const [periodo,setPeriodo]=useState('ano')
 useEffect(()=>{(async()=>{
   const [o,a]=await Promise.all([
    supabase.from('ordens_servico').select('*,os_materiais(*)').eq('cliente_id',cliente.id).order('created_at',{ascending:false}),
    supabase.from('agendamentos').select('*').eq('cliente_id',cliente.id).order('inicio',{ascending:false})
   ])
   setOs(o.data||[]);setAgenda(a.data||[])
 })()},[cliente.id])
 const filtro=useMemo(()=>os.filter(x=>{
   if(periodo==='todos')return true
   const d=new Date((x.data_visita||x.created_at)+(String(x.data_visita||'').length===10?'T12:00:00':''))
   const n=new Date()
   if(periodo==='mes')return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()
   return d.getFullYear()===n.getFullYear()
 }),[os,periodo])
 const totalMateriais=filtro.reduce((s,x)=>s+(x.os_materiais||[]).reduce((a,m)=>a+Number(m.quantidade||0)*Number(m.preco_unitario||0),0),0)
 return <div className="modalBackdrop"><div className="modal historyModal">
  <div className="modalHead"><div><span className="eyebrow">HISTÓRICO DO CLIENTE</span><h2>{cliente.nome}</h2></div><button className="iconBtn" onClick={onClose}><X/></button></div>
  <div className="historyFilter"><select value={periodo} onChange={e=>setPeriodo(e.target.value)}><option value="mes">Este mês</option><option value="ano">Este ano</option><option value="todos">Todo período</option></select></div>
  <div className="historyStats">
   <div><ClipboardList/><span>OS no período</span><b>{filtro.length}</b></div>
   <div><CalendarDays/><span>Agendamentos</span><b>{agenda.length}</b></div>
   <div><Package/><span>Materiais utilizados</span><b>{totalMateriais.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</b></div>
   <div><AlertTriangle/><span>Pendências</span><b>{filtro.filter(x=>['aguardando_material','aguardando_orcamento'].includes(x.status)).length}</b></div>
  </div>
  <section className="osSection"><h3>Atividades / Ordens de Serviço</h3>
   {filtro.length===0?<div className="emptyInline">Nenhuma atividade encontrada.</div>:filtro.map(x=><div className="historyRow" key={x.id}>
    <div><b>{x.numero}</b><span>{br(x.data_visita)} • {x.tipo_atendimento}</span><small>{x.motivo||'Sem descrição'}</small></div>
    <em>{lbl[x.status]||x.status}</em>
   </div>)}
  </section>
  <section className="osSection"><h3>Agendamentos</h3>
   {agenda.length===0?<div className="emptyInline">Nenhum agendamento encontrado.</div>:agenda.slice(0,20).map(x=><div className="historyRow" key={x.id}>
    <div><b>{x.titulo||x.tipo_atendimento||'Atendimento'}</b><span>{x.inicio?new Date(x.inicio).toLocaleString('pt-BR'):'-'}</span></div><em>{x.status}</em>
   </div>)}
  </section>
 </div></div>
}
