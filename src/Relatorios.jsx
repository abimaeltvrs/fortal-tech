import React,{useEffect,useMemo,useState} from 'react'
import {
  BarChart3,ClipboardList,CheckCircle2,Clock3,BadgeDollarSign,
  Search,RefreshCcw,FileDown,Users,AlertTriangle
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function money(v){
  return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
}
function br(v){
  if(!v)return '-'
  const d=new Date(String(v).length===10?v+'T12:00:00':v)
  return d.toLocaleDateString('pt-BR')
}
const statusOS={
  aberta:'Aberta',
  agendada:'Agendada',
  em_atendimento:'Em atendimento',
  aguardando_material:'Aguardando material',
  aguardando_orcamento:'Aguardando orçamento',
  concluida:'Concluída',
  cancelada:'Cancelada'
}
const tipoLabel={
  'Manutenção Preventiva':'Preventiva',
  'Manutenção Corretiva':'Corretiva',
  'Visita Técnica':'Visita Técnica',
  'Retorno':'Retorno',
  'Emergencial':'Emergencial'
}

export default function Relatorios({supabase}){
  const [os,setOs]=useState([])
  const [clientes,setClientes]=useState([])
  const [orcamentos,setOrcamentos]=useState([])
  const [financeiro,setFinanceiro]=useState([])
  const [periodo,setPeriodo]=useState('mes')
  const [cliente,setCliente]=useState('')
  const [tipo,setTipo]=useState('')
  const [status,setStatus]=useState('')
  const [busca,setBusca]=useState('')
  const [loading,setLoading]=useState(false)
  const [erro,setErro]=useState('')

  async function carregar(){
    setLoading(true);setErro('')
    try{
      const [or,cr,brc,fr]=await Promise.all([
        supabase.from('ordens_servico').select('*,clientes(nome)').order('created_at',{ascending:false}),
        supabase.from('clientes').select('*').order('nome'),
        supabase.from('orcamentos').select('*,clientes(nome)').order('created_at',{ascending:false}),
        supabase.from('financeiro_lancamentos').select('*,clientes(nome),orcamentos(numero)').order('created_at',{ascending:false})
      ])
      if(or.error)throw or.error
      if(cr.error)throw cr.error
      setOs(or.data||[])
      setClientes(cr.data||[])
      setOrcamentos(brc.data||[])
      setFinanceiro(fr.data||[])
    }catch(e){
      setErro(e.message||'Não foi possível carregar os relatórios.')
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{carregar()},[])

  function dentroPeriodo(raw){
    if(periodo==='todos')return true
    if(!raw)return false
    const d=new Date(String(raw).length===10?raw+'T12:00:00':raw)
    const n=new Date()
    if(periodo==='hoje')return d.toDateString()===n.toDateString()
    if(periodo==='mes')return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()
    if(periodo==='ano')return d.getFullYear()===n.getFullYear()
    return true
  }

  const osFiltradas=useMemo(()=>os.filter(x=>{
    if(cliente&&x.cliente_id!==cliente)return false
    if(tipo&&x.tipo_atendimento!==tipo)return false
    if(status&&x.status!==status)return false
    if(!dentroPeriodo(x.data_visita||x.created_at))return false
    const q=busca.toLowerCase().trim()
    if(q&&![
      x.numero,x.clientes?.nome,x.tipo_atendimento,statusOS[x.status],x.motivo
    ].filter(Boolean).join(' ').toLowerCase().includes(q))return false
    return true
  }),[os,cliente,tipo,status,periodo,busca])

  const orcFiltrados=useMemo(()=>orcamentos.filter(x=>{
    if(cliente&&x.cliente_id!==cliente)return false
    return dentroPeriodo(x.data_orcamento||x.created_at)
  }),[orcamentos,cliente,periodo])

  const finFiltrado=useMemo(()=>financeiro.filter(x=>{
    if(cliente&&x.cliente_id!==cliente)return false
    return dentroPeriodo(x.vencimento||x.created_at)
  }),[financeiro,cliente,periodo])

  const totalOS=osFiltradas.length
  const concluidas=osFiltradas.filter(x=>x.status==='concluida').length
  const pendentes=osFiltradas.filter(x=>['aberta','agendada','em_atendimento','aguardando_material','aguardando_orcamento'].includes(x.status)).length
  const emergenciais=osFiltradas.filter(x=>x.prioridade==='emergencial'||x.tipo_atendimento==='Emergencial').length
  const orcAprovados=orcFiltrados.filter(x=>x.status==='aprovado')
  const valorAprovado=orcAprovados.reduce((s,x)=>s+Number(x.total||0),0)
  const aReceber=finFiltrado.filter(x=>x.status==='pendente').reduce((s,x)=>s+Number(x.valor||0),0)
  const recebido=finFiltrado.filter(x=>x.status==='recebido').reduce((s,x)=>s+Number(x.valor||0),0)

  const porTipo=useMemo(()=>{
    const map={}
    osFiltradas.forEach(x=>{
      const k=tipoLabel[x.tipo_atendimento]||x.tipo_atendimento||'Outro'
      map[k]=(map[k]||0)+1
    })
    return Object.entries(map).sort((a,b)=>b[1]-a[1])
  },[osFiltradas])

  const porCliente=useMemo(()=>{
    const map={}
    osFiltradas.forEach(x=>{
      const nome=x.clientes?.nome||clientes.find(c=>c.id===x.cliente_id)?.nome||'Cliente'
      map[nome]=(map[nome]||0)+1
    })
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,10)
  },[osFiltradas,clientes])

  function gerarPDF(){
    const doc=new jsPDF({unit:'mm',format:'a4'})
    doc.setFillColor(8,17,31);doc.rect(0,0,210,31,'F')
    doc.setTextColor(19,185,129);doc.setFont('helvetica','bold');doc.setFontSize(19);doc.text('FORTAL TECH',14,13)
    doc.setTextColor(255,255,255);doc.setFontSize(12);doc.text('RELATÓRIO GERENCIAL',14,22)
    doc.setTextColor(30,30,30)

    let y=40
    const line=(l,v)=>{
      doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text(l+':',14,y)
      doc.setFont('helvetica','normal');doc.text(String(v),62,y);y+=6
    }

    line('Período',periodo==='hoje'?'Hoje':periodo==='mes'?'Este mês':periodo==='ano'?'Este ano':'Todo o período')
    line('Cliente',cliente?clientes.find(c=>c.id===cliente)?.nome||'-':'Todos')
    line('Tipo de atendimento',tipo||'Todos')
    line('Status',status?statusOS[status]||status:'Todos')
    y+=2
    line('Total de OS',totalOS)
    line('Concluídas',concluidas)
    line('Pendentes',pendentes)
    line('Emergenciais',emergenciais)
    line('Orçamentos aprovados',orcAprovados.length)
    line('Valor aprovado',money(valorAprovado))
    line('A receber',money(aReceber))
    line('Recebido',money(recebido))

    if(osFiltradas.length){
      autoTable(doc,{
        startY:y+3,
        head:[['OS','Cliente','Data','Tipo','Status']],
        body:osFiltradas.map(x=>[
          x.numero,
          x.clientes?.nome||clientes.find(c=>c.id===x.cliente_id)?.nome||'-',
          br(x.data_visita),
          x.tipo_atendimento||'-',
          statusOS[x.status]||x.status
        ]),
        styles:{fontSize:7,cellPadding:1.7,overflow:'linebreak'},
        headStyles:{fillColor:[15,28,46]},
        margin:{left:14,right:14}
      })
    }

    const pages=doc.getNumberOfPages()
    for(let p=1;p<=pages;p++){
      doc.setPage(p);doc.setFontSize(7);doc.setTextColor(120)
      doc.text(`FORTAL TECH • Relatório gerencial • Página ${p}/${pages}`,105,292,{align:'center'})
    }
    doc.save(`FORTAL_TECH_RELATORIO_${new Date().toISOString().slice(0,10)}.pdf`)
  }

  const maxTipo=Math.max(1,...porTipo.map(x=>x[1]))
  const maxCliente=Math.max(1,...porCliente.map(x=>x[1]))

  return <>
    <div className="toolbar">
      <div><h2>Relatórios</h2><p>Levantamento operacional e financeiro da FORTAL TECH.</p></div>
      <button className="primary" onClick={gerarPDF}><FileDown size={17}/> Gerar PDF</button>
    </div>

    {erro&&<div className="warningBox">{erro}</div>}

    <div className="reportFilters">
      <select value={periodo} onChange={e=>setPeriodo(e.target.value)}>
        <option value="hoje">Hoje</option>
        <option value="mes">Este mês</option>
        <option value="ano">Este ano</option>
        <option value="todos">Todo o período</option>
      </select>
      <select value={cliente} onChange={e=>setCliente(e.target.value)}>
        <option value="">Todos os clientes</option>
        {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
      <select value={tipo} onChange={e=>setTipo(e.target.value)}>
        <option value="">Todos os atendimentos</option>
        <option value="Manutenção Preventiva">Preventiva</option>
        <option value="Manutenção Corretiva">Corretiva</option>
        <option value="Visita Técnica">Visita Técnica</option>
        <option value="Retorno">Retorno</option>
        <option value="Emergencial">Emergencial</option>
      </select>
      <select value={status} onChange={e=>setStatus(e.target.value)}>
        <option value="">Todos os status</option>
        {Object.entries(statusOS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
      </select>
      <button className="iconBtn" onClick={carregar}><RefreshCcw size={16} className={loading?'spin':''}/></button>
    </div>

    <div className="cards reportCards">
      <div className="card"><ClipboardList/><div><span>Total de OS</span><strong>{totalOS}</strong></div></div>
      <div className="card"><CheckCircle2/><div><span>Concluídas</span><strong>{concluidas}</strong></div></div>
      <div className="card"><Clock3/><div><span>Pendentes</span><strong>{pendentes}</strong></div></div>
      <div className="card"><AlertTriangle/><div><span>Emergenciais</span><strong>{emergenciais}</strong></div></div>
      <div className="card"><BadgeDollarSign/><div><span>Aprovado</span><strong>{money(valorAprovado)}</strong></div></div>
      <div className="card"><BadgeDollarSign/><div><span>A receber</span><strong>{money(aReceber)}</strong></div></div>
      <div className="card"><CheckCircle2/><div><span>Recebido</span><strong>{money(recebido)}</strong></div></div>
    </div>

    <div className="grid2">
      <section className="panel">
        <h3>Atendimentos por tipo</h3>
        {porTipo.length===0?<div className="emptyInline">Sem dados no período.</div>:
          <div className="reportBars">
            {porTipo.map(([nome,qtd])=><div key={nome}>
              <div><span>{nome}</span><b>{qtd}</b></div>
              <i><em style={{width:`${(qtd/maxTipo)*100}%`}}></em></i>
            </div>)}
          </div>}
      </section>

      <section className="panel">
        <h3>Clientes com mais atendimentos</h3>
        {porCliente.length===0?<div className="emptyInline">Sem dados no período.</div>:
          <div className="reportBars">
            {porCliente.map(([nome,qtd])=><div key={nome}>
              <div><span>{nome}</span><b>{qtd}</b></div>
              <i><em style={{width:`${(qtd/maxCliente)*100}%`}}></em></i>
            </div>)}
          </div>}
      </section>
    </div>

    <section className="panel">
      <div className="searchBar">
        <Search size={18}/>
        <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar OS, cliente, tipo, status..." />
      </div>
      {osFiltradas.length===0?<div className="emptySmall"><BarChart3 size={36}/><b>Nenhuma OS encontrada</b></div>:
      <div className="reportTable">
        <div className="reportTableHead"><span>OS</span><span>Cliente</span><span>Data</span><span>Atendimento</span><span>Status</span></div>
        {osFiltradas.map(x=><div className="reportTableRow" key={x.id}>
          <b>{x.numero}</b>
          <span>{x.clientes?.nome||clientes.find(c=>c.id===x.cliente_id)?.nome||'-'}</span>
          <span>{br(x.data_visita)}</span>
          <span>{x.tipo_atendimento||'-'}</span>
          <span>{statusOS[x.status]||x.status}</span>
        </div>)}
      </div>}
    </section>
  </>
}
