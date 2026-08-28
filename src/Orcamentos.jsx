import React,{useEffect,useMemo,useState} from 'react'
import {
  Plus,FileText,Search,Pencil,Trash2,X,Save,FileDown,
  BadgeDollarSign,CheckCircle2,Clock3,Send,Mail,MessageCircle,Share2
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {saveDraft,loadDraft,clearDraft,draftAgeLabel} from './drafts'

const empty={
  cliente_id:'',os_id:'',data_orcamento:'',validade:'',
  status:'elaboracao',desconto:0,total:0,forma_pagamento:'',metodo_pagamento:'pix',parcelas:1,observacoes:''
}

function money(v){
  return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
}
function br(v){
  if(!v)return '-'
  const [y,m,d]=String(v).slice(0,10).split('-')
  return y&&m&&d?`${d}/${m}/${y}`:v
}
function numero(){
  const d=new Date()
  return `ORC-${d.getFullYear()}-${String(Date.now()).slice(-6)}`
}
const statusLabel={
  elaboracao:'Em elaboração',
  enviado:'Enviado / Aguardando aprovação',
  aprovado:'Aprovado',
  recusado:'Recusado',
  expirado:'Expirado'
}

export default function Orcamentos({supabase,profile,session}){
  const [lista,setLista]=useState([])
  const [clientes,setClientes]=useState([])
  const [ordens,setOrdens]=useState([])
  const [busca,setBusca]=useState('')
  const [modal,setModal]=useState(false)
  const [edit,setEdit]=useState(null)
  const [form,setForm]=useState(empty)
  const [itens,setItens]=useState([])
  const [erro,setErro]=useState('')
  const [sucesso,setSucesso]=useState('')
  const [salvando,setSalvando]=useState(false)
  const [envio,setEnvio]=useState(null)
  const [enviando,setEnviando]=useState(false)
  const [financeiroPorOrcamento,setFinanceiroPorOrcamento]=useState({})
  const [importandoOS,setImportandoOS]=useState(false)
  const [osImportada,setOsImportada]=useState('')
  const [visualizacao,setVisualizacao]=useState(null)
  const [itensVisualizacao,setItensVisualizacao]=useState([])
  const [draftRecovered,setDraftRecovered]=useState(null)
  const [draftDirty,setDraftDirty]=useState(false)


  useEffect(()=>{
    if(!modal)return
    setDraftDirty(true)
    const t=setTimeout(()=>saveDraft(budgetDraftKey(),buildBudgetDraft()),450)
    return()=>clearTimeout(t)
  },[modal,edit?.id,form,itens,osImportada])

  async function carregar(){
    setErro('')
    const [or,cr,osr,fr]=await Promise.all([
      supabase.from('orcamentos').select('*,clientes(nome)').order('created_at',{ascending:false}),
      supabase.from('clientes').select('*').order('nome'),
      supabase.from('ordens_servico').select('id,numero,cliente_id,status,necessita_orcamento').order('created_at',{ascending:false}),
      supabase.from('financeiro_lancamentos').select('id,orcamento_id,status,valor')
    ])
    if(or.error){setErro(or.error.message);return}
    setLista(or.data||[])
    setClientes(cr.data||[])
    setOrdens(osr.data||[])
    const map={}
    for(const f of (fr.data||[])){
      if(!f.orcamento_id)continue
      ;(map[f.orcamento_id] ||= []).push(f)
    }
    setFinanceiroPorOrcamento(map)
  }

  useEffect(()=>{carregar()},[])

  useEffect(()=>{
    const abrir=()=>novo()
    window.addEventListener('fortal:new-orcamento',abrir)
    return()=>window.removeEventListener('fortal:new-orcamento',abrir)
  },[])

  useEffect(()=>{
    const handler=(e)=>{
      const os=e.detail
      if(!os)return
      const hoje=new Date()
      const validade=new Date(hoje.getTime()+15*86400000)
      setEdit(null)
      setForm({...empty,
        cliente_id:os.cliente_id||'',
        os_id:os.id,
        data_orcamento:hoje.toISOString().slice(0,10),
        validade:validade.toISOString().slice(0,10),
        observacoes:os.descricao_orcamento||os.recomendacoes||''
      })
      setItens([{id:crypto.randomUUID(),tipo:'servico',descricao:'Serviço técnico conforme OS '+os.numero,quantidade:1,valor_unitario:0}])
      setOsImportada('')
      setModal(true)
      setTimeout(()=>importarItensDaOS(os.id,{confirmar:false}),120)
    }
    window.addEventListener('fortal:orcamento-from-os',handler)
    return()=>window.removeEventListener('fortal:orcamento-from-os',handler)
  },[])


  async function importarItensDaOS(osId,{confirmar=true}={}){
    if(!osId)return
    const os=ordens.find(x=>x.id===osId)
    if(!os)return

    if(confirmar && itens.length>0){
      const ok=confirm('Importar os itens desta OS? Os itens já adicionados ao orçamento serão mantidos.')
      if(!ok)return
    }

    setImportandoOS(true)
    setErro('')
    try{
      const {data:mat,error}=await supabase
        .from('os_materiais')
        .select('*')
        .eq('os_id',osId)
        .order('id')

      if(error)throw error

      const importados=(mat||[]).map(x=>({
        id:crypto.randomUUID(),
        tipo:'material',
        descricao:x.nome_item||x.item||x.descricao||x.nome||'Material da OS',
        quantidade:Number(x.quantidade||1),
        valor_unitario:Number(x.preco_unitario??x.preco??x.valor_unitario??x.valor??0),
        origem_os_item_id:x.id
      }))

      if(!importados.length){
        setSucesso(`A ${os.numero} não possui materiais/peças registrados para importar.`)
        setOsImportada(osId)
        return
      }

      setItens(atual=>{
        const existentes=new Set(atual.map(i=>i.origem_os_item_id).filter(Boolean))
        return [...atual,...importados.filter(i=>!existentes.has(i.origem_os_item_id))]
      })
      setOsImportada(osId)
      setSucesso(`${importados.length} item(ns) da ${os.numero} importado(s) com quantidade e preço para o orçamento.`)
    }catch(e){
      setErro(`Não foi possível importar os itens da OS: ${e.message||'erro não identificado.'}`)
    }finally{
      setImportandoOS(false)
    }
  }


  function budgetDraftKey(){
    return edit?.id ? `orcamento:${edit.id}` : 'orcamento:new'
  }

  function buildBudgetDraft(){
    return {form,itens,osImportada}
  }

  function restoreBudgetDraft(data){
    if(!data)return
    if(data.form)setForm(data.form)
    if(Array.isArray(data.itens))setItens(data.itens)
    if(typeof data.osImportada==='string')setOsImportada(data.osImportada)
  }

  function descartarBudgetDraft(){
    clearDraft(budgetDraftKey())
    setDraftRecovered(null)
    setDraftDirty(false)
  }

  function novo(){
    const hoje=new Date()
    const validade=new Date(hoje.getTime()+15*86400000)
    setEdit(null)
    setErro('')
    setOsImportada('')
    setForm({...empty,
      data_orcamento:hoje.toISOString().slice(0,10),
      validade:validade.toISOString().slice(0,10)
    })
    setItens([])
    const saved=loadDraft('orcamento:new')
    if(saved?.data){
      restoreBudgetDraft(saved.data)
      setDraftRecovered(saved.saved_at)
    }else{
      setDraftRecovered(null)
    }
    setModal(true)
  }


  async function visualizar(o){
    setErro('')
    const {data,error}=await supabase
      .from('orcamento_itens')
      .select('*')
      .eq('orcamento_id',o.id)
      .order('id')

    if(error){
      setErro(`Não foi possível abrir o orçamento: ${error.message}`)
      return
    }

    setItensVisualizacao(data||[])
    setVisualizacao(o)
  }

  async function editar(o){
    setEdit(o)
    setErro('')
    setForm({...empty,...o})
    const {data,error}=await supabase.from('orcamento_itens').select('*').eq('orcamento_id',o.id).order('id')
    if(error){setErro(error.message);return}
    setItens(data||[])
    const savedDraft=loadDraft(`orcamento:${o.id}`)
    if(savedDraft?.data){
      restoreBudgetDraft(savedDraft.data)
      setDraftRecovered(savedDraft.saved_at)
    }else{
      setDraftRecovered(null)
    }
    setModal(true)
  }

  const subtotal=useMemo(()=>itens.reduce((s,x)=>s+Number(x.quantidade||0)*Number(x.valor_unitario||0),0),[itens])
  const total=Math.max(0,subtotal-Number(form.desconto||0))

  function addItem(tipo='servico'){
    setItens(x=>[...x,{id:crypto.randomUUID(),tipo,descricao:'',quantidade:1,valor_unitario:0}])
  }
  function upd(id,key,val){
    setItens(x=>x.map(i=>i.id===id?{...i,[key]:val}:i))
  }


  function addMonths(date,months){
    const d=new Date(date)
    const day=d.getDate()
    d.setMonth(d.getMonth()+months)
    if(d.getDate()<day)d.setDate(0)
    return d
  }

  async function gerarFinanceiroDoOrcamento(orcamento){
    const {data:existing,error:existingError}=await supabase
      .from('financeiro_lancamentos')
      .select('id')
      .eq('orcamento_id',orcamento.id)

    if(existingError)throw existingError
    if(existing?.length)return {created:false,count:existing.length}

    const parcelas=Math.max(1,Number(orcamento.parcelas||1))
    const metodo=orcamento.metodo_pagamento||'pix'
    const total=Number(orcamento.total||0)
    const baseDate=new Date()
    const valorBase=Math.floor((total/parcelas)*100)/100
    let acumulado=0
    const rows=[]

    for(let i=1;i<=parcelas;i++){
      const valor=i===parcelas ? Math.round((total-acumulado)*100)/100 : valorBase
      acumulado+=valor
      let venc=new Date(baseDate)
      if(metodo==='credito' && parcelas>1) venc=addMonths(baseDate,i-1)

      rows.push({
        cliente_id:orcamento.cliente_id,
        orcamento_id:orcamento.id,
        tipo:'receita',
        descricao:`Orçamento ${orcamento.numero}${parcelas>1?` - parcela ${i}/${parcelas}`:''}`,
        valor,
        metodo_pagamento:metodo,
        parcela_numero:i,
        parcela_total:parcelas,
        vencimento:venc.toISOString().slice(0,10),
        status:'pendente'
      })
    }

    const {data,error}=await supabase
      .from('financeiro_lancamentos')
      .insert(rows)
      .select()

    if(error)throw error
    return {created:true,count:data?.length||0}
  }

  async function atualizarStatus(o,novoStatus){
    setErro('');setSucesso('')
    try{
      const patch={status:novoStatus,updated_at:new Date().toISOString()}
      if(novoStatus==='aprovado') patch.aprovado_em=new Date().toISOString()

      const {data,error}=await supabase.from('orcamentos').update(patch).eq('id',o.id).select().single()
      if(error)throw error

      if(novoStatus==='aprovado'){
        try{
          const result=await gerarFinanceiroDoOrcamento(data)
          setSucesso(result.created
            ? `${o.numero} aprovado e lançado automaticamente no Financeiro.`
            : `${o.numero} aprovado. O lançamento financeiro já existia e não foi duplicado.`
          )
        }catch(finError){
          await supabase.from('orcamentos').update({
            status:'enviado',
            aprovado_em:null,
            updated_at:new Date().toISOString()
          }).eq('id',o.id)
          throw new Error(`Falha ao lançar no Financeiro. O orçamento voltou para Aguardando aprovação. ${finError.message||''}`)
        }
      }else{
        setSucesso(`Status do ${o.numero} atualizado.`)
      }
      await carregar()
    }catch(e){
      const msg=String(e.message||'')
      if(msg.includes('financeiro_lancamentos')){
        setErro('Não foi possível concluir a aprovação porque a tabela financeira ainda não está disponível no Supabase. Execute o SQL da V1.6.3.')
      }else{
        setErro(`Não foi possível atualizar o status: ${msg}`)
      }
    }
  }

  async function marcarComoEnviado(o,canal){
    const agora=new Date().toISOString()
    const {data,error}=await supabase.from('orcamentos').update({
      status:'enviado',
      enviado_em:agora,
      canal_envio:canal,
      updated_at:agora
    }).eq('id',o.id).select().single()
    if(error)throw error
    await carregar()
    return data
  }

  async function salvar(e){
    e.preventDefault()
    setErro('');setSucesso('')
    if(!form.cliente_id)return setErro('Selecione o cliente.')
    if(!itens.length)return setErro('Adicione pelo menos um item ao orçamento.')
    if(itens.some(x=>!x.descricao.trim()))return setErro('Preencha a descrição de todos os itens.')

    setSalvando(true)
    const id=edit?.id||crypto.randomUUID()
    const payload={
      ...form,
      id,
      numero:edit?.numero||numero(),
      cliente_id:form.cliente_id,
      os_id:form.os_id||null,
      desconto:Number(form.desconto||0),
      total,
      metodo_pagamento:form.metodo_pagamento||'pix',
      parcelas:Math.max(1,Number(form.parcelas||1)),
      data_orcamento:form.data_orcamento||new Date().toISOString().slice(0,10),
      validade:form.validade||null,
      updated_at:new Date().toISOString()
    }

    try{
      const {data,error}=await supabase.from('orcamentos').upsert(payload,{onConflict:'id'}).select().single()
      if(error)throw error

      const {error:delErr}=await supabase.from('orcamento_itens').delete().eq('orcamento_id',id)
      if(delErr)throw delErr

      const rows=itens.map(x=>({
        orcamento_id:id,
        tipo:x.tipo,
        descricao:x.descricao.trim(),
        quantidade:Number(x.quantidade||1),
        valor_unitario:Number(x.valor_unitario||0)
      }))
      const {error:itErr}=await supabase.from('orcamento_itens').insert(rows)
      if(itErr)throw itErr

      clearDraft(edit?.id ? `orcamento:${edit.id}` : 'orcamento:new')
      if(data?.id)clearDraft(`orcamento:${data.id}`)
      setDraftRecovered(null)
      setDraftDirty(false)
      setModal(false)
      await carregar()
      setSucesso(edit?'Orçamento atualizado com sucesso.':'Orçamento criado com sucesso.')
    }catch(e){
      setErro(`Não foi possível salvar o orçamento: ${e.message}`)
    }finally{
      setSalvando(false)
    }
  }

  async function excluir(o){
    if(!confirm(`Excluir ${o.numero}?`))return
    const {error}=await supabase.from('orcamentos').delete().eq('id',o.id)
    if(error){setErro(error.message);return}
    await carregar()
  }

  async function montarPDF(o){
      const cliente=clientes.find(c=>c.id===o.cliente_id)||{}
      const {data:rows,error}=await supabase.from('orcamento_itens').select('*').eq('orcamento_id',o.id)
      if(error)throw error
      const doc=new jsPDF({unit:'mm',format:'a4'})
      doc.setFillColor(8,17,31);doc.rect(0,0,210,31,'F')
      doc.setTextColor(19,185,129);doc.setFont('helvetica','bold');doc.setFontSize(19);doc.text('FORTAL TECH',14,13)
      doc.setTextColor(255,255,255);doc.setFontSize(12);doc.text('ORÇAMENTO / PROPOSTA COMERCIAL',14,22)
      doc.setTextColor(30,30,30)

      let y=40
      const line=(l,v)=>{
        doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text(l+':',14,y)
        doc.setFont('helvetica','normal')
        const t=doc.splitTextToSize(String(v||'-'),140)
        doc.text(t,55,y);y+=Math.max(6,t.length*4)
      }

      line('Orçamento',o.numero)
      line('Data',br(o.data_orcamento))
      line('Validade',br(o.validade))
      line('Cliente',cliente.nome)
      line('CPF / CNPJ',cliente.documento)
      line('Responsável',cliente.responsavel)
      line('Telefone',cliente.telefone)
      line('Endereço',[cliente.endereco,cliente.numero,cliente.bairro,cliente.cidade,cliente.uf].filter(Boolean).join(', '))
      if(o.os_id) line('OS relacionada',ordens.find(x=>x.id===o.os_id)?.numero||'-')

      autoTable(doc,{
        startY:y+3,
        head:[['Tipo','Descrição','Qtd.','Valor unit.','Subtotal']],
        body:(rows||[]).map(x=>[
          x.tipo==='material'?'Material':'Serviço',
          x.descricao,
          Number(x.quantidade||0).toLocaleString('pt-BR'),
          money(x.valor_unitario),
          money(Number(x.quantidade||0)*Number(x.valor_unitario||0))
        ]),
        foot:[
          ['','','','Subtotal',money((rows||[]).reduce((s,x)=>s+Number(x.quantidade||0)*Number(x.valor_unitario||0),0))],
          ['','','','Desconto',money(o.desconto)],
          ['','','','TOTAL',money(o.total)]
        ],
        styles:{fontSize:8,cellPadding:2},
        headStyles:{fillColor:[15,28,46]},
        footStyles:{fillColor:[19,185,129],textColor:[3,17,12],fontStyle:'bold'},
        margin:{left:14,right:14}
      })

      y=doc.lastAutoTable.finalY+9
      const metodo=({pix:'Pix',debito:'Cartão de débito',credito:'Cartão de crédito'})[o.metodo_pagamento]||o.metodo_pagamento||'-'
      doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('Forma de pagamento:',14,y)
      doc.setFont('helvetica','normal');doc.text(`${metodo}${o.metodo_pagamento==='credito'&&Number(o.parcelas||1)>1?` • ${o.parcelas}x`:''}`,55,y);y+=7
      if(o.forma_pagamento){
        doc.setFont('helvetica','bold');doc.text('Condições:',14,y)
        doc.setFont('helvetica','normal');doc.text(o.forma_pagamento,55,y);y+=7
      }
      if(o.observacoes){
        doc.setFont('helvetica','bold');doc.text('Observações:',14,y);y+=5
        doc.setFont('helvetica','normal')
        const lines=doc.splitTextToSize(o.observacoes,180)
        doc.text(lines,14,y)
      }

      const pages=doc.getNumberOfPages()
      for(let p=1;p<=pages;p++){
        doc.setPage(p);doc.setFontSize(7);doc.setTextColor(120)
        doc.text(`FORTAL TECH • ${o.numero} • Página ${p}/${pages}`,105,292,{align:'center'})
      }
      return doc
  }

  async function gerarPDF(o){
    try{
      const doc=await montarPDF(o)
      doc.save(`${o.numero}.pdf`)
      setSucesso(`PDF do ${o.numero} gerado.`)
    }catch(e){
      setErro(`Não foi possível gerar o PDF: ${e.message}`)
    }
  }

  function clienteDoOrcamento(o){
    return clientes.find(c=>c.id===o.cliente_id)||{}
  }

  function telefoneWhatsApp(raw=''){
    return String(raw).replace(/\D/g,'')
  }

  async function compartilharPDF(o){
    try{
      const doc=await montarPDF(o)
      const blob=doc.output('blob')
      const file=new File([blob],`${o.numero}.pdf`,{type:'application/pdf'})
      const cliente=clienteDoOrcamento(o)
      const shareData={
        title:`Orçamento ${o.numero} - FORTAL TECH`,
        text:`Olá ${cliente.responsavel||cliente.nome||''}, segue o orçamento ${o.numero} da FORTAL TECH no valor de ${money(o.total)}.`,
        files:[file]
      }
      if(navigator.canShare?.({files:[file]}) && navigator.share){
        await navigator.share(shareData)
        return true
      }
      return false
    }catch(e){
      console.error(e)
      return false
    }
  }

  async function enviarWhatsApp(o){
    const cliente=clienteDoOrcamento(o)
    const fone=telefoneWhatsApp(cliente.telefone)
    if(!fone){
      setErro('Este cliente não possui telefone cadastrado.')
      return
    }

    setEnviando(true)
    try{
      const shared=await compartilharPDF(o)
      if(shared){
        await marcarComoEnviado(o,'whatsapp')
        setEnvio(null)
        setSucesso('Orçamento enviado e aguardando aprovação.')
        return
      }

      const texto=encodeURIComponent(
        `Olá ${cliente.responsavel||cliente.nome||''}, segue o orçamento ${o.numero} da FORTAL TECH.\n`+
        `Valor total: ${money(o.total)}\n`+
        `Validade: ${br(o.validade)}`
      )
      const numeroBR=fone.startsWith('55')?fone:`55${fone}`
      window.open(`https://wa.me/${numeroBR}?text=${texto}`,'_blank')
      await marcarComoEnviado(o,'whatsapp')
      setSucesso('WhatsApp aberto. Orçamento marcado como Enviado / Aguardando aprovação.')
      setEnvio(null)
    }finally{
      setEnviando(false)
    }
  }

  async function enviarEmail(o){
    const cliente=clienteDoOrcamento(o)
    if(!cliente.email){
      setErro('Este cliente não possui e-mail cadastrado.')
      return
    }

    setEnviando(true)
    try{
      const shared=await compartilharPDF(o)
      if(shared){
        await marcarComoEnviado(o,'email')
        setEnvio(null)
        setSucesso('Orçamento enviado e aguardando aprovação.')
        return
      }

      const assunto=encodeURIComponent(`Orçamento ${o.numero} - FORTAL TECH`)
      const corpo=encodeURIComponent(
        `Olá ${cliente.responsavel||cliente.nome||''},\n\n`+
        `Segue o orçamento ${o.numero} da FORTAL TECH.\n`+
        `Valor total: ${money(o.total)}\n`+
        `Validade: ${br(o.validade)}\n\n`+
        `Atenciosamente,\nFORTAL TECH`
      )
      await marcarComoEnviado(o,'email')
      window.location.href=`mailto:${cliente.email}?subject=${assunto}&body=${corpo}`
      setEnvio(null)
    }finally{
      setEnviando(false)
    }
  }

  const filtrados=lista.filter(o=>{
    const q=busca.toLowerCase().trim()
    if(!q)return true
    return [o.numero,o.clientes?.nome,statusLabel[o.status]].filter(Boolean).join(' ').toLowerCase().includes(q)
  })

  return <>
    <div className="toolbar">
      <div><h2>Orçamentos</h2><p>Propostas comerciais vinculadas aos clientes e Ordens de Serviço.</p></div>
      <button className="primary" onClick={novo}><Plus size={18}/> Novo orçamento</button>
    </div>

    {sucesso&&<div className="successBox">{sucesso}</div>}
    {erro&&<div className="warningBox">{erro}</div>}

    <section className="panel">
      <div className="searchBar">
        <Search size={18}/>
        <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar orçamento, cliente ou status..." />
      </div>

      {filtrados.length===0?
        <div className="emptySmall"><FileText size={36}/><b>Nenhum orçamento encontrado</b></div>:
        <div className="budgetList">
          {filtrados.map(o=><div className="budgetRow clickableBudget" key={o.id} onClick={()=>visualizar(o)}>
            <div className="budgetTopLine">
              <div className="budgetMain">
                <div className="budgetIcon"><BadgeDollarSign size={20}/></div>
                <div className="budgetText">
                  <b>{o.numero}</b>
                  <span>{o.clientes?.nome||'Cliente'} • {br(o.data_orcamento)}</span>
                  <small>{money(o.total)}</small>
                </div>
              </div>
              <div className="budgetStatusStack">
                <span className={`statusBadge budget-${o.status}`}>{statusLabel[o.status]}</span>
                {o.status==='aprovado'&&financeiroPorOrcamento[o.id]?.length>0&&
                  <span className="financeLinkedBadge">Lançado no Financeiro</span>}
              </div>
            </div>

            <div className="budgetActions" onClick={e=>e.stopPropagation()}>
              {o.status==='enviado'&&<button className="approveBudgetBtn" title="Marcar como aprovado" onClick={()=>atualizarStatus(o,'aprovado')}><CheckCircle2 size={15}/> Aprovar</button>}
              {o.status==='aprovado'&&financeiroPorOrcamento[o.id]?.length>0&&
                <button className="financeOpenBtn" title="Abrir Financeiro" onClick={()=>window.dispatchEvent(new CustomEvent('fortal:open-finance',{detail:o.id}))}>
                  <BadgeDollarSign size={15}/> Financeiro
                </button>}
              {o.status!=='aprovado'&&<button className="sendBudgetBtn" title="Enviar orçamento" onClick={()=>setEnvio(o)}><Send size={15}/> Enviar</button>}
              <button className="iconBtn pdfBtn" title="Gerar PDF" onClick={()=>gerarPDF(o)}><FileDown size={17}/></button>
              <button className="iconBtn" title="Editar" onClick={()=>editar(o)}><Pencil size={17}/></button>
              <button className="iconBtn danger" title="Excluir" onClick={()=>excluir(o)}><Trash2 size={17}/></button>
            </div>
          </div>)}
        </div>}
    </section>

    {modal&&<div className="modalBackdrop">
      <div className="modal budgetModal">
        <div className="modalHead">
          <div><span className="eyebrow">FORTAL TECH</span><h2>{edit?edit.numero:'Novo orçamento'}</h2></div>
          <button className="iconBtn" onClick={()=>setModal(false)}><X/></button>
        </div>
        {draftRecovered&&<div className="draftRecoveredBanner budgetDraftBanner">
          <div><b>Rascunho recuperado</b><span>Orçamento restaurado {draftAgeLabel(draftRecovered)}.</span></div>
          <button type="button" onClick={descartarBudgetDraft}>Descartar rascunho</button>
        </div>}
        {!draftRecovered&&draftDirty&&<div className="draftSavingHint">Rascunho salvo automaticamente neste aparelho.</div>}


        {erro&&<div className="warningBox modalError">{erro}</div>}

        <form onSubmit={salvar}>
          <div className="formGrid">
            <div className="field span2"><label>Cliente *</label>
              <select required value={form.cliente_id} onChange={e=>setForm({...form,cliente_id:e.target.value,os_id:''})}>
                <option value="">Selecione...</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="field span2"><label>OS relacionada</label>
              <select value={form.os_id||''} onChange={async e=>{
                const osId=e.target.value
                setForm({...form,os_id:osId})
                setOsImportada('')
                if(osId) await importarItensDaOS(osId)
              }}>
                <option value="">Sem OS relacionada</option>
                {ordens.filter(x=>!form.cliente_id||x.cliente_id===form.cliente_id).map(x=><option key={x.id} value={x.id}>{x.numero}</option>)}
              </select>
              {form.os_id&&<div className="osImportTools">
                <button type="button" disabled={importandoOS} onClick={()=>importarItensDaOS(form.os_id,{confirmar:false})}>
                  {importandoOS?'Importando...':'Importar materiais/peças da OS'}
                </button>
                {osImportada===form.os_id&&<span>Itens da OS verificados</span>}
              </div>}
            </div>
            <div className="field"><label>Data do orçamento</label><input type="date" value={form.data_orcamento||''} onChange={e=>setForm({...form,data_orcamento:e.target.value})}/></div>
            <div className="field"><label>Validade</label><input type="date" value={form.validade||''} onChange={e=>setForm({...form,validade:e.target.value})}/></div>
            <div className="field"><label>Status</label>
              <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                {Object.entries(statusLabel).map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="field"><label>Forma de pagamento</label>
              <select value={form.metodo_pagamento||'pix'} onChange={e=>{
                const metodo=e.target.value
                setForm({...form,metodo_pagamento:metodo,parcelas:metodo==='credito'?Math.max(1,Number(form.parcelas||1)):1})
              }}>
                <option value="pix">Pix</option>
                <option value="debito">Cartão de débito</option>
                <option value="credito">Cartão de crédito</option>
              </select>
            </div>
            <div className="field"><label>Parcelas</label>
              <select disabled={form.metodo_pagamento!=='credito'} value={form.parcelas||1} onChange={e=>setForm({...form,parcelas:Number(e.target.value)})}>
                {Array.from({length:12},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}x</option>)}
              </select>
            </div>
            <div className="field span2"><label>Condições / observação de pagamento</label><input value={form.forma_pagamento||''} onChange={e=>setForm({...form,forma_pagamento:e.target.value})} placeholder="Ex.: vencimento, entrada, observação adicional..."/></div>
          </div>

          <div className="osSection">
            <div className="sectionHead">
              <h3>Itens do orçamento</h3>
              <div className="budgetAddButtons">
                <button type="button" className="ghost" onClick={()=>addItem('servico')}>+ Serviço</button>
                <button type="button" className="ghost" onClick={()=>addItem('material')}>+ Material</button>
              </div>
            </div>

            {itens.length===0?<div className="emptyInline">Nenhum item adicionado.</div>:
              <>
                <div className="budgetItemHeader"><span>Tipo</span><span>Descrição</span><span>Qtd.</span><span>Valor unit.</span><span>Subtotal</span><span></span></div>
                {itens.map(i=><div className="budgetItemRow" key={i.id}>
                  <select value={i.tipo} onChange={e=>upd(i.id,'tipo',e.target.value)}><option value="servico">Serviço</option><option value="material">Material</option></select>
                  <input value={i.descricao} onChange={e=>upd(i.id,'descricao',e.target.value)} placeholder="Descrição do item"/>
                  <input type="number" min="0" step="0.01" value={i.quantidade} onChange={e=>upd(i.id,'quantidade',e.target.value)}/>
                  <input type="number" min="0" step="0.01" value={i.valor_unitario} onChange={e=>upd(i.id,'valor_unitario',e.target.value)}/>
                  <strong>{money(Number(i.quantidade||0)*Number(i.valor_unitario||0))}</strong>
                  <button type="button" className="iconBtn danger" onClick={()=>setItens(x=>x.filter(y=>y.id!==i.id))}><Trash2 size={15}/></button>
                </div>)}
              </>
            }

            <div className="budgetTotals">
              <div><span>Subtotal</span><b>{money(subtotal)}</b></div>
              <div><span>Desconto</span><input type="number" min="0" step="0.01" value={form.desconto||0} onChange={e=>setForm({...form,desconto:e.target.value})}/></div>
              <div className="grand"><span>Total</span><b>{money(total)}</b></div>
            </div>
          </div>

          <div className="field span2"><label>Observações</label><textarea rows="4" value={form.observacoes||''} onChange={e=>setForm({...form,observacoes:e.target.value})}/></div>

          <div className="modalActions">
            <button type="button" className="ghost" onClick={()=>setModal(false)}>Cancelar</button>
            <button className="primary" disabled={salvando}><Save size={17}/>{salvando?'Salvando...':'Salvar orçamento'}</button>
          </div>
        </form>
      </div>
    </div>}
  

    {visualizacao&&<div className="modalBackdrop">
      <div className="modal budgetViewModal">
        <div className="modalHead">
          <div>
            <span className="eyebrow">ORÇAMENTO</span>
            <h2>{visualizacao.numero}</h2>
          </div>
          <button className="iconBtn" onClick={()=>setVisualizacao(null)}><X/></button>
        </div>

        <div className="budgetViewStatus">
          <span className={`statusBadge budget-${visualizacao.status}`}>{statusLabel[visualizacao.status]}</span>
          <strong>{money(visualizacao.total)}</strong>
        </div>

        <div className="budgetViewInfo">
          <div><span>Cliente</span><b>{clientes.find(c=>c.id===visualizacao.cliente_id)?.nome||'Cliente'}</b></div>
          <div><span>Data</span><b>{br(visualizacao.data_orcamento)}</b></div>
          <div><span>Validade</span><b>{br(visualizacao.validade)}</b></div>
          <div><span>Pagamento</span><b>{({pix:'Pix',debito:'Cartão de débito',credito:'Cartão de crédito'})[visualizacao.metodo_pagamento]||'-'}{visualizacao.metodo_pagamento==='credito'&&Number(visualizacao.parcelas||1)>1?` • ${visualizacao.parcelas}x`:''}</b></div>
        </div>

        <section className="osSection">
          <h3>OS relacionada</h3>
          {visualizacao.os_id?(()=>{
            const rel=ordens.find(x=>x.id===visualizacao.os_id)
            return <div className="relatedOSCard">
              <div>
                <b>{rel?.numero||'OS vinculada'}</b>
                <span>Status: {rel?.status||'-'}</span>
              </div>
              <button type="button" onClick={()=>{
                setVisualizacao(null)
                window.dispatchEvent(new CustomEvent('fortal:open-os',{detail:visualizacao.os_id}))
              }}>Visualizar OS</button>
            </div>
          })():<div className="emptyInline">Este orçamento não possui OS relacionada.</div>}
        </section>

        <section className="osSection">
          <h3>Itens do orçamento</h3>
          {itensVisualizacao.length===0?<div className="emptyInline">Nenhum item.</div>:
            <div className="budgetViewItems">
              {itensVisualizacao.map((i,n)=><div key={i.id} className="budgetViewItem">
                <span>{n+1}</span>
                <div><b>{i.descricao}</b><small>{i.tipo==='material'?'Material':'Serviço'} • Qtd. {Number(i.quantidade||0).toLocaleString('pt-BR')}</small></div>
                <strong>{money(Number(i.quantidade||0)*Number(i.valor_unitario||0))}</strong>
              </div>)}
            </div>}
        </section>

        <div className="budgetViewTotals">
          <div><span>Subtotal</span><b>{money(itensVisualizacao.reduce((s,i)=>s+Number(i.quantidade||0)*Number(i.valor_unitario||0),0))}</b></div>
          <div><span>Desconto</span><b>{money(visualizacao.desconto)}</b></div>
          <div className="grand"><span>Total</span><b>{money(visualizacao.total)}</b></div>
        </div>

        {visualizacao.forma_pagamento&&<section className="osSection">
          <h3>Condições de pagamento</h3>
          <div className="clientNotes">{visualizacao.forma_pagamento}</div>
        </section>}

        {visualizacao.observacoes&&<section className="osSection">
          <h3>Observações</h3>
          <div className="clientNotes">{visualizacao.observacoes}</div>
        </section>}

        <div className="budgetViewActions">
          <button className="ghost" onClick={()=>gerarPDF(visualizacao)}><FileDown size={16}/> Gerar PDF</button>
          <button className="primary" onClick={()=>{
            const item=visualizacao
            setVisualizacao(null)
            editar(item)
          }}><Pencil size={16}/> Editar orçamento</button>
        </div>
      </div>
    </div>}

    {envio&&<div className="modalBackdrop">
      <div className="sendBudgetModal">
        <div className="modalHead">
          <div><span className="eyebrow">ENVIAR ORÇAMENTO</span><h2>{envio.numero}</h2></div>
          <button className="iconBtn" onClick={()=>setEnvio(null)}><X/></button>
        </div>

        <div className="sendClientSummary">
          <b>{clienteDoOrcamento(envio).nome||'Cliente'}</b>
          <span>{clienteDoOrcamento(envio).email||'E-mail não cadastrado'}</span>
          <span>{clienteDoOrcamento(envio).telefone||'Telefone não cadastrado'}</span>
        </div>

        <p>Escolha como deseja encaminhar o orçamento. Em celulares compatíveis, o aplicativo tenta compartilhar também o PDF.</p>

        <div className="sendOptions">
          <button disabled={enviando} onClick={()=>enviarWhatsApp(envio)}>
            <MessageCircle size={23}/>
            <div><b>WhatsApp</b><span>Enviar para o telefone cadastrado</span></div>
          </button>
          <button disabled={enviando} onClick={()=>enviarEmail(envio)}>
            <Mail size={23}/>
            <div><b>E-mail</b><span>Usar o e-mail cadastrado do cliente</span></div>
          </button>
          <button disabled={enviando} onClick={async()=>{
            setEnviando(true)
            const ok=await compartilharPDF(envio)
            if(ok){
              await marcarComoEnviado(envio,'compartilhar')
              setSucesso('Orçamento enviado e aguardando aprovação.')
              setEnvio(null)
            }else{
              gerarPDF(envio)
            }
            setEnviando(false)
          }}>
            <Share2 size={23}/>
            <div><b>Compartilhar</b><span>Abrir o compartilhamento do celular</span></div>
          </button>
        </div>

        <div className="sendNote">
          No navegador/PWA, o envio por e-mail abre o aplicativo de e-mail do aparelho já com destinatário e mensagem preenchidos. Envio automático sem abrir o e-mail será ativado quando configurarmos um serviço de e-mail no backend.
        </div>
      </div>
    </div>}

  </>
}
