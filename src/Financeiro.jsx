import React,{useEffect,useMemo,useState} from 'react'
import {WalletCards,Search,CheckCircle2,Clock3,BadgeDollarSign,RefreshCcw} from 'lucide-react'

function money(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function br(v){
  if(!v)return '-'
  const d=new Date(String(v).length===10?v+'T12:00:00':v)
  return d.toLocaleDateString('pt-BR')
}
const statusLabel={pendente:'Pendente',recebido:'Recebido',cancelado:'Cancelado'}
const metodoLabel={pix:'Pix',debito:'Débito',credito:'Cartão de crédito'}

export default function Financeiro({supabase}){
  const [lista,setLista]=useState([])
  const [busca,setBusca]=useState('')
  const [erro,setErro]=useState('')
  const [loading,setLoading]=useState(false)

  async function carregar(){
    setLoading(true);setErro('')
    const {data,error}=await supabase
      .from('financeiro_lancamentos')
      .select('*,clientes(nome),orcamentos(numero)')
      .order('vencimento',{ascending:true})
    if(error)setErro(error.message)
    else setLista(data||[])
    setLoading(false)
  }
  useEffect(()=>{carregar()},[])

  const filtrados=useMemo(()=>{
    const q=busca.toLowerCase().trim()
    if(!q)return lista
    return lista.filter(x=>[
      x.descricao,x.clientes?.nome,x.orcamentos?.numero,metodoLabel[x.metodo_pagamento],statusLabel[x.status]
    ].filter(Boolean).join(' ').toLowerCase().includes(q))
  },[lista,busca])

  const aReceber=lista.filter(x=>x.status==='pendente').reduce((s,x)=>s+Number(x.valor||0),0)
  const recebido=lista.filter(x=>x.status==='recebido').reduce((s,x)=>s+Number(x.valor||0),0)

  async function marcarRecebido(x){
    const {error}=await supabase.from('financeiro_lancamentos').update({
      status:'recebido',
      recebido_em:new Date().toISOString()
    }).eq('id',x.id)
    if(error){setErro(error.message);return}
    await carregar()
  }

  return <>
    <div className="toolbar">
      <div><h2>Financeiro</h2><p>Recebimentos gerados pelos orçamentos aprovados.</p></div>
      <button className="ghost" onClick={carregar}><RefreshCcw size={16} className={loading?'spin':''}/> Atualizar</button>
    </div>

    {erro&&<div className="warningBox">{erro}</div>}

    <div className="cards">
      <div className="card"><Clock3/><div><span>A receber</span><strong>{money(aReceber)}</strong></div></div>
      <div className="card"><CheckCircle2/><div><span>Recebido</span><strong>{money(recebido)}</strong></div></div>
    </div>

    <section className="panel">
      <div className="searchBar"><Search size={18}/><input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar cliente, orçamento, forma de pagamento..."/></div>
      {filtrados.length===0?
        <div className="emptySmall"><WalletCards size={36}/><b>Nenhum lançamento financeiro</b><span>Os orçamentos aprovados aparecerão aqui automaticamente.</span></div>:
        <div className="financeList">
          {filtrados.map(x=><div className="financeRow" key={x.id}>
            <div className="financeMain">
              <div className="budgetIcon"><BadgeDollarSign size={20}/></div>
              <div>
                <b>{x.descricao}</b>
                <span>{x.clientes?.nome||'Cliente'} • {x.orcamentos?.numero||''}</span>
                <small>{metodoLabel[x.metodo_pagamento]||x.metodo_pagamento} • Venc. {br(x.vencimento)} {x.parcela_total>1?`• Parcela ${x.parcela_numero}/${x.parcela_total}`:''}</small>
              </div>
            </div>
            <div className="financeActions">
              <strong>{money(x.valor)}</strong>
              <span className={`statusBadge fin-${x.status}`}>{statusLabel[x.status]||x.status}</span>
              {x.status==='pendente'&&<button className="receiveBtn" onClick={()=>marcarRecebido(x)}>Recebido</button>}
            </div>
          </div>)}
        </div>
      }
    </section>
  </>
}
