import React,{useEffect,useMemo,useState} from 'react'
import {
  Wallet,ArrowDownCircle,ArrowUpCircle,Plus,Search,CheckCircle2,
  Clock3,AlertTriangle,Trash2,X,RefreshCcw,Landmark,ReceiptText
} from 'lucide-react'
import {saveDraft,loadDraft,clearDraft,draftAgeLabel} from './drafts'

function money(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function isoToday(){return new Date().toISOString().slice(0,10)}
function br(v){if(!v)return '-';const d=new Date(String(v).slice(0,10)+'T12:00:00');return d.toLocaleDateString('pt-BR')}
const categoriasEntrada=['Serviços','Recebimento de orçamento','Venda de material','Reembolso','Outras receitas']
const categoriasSaida=['Materiais / peças','Combustível','Ferramentas','Fornecedor','Manutenção','Transporte','Taxas / impostos','Administrativo','Alimentação','Outras despesas']
const formas=['Pix','Dinheiro','Débito','Crédito','Transferência','Boleto','Outro']

export default function Financeiro({supabase}){
  const [movs,setMovs]=useState([])
  const [clientes,setClientes]=useState([])
  const [tipo,setTipo]=useState('')
  const [status,setStatus]=useState('')
  const [categoria,setCategoria]=useState('')
  const [periodo,setPeriodo]=useState('mes')
  const [busca,setBusca]=useState('')
  const [modal,setModal]=useState(false)
  const [erro,setErro]=useState('')
  const [ok,setOk]=useState('')
  const [loading,setLoading]=useState(false)
  const [draftRecovered,setDraftRecovered]=useState(null)
  const [draftDirty,setDraftDirty]=useState(false)
  const [form,setForm]=useState({
    tipo:'entrada',descricao:'',categoria:'Serviços',valor:'',data_movimento:isoToday(),
    vencimento:'',status:'recebido',forma_pagamento:'Pix',cliente_id:'',fornecedor:'',
    observacoes:''
  })

  async function carregar(){
    setLoading(true);setErro('')
    const [mr,cr]=await Promise.all([
      supabase.from('financeiro_lancamentos').select('*,clientes(nome),orcamentos(numero)').order('data_movimento',{ascending:false}).order('created_at',{ascending:false}),
      supabase.from('clientes').select('id,nome').order('nome')
    ])
    if(mr.error)setErro(mr.error.message); else setMovs(mr.data||[])
    if(!cr.error)setClientes(cr.data||[])
    setLoading(false)
  }
  useEffect(()=>{carregar()},[])

  useEffect(()=>{
    if(!modal)return
    setDraftDirty(true)
    const t=setTimeout(()=>saveDraft('financeiro:movimentacao',form),400)
    return()=>clearTimeout(t)
  },[modal,form])


  function periodoOk(x){
    const raw=x.data_movimento||x.vencimento||x.created_at
    if(!raw)return true
    const d=new Date(String(raw).slice(0,10)+'T12:00:00'), n=new Date()
    if(periodo==='todos')return true
    if(periodo==='hoje')return String(raw).slice(0,10)===isoToday()
    if(periodo==='mes')return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()
    if(periodo==='ano')return d.getFullYear()===n.getFullYear()
    return true
  }

  const filtrados=useMemo(()=>movs.filter(x=>{
    if(tipo&&x.tipo!==tipo)return false
    if(status&&x.status!==status)return false
    if(categoria&&x.categoria!==categoria)return false
    if(!periodoOk(x))return false
    const q=busca.toLowerCase().trim()
    if(q&&![x.descricao,x.categoria,x.clientes?.nome,x.fornecedor,x.orcamentos?.numero].filter(Boolean).join(' ').toLowerCase().includes(q))return false
    return true
  }),[movs,tipo,status,categoria,periodo,busca])

  const entradasRecebidas=filtrados.filter(x=>x.tipo==='entrada'&&x.status==='recebido').reduce((s,x)=>s+Number(x.valor||0),0)
  const saidasPagas=filtrados.filter(x=>x.tipo==='saida'&&x.status==='pago').reduce((s,x)=>s+Number(x.valor||0),0)
  const receber=filtrados.filter(x=>x.tipo==='entrada'&&x.status==='pendente').reduce((s,x)=>s+Number(x.valor||0),0)
  const pagar=filtrados.filter(x=>x.tipo==='saida'&&x.status==='pendente').reduce((s,x)=>s+Number(x.valor||0),0)
  const saldo=entradasRecebidas-saidasPagas
  const vencidos=filtrados.filter(x=>x.status==='pendente'&&x.vencimento&&x.vencimento<isoToday())
  const cats=[...new Set(movs.map(x=>x.categoria).filter(Boolean))].sort()

  function abrirNovo(t='entrada'){
    setForm({
      tipo:t,descricao:'',categoria:t==='entrada'?'Serviços':'Materiais / peças',valor:'',
      data_movimento:isoToday(),vencimento:'',status:t==='entrada'?'recebido':'pago',
      forma_pagamento:'Pix',cliente_id:'',fornecedor:'',observacoes:''
    });const saved=loadDraft('financeiro:movimentacao')
    if(saved?.data && saved.data.tipo===t){
      setForm(saved.data)
      setDraftRecovered(saved.saved_at)
    }else{
      setDraftRecovered(null)
    }
    setModal(true);setErro('');setOk('')
  }

  async function salvar(e){
    e.preventDefault();setErro('');setOk('')
    if(!form.descricao.trim()){setErro('Informe a descrição da movimentação.');return}
    if(!Number(form.valor)||Number(form.valor)<=0){setErro('Informe um valor maior que zero.');return}
    const payload={
      tipo:form.tipo,descricao:form.descricao.trim(),categoria:form.categoria,
      valor:Number(form.valor),data_movimento:form.data_movimento||isoToday(),
      vencimento:form.vencimento||null,status:form.status,forma_pagamento:form.forma_pagamento||null,
      cliente_id:form.cliente_id||null,fornecedor:form.fornecedor.trim()||null,
      observacoes:form.observacoes.trim()||null,origem:'manual'
    }
    const {error}=await supabase.from('financeiro_lancamentos').insert(payload)
    if(error){setErro(error.message);return}
    clearDraft('financeiro:movimentacao');setDraftRecovered(null);setDraftDirty(false);setModal(false);setOk(`${form.tipo==='entrada'?'Entrada':'Saída'} registrada com sucesso.`);carregar()
  }

  async function marcar(x){
    const novo=x.tipo==='entrada'?'recebido':'pago'
    const {error}=await supabase.from('financeiro_lancamentos').update({status:novo,data_movimento:isoToday()}).eq('id',x.id)
    if(error)setErro(error.message);else carregar()
  }

  async function excluir(x){
    if(x.orcamento_id){setErro('Este lançamento foi gerado por orçamento e não deve ser excluído pelo Caixa.');return}
    if(!confirm('Excluir esta movimentação financeira?'))return
    const {error}=await supabase.from('financeiro_lancamentos').delete().eq('id',x.id)
    if(error)setErro(error.message);else carregar()
  }

  return <>
    <div className="toolbar">
      <div><h2>Financeiro / Caixa</h2><p>Entradas, saídas, contas a receber e contas a pagar.</p></div>
      <div className="financeTopActions">
        <button className="incomeBtn" onClick={()=>abrirNovo('entrada')}><Plus size={16}/> Entrada</button>
        <button className="expenseBtn" onClick={()=>abrirNovo('saida')}><Plus size={16}/> Saída</button>
      </div>
    </div>
    {erro&&<div className="warningBox">{erro}</div>}
    {ok&&<div className="successBox">{ok}</div>}

    <div className="cards financeCards">
      <div className="card"><ArrowDownCircle/><div><span>Entradas recebidas</span><strong>{money(entradasRecebidas)}</strong></div></div>
      <div className="card"><ArrowUpCircle/><div><span>Saídas pagas</span><strong>{money(saidasPagas)}</strong></div></div>
      <div className={`card cashBalance ${saldo<0?'negative':''}`}><Wallet/><div><span>Saldo do caixa</span><strong>{money(saldo)}</strong></div></div>
      <div className="card"><Clock3/><div><span>A receber</span><strong>{money(receber)}</strong></div></div>
      <div className="card"><ReceiptText/><div><span>A pagar</span><strong>{money(pagar)}</strong></div></div>
      <div className="card"><AlertTriangle/><div><span>Vencidos</span><strong>{vencidos.length}</strong></div></div>
    </div>

    <div className="reportFilters financeFilters">
      <select value={periodo} onChange={e=>setPeriodo(e.target.value)}>
        <option value="hoje">Hoje</option><option value="mes">Este mês</option><option value="ano">Este ano</option><option value="todos">Todo período</option>
      </select>
      <select value={tipo} onChange={e=>setTipo(e.target.value)}>
        <option value="">Entradas + saídas</option><option value="entrada">Somente entradas</option><option value="saida">Somente saídas</option>
      </select>
      <select value={status} onChange={e=>setStatus(e.target.value)}>
        <option value="">Todos os status</option><option value="recebido">Recebido</option><option value="pago">Pago</option><option value="pendente">Pendente</option>
      </select>
      <select value={categoria} onChange={e=>setCategoria(e.target.value)}>
        <option value="">Todas as categorias</option>{cats.map(c=><option key={c}>{c}</option>)}
      </select>
      <button className="iconBtn" onClick={carregar}><RefreshCcw size={16} className={loading?'spin':''}/></button>
    </div>

    <section className="panel">
      <div className="searchBar"><Search size={17}/><input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar descrição, cliente, fornecedor..."/></div>
      {filtrados.length===0?<div className="emptySmall"><Landmark size={36}/><b>Nenhuma movimentação no período</b></div>:
      <div className="cashList">
        {filtrados.map(x=><div className="cashRow" key={x.id}>
          <div className={`cashTypeIcon ${x.tipo}`}>{x.tipo==='entrada'?<ArrowDownCircle size={19}/>:<ArrowUpCircle size={19}/>}</div>
          <div className="cashInfo">
            <b>{x.descricao||x.categoria||'Movimentação'}</b>
            <span>{x.categoria||'-'}{x.clientes?.nome?` • ${x.clientes.nome}`:''}{x.fornecedor?` • ${x.fornecedor}`:''}</span>
            <small>{br(x.data_movimento||x.created_at)}{x.vencimento?` • Venc. ${br(x.vencimento)}`:''}{x.forma_pagamento?` • ${x.forma_pagamento}`:''}</small>
            {x.orcamentos?.numero&&<em>Gerado pelo orçamento {x.orcamentos.numero}</em>}
          </div>
          <div className="cashValue">
            <strong className={x.tipo}>{x.tipo==='saida'?'- ':'+ '}{money(x.valor)}</strong>
            <span className={`financeStatus ${x.status}`}>{x.status}</span>
          </div>
          <div className="cashActions">
            {x.status==='pendente'&&<button title={x.tipo==='entrada'?'Marcar recebido':'Marcar pago'} onClick={()=>marcar(x)}><CheckCircle2 size={16}/></button>}
            {!x.orcamento_id&&<button title="Excluir" onClick={()=>excluir(x)}><Trash2 size={15}/></button>}
          </div>
        </div>)}
      </div>}
    </section>

    {modal&&<div className="modalBackdrop" onMouseDown={e=>e.target===e.currentTarget&&setModal(false)}>
      <div className="modal financeModal">
        <div className="modalHead"><div><h3>Nova {form.tipo==='entrada'?'entrada':'saída'}</h3><p>Registre uma movimentação do caixa.</p></div><button onClick={()=>setModal(false)}><X/></button></div>
        <form onSubmit={salvar}>
          <div className="movementTypeSwitch">
            <button type="button" className={form.tipo==='entrada'?'active income':''} onClick={()=>setForm(f=>({...f,tipo:'entrada',categoria:'Serviços',status:'recebido'}))}><ArrowDownCircle/> Entrada</button>
            <button type="button" className={form.tipo==='saida'?'active expense':''} onClick={()=>setForm(f=>({...f,tipo:'saida',categoria:'Materiais / peças',status:'pago'}))}><ArrowUpCircle/> Saída</button>
          </div>
          <label>Descrição *<input value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder={form.tipo==='entrada'?'Ex.: Serviço de manutenção':'Ex.: Compra de material'}/></label>
          <div className="formGrid2">
            <label>Categoria<select value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}>{(form.tipo==='entrada'?categoriasEntrada:categoriasSaida).map(c=><option key={c}>{c}</option>)}</select></label>
            <label>Valor *<input type="number" min="0" step="0.01" value={form.valor} onChange={e=>setForm(f=>({...f,valor:e.target.value}))} placeholder="0,00"/></label>
          </div>
          <div className="formGrid2">
            <label>Data<input type="date" value={form.data_movimento} onChange={e=>setForm(f=>({...f,data_movimento:e.target.value}))}/></label>
            <label>Vencimento<input type="date" value={form.vencimento} onChange={e=>setForm(f=>({...f,vencimento:e.target.value}))}/></label>
          </div>
          <div className="formGrid2">
            <label>Status<select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
              {form.tipo==='entrada'?<><option value="recebido">Recebido</option><option value="pendente">A receber</option></>:<><option value="pago">Pago</option><option value="pendente">A pagar</option></>}
            </select></label>
            <label>Forma de pagamento<select value={form.forma_pagamento} onChange={e=>setForm(f=>({...f,forma_pagamento:e.target.value}))}>{formas.map(x=><option key={x}>{x}</option>)}</select></label>
          </div>
          {form.tipo==='entrada'?<label>Cliente<select value={form.cliente_id} onChange={e=>setForm(f=>({...f,cliente_id:e.target.value}))}><option value="">Sem cliente vinculado</option>{clientes.map(c=><option value={c.id} key={c.id}>{c.nome}</option>)}</select></label>:
          <label>Fornecedor / favorecido<input value={form.fornecedor} onChange={e=>setForm(f=>({...f,fornecedor:e.target.value}))} placeholder="Opcional"/></label>}
          <label>Observações<textarea rows="3" value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))}/></label>
          <div className="modalActions"><button type="button" className="ghost" onClick={()=>setModal(false)}>Cancelar</button><button className="primary">Salvar movimentação</button></div>
        </form>
      </div>
    </div>}
  </>
}
