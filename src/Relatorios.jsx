import React,{useEffect,useMemo,useState} from 'react'
import {
  BarChart3,ClipboardList,CheckCircle2,Clock3,BadgeDollarSign,
  Search,RefreshCcw,FileDown,AlertTriangle,Wrench,PackageSearch,
  CalendarRange,Users,TrendingUp
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function money(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function br(v){
  if(!v)return '-'
  const d=new Date(String(v).length===10?v+'T12:00:00':v)
  return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('pt-BR')
}
function dateISO(d){return d.toISOString().slice(0,10)}
const statusOS={
  aberta:'Aberta',agendada:'Agendada',em_atendimento:'Em atendimento',
  aguardando_material:'Aguardando material',aguardando_orcamento:'Aguardando orçamento',
  concluida:'Concluída',cancelada:'Cancelada'
}
const tipoLabel={
  'Manutenção Preventiva':'Preventiva','Manutenção Corretiva':'Corretiva',
  'Visita Técnica':'Visita Técnica','Retorno':'Retorno','Emergencial':'Emergencial'
}

export default function Relatorios({supabase}){
  const [os,setOs]=useState([])
  const [clientes,setClientes]=useState([])
  const [tecnicos,setTecnicos]=useState([])
  const [orcamentos,setOrcamentos]=useState([])
  const [financeiro,setFinanceiro]=useState([])
  const [materiais,setMateriais]=useState([])
  const [periodo,setPeriodo]=useState('mes')
  const [inicio,setInicio]=useState('')
  const [fim,setFim]=useState('')
  const [cliente,setCliente]=useState('')
  const [tecnico,setTecnico]=useState('')
  const [tipo,setTipo]=useState('')
  const [status,setStatus]=useState('')
  const [busca,setBusca]=useState('')
  const [loading,setLoading]=useState(false)
  const [erro,setErro]=useState('')

  async function carregar(){
    setLoading(true);setErro('')
    try{
      const [or,cr,tr,brc,fr,mr]=await Promise.all([
        supabase.from('ordens_servico').select('*,clientes(nome)').order('created_at',{ascending:false}),
        supabase.from('clientes').select('*').order('nome'),
        supabase.from('profiles').select('id,nome,email,perfil').order('nome'),
        supabase.from('orcamentos').select('*,clientes(nome)').order('created_at',{ascending:false}),
        supabase.from('financeiro_lancamentos').select('*,clientes(nome),orcamentos(numero)').order('created_at',{ascending:false}),
        supabase.from('os_materiais').select('*')
      ])
      if(or.error)throw or.error
      if(cr.error)throw cr.error
      setOs(or.data||[])
      setClientes(cr.data||[])
      setTecnicos((tr.data||[]).filter(x=>x.perfil==='tecnico'||x.perfil==='admin'))
      setOrcamentos(brc.data||[])
      setFinanceiro(fr.data||[])
      setMateriais(mr.data||[])
    }catch(e){
      setErro(e.message||'Não foi possível carregar os relatórios.')
    }finally{setLoading(false)}
  }
  useEffect(()=>{carregar()},[])

  function dentroPeriodo(raw){
    if(!raw)return false
    const iso=String(raw).slice(0,10)
    const d=new Date(`${iso}T12:00:00`)
    const n=new Date()
    if(periodo==='todos')return true
    if(periodo==='hoje')return iso===dateISO(n)
    if(periodo==='mes')return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()
    if(periodo==='ano')return d.getFullYear()===n.getFullYear()
    if(periodo==='personalizado'){
      if(inicio&&iso<inicio)return false
      if(fim&&iso>fim)return false
      return true
    }
    return true
  }

  const osFiltradas=useMemo(()=>os.filter(x=>{
    if(cliente&&x.cliente_id!==cliente)return false
    if(tecnico&&x.tecnico_id!==tecnico)return false
    if(tipo&&x.tipo_atendimento!==tipo)return false
    if(status&&x.status!==status)return false
    if(!dentroPeriodo(x.data_visita||x.created_at))return false
    const q=busca.toLowerCase().trim()
    if(q&&![x.numero,x.clientes?.nome,x.tipo_atendimento,statusOS[x.status],x.motivo]
      .filter(Boolean).join(' ').toLowerCase().includes(q))return false
    return true
  }),[os,cliente,tecnico,tipo,status,periodo,inicio,fim,busca])

  const idsOS=useMemo(()=>new Set(osFiltradas.map(x=>x.id)),[osFiltradas])
  const orcFiltrados=useMemo(()=>orcamentos.filter(x=>{
    if(cliente&&x.cliente_id!==cliente)return false
    return dentroPeriodo(x.data_orcamento||x.created_at)
  }),[orcamentos,cliente,periodo,inicio,fim])
  const finFiltrado=useMemo(()=>financeiro.filter(x=>{
    if(cliente&&x.cliente_id!==cliente)return false
    return dentroPeriodo(x.vencimento||x.created_at)
  }),[financeiro,cliente,periodo,inicio,fim])
  const matFiltrados=useMemo(()=>materiais.filter(x=>idsOS.has(x.os_id)),[materiais,idsOS])

  const totalOS=osFiltradas.length
  const concluidas=osFiltradas.filter(x=>x.status==='concluida').length
  const pendentes=osFiltradas.filter(x=>['aberta','agendada','em_atendimento','aguardando_material','aguardando_orcamento'].includes(x.status)).length
  const emergenciais=osFiltradas.filter(x=>x.prioridade==='emergencial'||x.tipo_atendimento==='Emergencial').length
  const taxaConclusao=totalOS?Math.round((concluidas/totalOS)*100):0
  const orcAprovados=orcFiltrados.filter(x=>x.status==='aprovado')
  const valorAprovado=orcAprovados.reduce((s,x)=>s+Number(x.total||0),0)
  const aReceber=finFiltrado.filter(x=>x.status==='pendente').reduce((s,x)=>s+Number(x.valor||0),0)
  const recebido=finFiltrado.filter(x=>x.status==='recebido').reduce((s,x)=>s+Number(x.valor||0),0)
  const valorMateriais=matFiltrados.reduce((s,x)=>s+Number(x.quantidade||0)*Number(x.preco_unitario||0),0)

  const porTipo=useMemo(()=>{
    const map={}
    osFiltradas.forEach(x=>{const k=tipoLabel[x.tipo_atendimento]||x.tipo_atendimento||'Outro';map[k]=(map[k]||0)+1})
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

  const porTecnico=useMemo(()=>{
    const map={}
    osFiltradas.forEach(x=>{
      const nome=tecnicos.find(t=>t.id===x.tecnico_id)?.nome||'Não identificado'
      if(!map[nome])map[nome]={total:0,concluidas:0}
      map[nome].total++
      if(x.status==='concluida')map[nome].concluidas++
    })
    return Object.entries(map).map(([nome,v])=>({nome,...v,taxa:v.total?Math.round(v.concluidas/v.total*100):0}))
      .sort((a,b)=>b.total-a.total)
  },[osFiltradas,tecnicos])

  const topMateriais=useMemo(()=>{
    const map={}
    matFiltrados.forEach(x=>{
      const nome=x.descricao||'Material'
      if(!map[nome])map[nome]={quantidade:0,valor:0}
      map[nome].quantidade+=Number(x.quantidade||0)
      map[nome].valor+=Number(x.quantidade||0)*Number(x.preco_unitario||0)
    })
    return Object.entries(map).map(([nome,v])=>({nome,...v})).sort((a,b)=>b.valor-a.valor).slice(0,10)
  },[matFiltrados])

  const maxTipo=Math.max(1,...porTipo.map(x=>x[1]))
  const maxCliente=Math.max(1,...porCliente.map(x=>x[1]))
  const maxTecnico=Math.max(1,...porTecnico.map(x=>x.total))

  function periodoTexto(){
    if(periodo==='hoje')return 'Hoje'
    if(periodo==='mes')return 'Este mês'
    if(periodo==='ano')return 'Este ano'
    if(periodo==='todos')return 'Todo o período'
    return `${inicio?br(inicio):'Início livre'} até ${fim?br(fim):'Hoje'}`
  }

  function gerarPDF(){
    const doc=new jsPDF({unit:'mm',format:'a4'})
    doc.setFillColor(8,17,31);doc.rect(0,0,210,31,'F')
    doc.setTextColor(19,185,129);doc.setFont('helvetica','bold');doc.setFontSize(19);doc.text('FORTAL TECH',14,13)
    doc.setTextColor(255,255,255);doc.setFontSize(12);doc.text('RELATÓRIO GERENCIAL AVANÇADO',14,22)
    doc.setTextColor(30,30,30)
    let y=40
    const line=(l,v)=>{doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.text(l+':',14,y);doc.setFont('helvetica','normal');doc.text(String(v),61,y);y+=5.5}
    line('Período',periodoTexto())
    line('Cliente',cliente?clientes.find(c=>c.id===cliente)?.nome||'-':'Todos')
    line('Técnico',tecnico?tecnicos.find(t=>t.id===tecnico)?.nome||'-':'Todos')
    line('Tipo',tipo||'Todos')
    line('Status',status?statusOS[status]||status:'Todos')
    y+=2
    line('Total de OS',totalOS)
    line('Concluídas',`${concluidas} (${taxaConclusao}%)`)
    line('Pendentes',pendentes)
    line('Emergenciais',emergenciais)
    line('Materiais utilizados',money(valorMateriais))
    line('Orçamentos aprovados',`${orcAprovados.length} • ${money(valorAprovado)}`)
    line('A receber',money(aReceber))
    line('Recebido',money(recebido))

    if(osFiltradas.length){
      autoTable(doc,{
        startY:y+3,
        head:[['OS','Cliente','Técnico','Data','Tipo','Status']],
        body:osFiltradas.map(x=>[
          x.numero,
          x.clientes?.nome||clientes.find(c=>c.id===x.cliente_id)?.nome||'-',
          tecnicos.find(t=>t.id===x.tecnico_id)?.nome||'-',
          br(x.data_visita),
          tipoLabel[x.tipo_atendimento]||x.tipo_atendimento||'-',
          statusOS[x.status]||x.status
        ]),
        styles:{fontSize:6.8,cellPadding:1.5,overflow:'linebreak'},
        headStyles:{fillColor:[15,28,46]},margin:{left:10,right:10}
      })
    }
    if(topMateriais.length){
      autoTable(doc,{
        startY:(doc.lastAutoTable?.finalY||y)+7,
        head:[['Materiais mais utilizados','Quantidade','Valor']],
        body:topMateriais.map(x=>[x.nome,x.quantidade.toLocaleString('pt-BR'),money(x.valor)]),
        styles:{fontSize:7,cellPadding:1.6},headStyles:{fillColor:[21,55,45]},margin:{left:14,right:14}
      })
    }
    const pages=doc.getNumberOfPages()
    for(let p=1;p<=pages;p++){doc.setPage(p);doc.setFontSize(7);doc.setTextColor(120);doc.text(`FORTAL TECH • Relatório • Página ${p}/${pages}`,105,292,{align:'center'})}
    doc.save(`FORTAL_TECH_RELATORIO_${new Date().toISOString().slice(0,10)}.pdf`)
  }

  function exportarCSV(){
    const header=['OS','Cliente','Técnico','Data','Tipo','Status']
    const rows=osFiltradas.map(x=>[
      x.numero,
      x.clientes?.nome||clientes.find(c=>c.id===x.cliente_id)?.nome||'',
      tecnicos.find(t=>t.id===x.tecnico_id)?.nome||'',
      br(x.data_visita),
      tipoLabel[x.tipo_atendimento]||x.tipo_atendimento||'',
      statusOS[x.status]||x.status||''
    ])
    const csv=[header,...rows].map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(';')).join('\n')
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a');a.href=url;a.download=`FORTAL_TECH_RELATORIO_${new Date().toISOString().slice(0,10)}.csv`;a.click()
    setTimeout(()=>URL.revokeObjectURL(url),1000)
  }

  return <>
    <div className="toolbar">
      <div><h2>Relatórios</h2><p>Indicadores operacionais, produtividade e financeiro.</p></div>
      <div className="reportExportActions">
        <button className="ghost" onClick={exportarCSV}><FileDown size={16}/> CSV</button>
        <button className="primary" onClick={gerarPDF}><FileDown size={17}/> Gerar PDF</button>
      </div>
    </div>

    {erro&&<div className="warningBox">{erro}</div>}

    <div className="reportFilters advanced">
      <select value={periodo} onChange={e=>setPeriodo(e.target.value)}>
        <option value="hoje">Hoje</option><option value="mes">Este mês</option><option value="ano">Este ano</option>
        <option value="personalizado">Período personalizado</option><option value="todos">Todo o período</option>
      </select>
      {periodo==='personalizado'&&<>
        <input type="date" value={inicio} onChange={e=>setInicio(e.target.value)}/>
        <input type="date" value={fim} onChange={e=>setFim(e.target.value)}/>
      </>}
      <select value={cliente} onChange={e=>setCliente(e.target.value)}>
        <option value="">Todos os clientes</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
      <select value={tecnico} onChange={e=>setTecnico(e.target.value)}>
        <option value="">Todos os técnicos</option>{tecnicos.map(t=><option key={t.id} value={t.id}>{t.nome||t.email}</option>)}
      </select>
      <select value={tipo} onChange={e=>setTipo(e.target.value)}>
        <option value="">Todos os atendimentos</option>
        <option value="Manutenção Preventiva">Preventiva</option><option value="Manutenção Corretiva">Corretiva</option>
        <option value="Visita Técnica">Visita Técnica</option><option value="Retorno">Retorno</option><option value="Emergencial">Emergencial</option>
      </select>
      <select value={status} onChange={e=>setStatus(e.target.value)}>
        <option value="">Todos os status</option>{Object.entries(statusOS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
      </select>
      <button className="iconBtn" onClick={carregar}><RefreshCcw size={16} className={loading?'spin':''}/></button>
    </div>

    <div className="cards reportCards advancedCards">
      <div className="card"><ClipboardList/><div><span>Total de OS</span><strong>{totalOS}</strong></div></div>
      <div className="card"><CheckCircle2/><div><span>Conclusão</span><strong>{taxaConclusao}%</strong></div></div>
      <div className="card"><Clock3/><div><span>Pendentes</span><strong>{pendentes}</strong></div></div>
      <div className="card"><AlertTriangle/><div><span>Emergenciais</span><strong>{emergenciais}</strong></div></div>
      <div className="card"><PackageSearch/><div><span>Materiais</span><strong>{money(valorMateriais)}</strong></div></div>
      <div className="card"><BadgeDollarSign/><div><span>Aprovado</span><strong>{money(valorAprovado)}</strong></div></div>
      <div className="card"><Clock3/><div><span>A receber</span><strong>{money(aReceber)}</strong></div></div>
      <div className="card"><TrendingUp/><div><span>Recebido</span><strong>{money(recebido)}</strong></div></div>
    </div>

    <div className="grid2">
      <section className="panel">
        <h3>Atendimentos por tipo</h3>
        {porTipo.length===0?<div className="emptyInline">Sem dados.</div>:<div className="reportBars">
          {porTipo.map(([nome,qtd])=><div key={nome}><div><span>{nome}</span><b>{qtd}</b></div><i><em style={{width:`${qtd/maxTipo*100}%`}}/></i></div>)}
        </div>}
      </section>
      <section className="panel">
        <h3>Clientes com mais atendimentos</h3>
        {porCliente.length===0?<div className="emptyInline">Sem dados.</div>:<div className="reportBars">
          {porCliente.map(([nome,qtd])=><div key={nome}><div><span>{nome}</span><b>{qtd}</b></div><i><em style={{width:`${qtd/maxCliente*100}%`}}/></i></div>)}
        </div>}
      </section>
    </div>

    <div className="grid2">
      <section className="panel">
        <h3>Produtividade por técnico</h3>
        {porTecnico.length===0?<div className="emptyInline">Sem dados.</div>:<div className="technicianReport">
          {porTecnico.map(x=><div key={x.nome}>
            <div className="techReportLine"><div><Wrench size={14}/><span>{x.nome}</span></div><b>{x.total} OS • {x.taxa}% concluídas</b></div>
            <i><em style={{width:`${x.total/maxTecnico*100}%`}}/></i>
          </div>)}
        </div>}
      </section>
      <section className="panel">
        <h3>Materiais / peças mais utilizados</h3>
        {topMateriais.length===0?<div className="emptyInline">Sem materiais no período.</div>:<div className="materialsRanking">
          {topMateriais.map((x,i)=><div key={x.nome}><span>{i+1}</span><div><b>{x.nome}</b><small>Qtd. {x.quantidade.toLocaleString('pt-BR')}</small></div><strong>{money(x.valor)}</strong></div>)}
        </div>}
      </section>
    </div>

    <section className="panel">
      <div className="searchBar"><Search size={18}/><input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar OS, cliente, tipo ou status..."/></div>
      {osFiltradas.length===0?<div className="emptySmall"><BarChart3 size={36}/><b>Nenhuma OS encontrada</b></div>:
      <div className="reportTableScroll"><div className="reportTable advancedTable">
        <div className="reportTableHead"><span>OS</span><span>Cliente</span><span>Técnico</span><span>Data</span><span>Atendimento</span><span>Status</span></div>
        {osFiltradas.map(x=><div className="reportTableRow" key={x.id}>
          <b>{x.numero}</b><span>{x.clientes?.nome||'-'}</span><span>{tecnicos.find(t=>t.id===x.tecnico_id)?.nome||'-'}</span>
          <span>{br(x.data_visita)}</span><span>{tipoLabel[x.tipo_atendimento]||x.tipo_atendimento||'-'}</span><span>{statusOS[x.status]||x.status}</span>
        </div>)}
      </div></div>}
    </section>
  </>
}
