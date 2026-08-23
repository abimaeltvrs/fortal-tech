import React,{useEffect,useMemo,useState} from 'react'
import {X,ClipboardList,CalendarDays,Receipt,Package,AlertTriangle,FileDown} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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

 function gerarPDFCliente(){
   const doc=new jsPDF({unit:'mm',format:'a4'})
   const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
   const endereco=[cliente.endereco,cliente.numero,cliente.complemento,cliente.bairro,cliente.cidade,cliente.uf,cliente.cep].filter(Boolean).join(', ')
   let y=16

   doc.setFillColor(8,17,31);doc.rect(0,0,210,30,'F')
   doc.setTextColor(19,185,129);doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text('FORTAL TECH',14,13)
   doc.setTextColor(255,255,255);doc.setFontSize(11);doc.text('RELATÓRIO / HISTÓRICO DO CLIENTE',14,21)
   doc.setTextColor(30,30,30);y=39

   const line=(label,value)=>{
     doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text(label+':',14,y)
     doc.setFont('helvetica','normal')
     const lines=doc.splitTextToSize(String(value||'Não informado'),140)
     doc.text(lines,55,y);y+=Math.max(6,lines.length*4)
   }
   line('Cliente',cliente.nome)
   line('CPF / CNPJ',cliente.documento)
   line('Responsável',cliente.responsavel)
   line('Telefone',cliente.telefone)
   line('E-mail',cliente.email)
   line('Endereço',endereco)

   if(cliente.observacoes){
     y+=2;doc.setFont('helvetica','bold');doc.text('Observações:',14,y);y+=5
     doc.setFont('helvetica','normal')
     const lines=doc.splitTextToSize(cliente.observacoes,180)
     doc.text(lines,14,y);y+=lines.length*4+5
   }

   doc.setFillColor(15,28,46);doc.rect(14,y,182,8,'F')
   doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.text('RESUMO DO PERÍODO',17,y+5.5)
   doc.setTextColor(30,30,30);y+=13
   line('Ordens de Serviço',filtro.length)
   line('Concluídas',filtro.filter(x=>x.status==='concluida').length)
   line('Pendentes',filtro.filter(x=>['aguardando_material','aguardando_orcamento'].includes(x.status)).length)
   line('Custo de materiais',money(totalMateriais))

   if(filtro.length){
     autoTable(doc,{
       startY:y+2,
       head:[['OS','Data','Atendimento','Status','Descrição']],
       body:filtro.map(x=>[x.numero,br(x.data_visita),x.tipo_atendimento||'-',lbl[x.status]||x.status,x.motivo||'-']),
       styles:{fontSize:7,cellPadding:1.7,overflow:'linebreak'},
       headStyles:{fillColor:[15,28,46]},
       columnStyles:{0:{cellWidth:28},1:{cellWidth:22},2:{cellWidth:35},3:{cellWidth:31},4:{cellWidth:66}},
       margin:{left:14,right:14}
     })
     y=doc.lastAutoTable.finalY+6
   }

   const mats=[]
   filtro.forEach(x=>(x.os_materiais||[]).forEach(m=>mats.push([
     x.numero,m.descricao,Number(m.quantidade||0),money(m.preco_unitario),
     money(Number(m.quantidade||0)*Number(m.preco_unitario||0))
   ])))
   if(mats.length){
     if(y>245){doc.addPage();y=16}
     doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('Materiais / peças utilizados',14,y);y+=4
     autoTable(doc,{
       startY:y,
       head:[['OS','Item','Qtd.','Preço unit.','Subtotal']],
       body:mats,
       foot:[['','','','TOTAL',money(totalMateriais)]],
       styles:{fontSize:7,cellPadding:1.7},
       headStyles:{fillColor:[15,28,46]},
       footStyles:{fillColor:[19,185,129],textColor:[3,17,12],fontStyle:'bold'},
       margin:{left:14,right:14}
     })
   }

   const pages=doc.getNumberOfPages()
   for(let p=1;p<=pages;p++){
     doc.setPage(p);doc.setFontSize(7);doc.setTextColor(120)
     doc.text(`FORTAL TECH • Histórico de ${cliente.nome} • Página ${p}/${pages}`,105,292,{align:'center'})
   }
   const safe=(cliente.nome||'cliente').replace(/[^a-zA-Z0-9À-ÿ _-]/g,'').replace(/\s+/g,'_')
   doc.save(`FORTAL_TECH_HISTORICO_${safe}.pdf`)
 }
 return <div className="modalBackdrop"><div className="modal historyModal">
  <div className="modalHead">
   <div><span className="eyebrow">HISTÓRICO DO CLIENTE</span><h2>{cliente.nome}</h2></div>
   <div className="historyHeadActions">
    <button className="pdfHistoryBtn" onClick={gerarPDFCliente}><FileDown size={16}/> Gerar PDF</button>
    <button className="iconBtn" onClick={onClose}><X/></button>
   </div>
  </div>
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
