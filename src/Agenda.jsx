import React,{useEffect,useMemo,useState} from 'react'
import {
  Plus,CalendarDays,Clock,MapPin,Pencil,Trash2,X,Save,
  WifiOff,RefreshCcw,UserRound,CheckCircle2,Navigation
} from 'lucide-react'
import {
  cacheAgendamentos,getCachedAgendamentos,saveLocalAgendamento,
  removeLocalAgendamento,queueChange,getCachedClientes,cacheClientes
} from './offline'
import {syncPendingChanges} from './sync'

const tipos=['Manutenção Preventiva','Manutenção Corretiva','Visita Técnica','Retorno','Emergencial']
const prioridades=['baixa','media','alta','emergencial']
const statusList=['agendado','confirmado','em_deslocamento','em_atendimento','concluido','cancelado','reagendado']
const sistemas=['CFTV','Controle de Acesso','Cerca Elétrica','Sistema de Alarme','Infraestrutura/Rede','Fonte/Nobreak','Outro']

function localInputValue(iso){
  if(!iso) return ''
  const d=new Date(iso)
  const p=n=>String(n).padStart(2,'0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
function isoFromLocal(v){ return v ? new Date(v).toISOString() : null }
function startOfDay(d=new Date()){ const x=new Date(d); x.setHours(0,0,0,0); return x }
function endOfDay(d=new Date()){ const x=new Date(d); x.setHours(23,59,59,999); return x }
function dateKey(d){ return new Date(d).toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'}) }
function statusLabel(s){ return ({agendado:'Agendado',confirmado:'Confirmado',em_deslocamento:'Em deslocamento',em_atendimento:'Em atendimento',concluido:'Concluído',cancelado:'Cancelado',reagendado:'Reagendado'})[s]||s }

const empty={
  cliente_id:'',tecnico_id:'',titulo:'',tipo_atendimento:'Visita Técnica',
  prioridade:'media',sistema:'CFTV',inicio:'',fim_previsto:'',
  endereco_atendimento:'',status:'agendado',observacoes:'',lembrete_ativo:true,lembrete_minutos:60
}

export default function Agenda({supabase,profile,session,setSyncStatus,openItemId,clearOpenItem}){
  const [lista,setLista]=useState([])
  const [clientes,setClientes]=useState([])
  const [tecnicos,setTecnicos]=useState([])
  const [view,setView]=useState('hoje')
  const [modal,setModal]=useState(false)
  const [edit,setEdit]=useState(null)
  const [form,setForm]=useState(empty)
  const [erro,setErro]=useState('')
  const [loading,setLoading]=useState(true)

  async function carregar(){
    setLoading(true); setErro('')
    try{
      if(navigator.onLine){
        const agendaQuery=supabase.from('agendamentos').select('*').order('inicio')
        const clientesQuery=supabase.from('clientes').select('*').order('nome')
        const [ar,cr]=await Promise.all([agendaQuery,clientesQuery])
        if(ar.error) throw ar.error
        if(cr.error) throw cr.error
        await cacheAgendamentos(ar.data||[])
        await cacheClientes(cr.data||[])
        setLista(ar.data||[])
        setClientes(cr.data||[])
        if(profile?.perfil==='admin'){
          const {data}=await supabase.from('profiles').select('id,nome,perfil,ativo').eq('ativo',true).order('nome')
          setTecnicos(data||[])
        }else{
          setTecnicos([{id:session.user.id,nome:profile?.nome||'Técnico',perfil:'tecnico'}])
        }
      }else{
        setLista(await getCachedAgendamentos())
        setClientes(await getCachedClientes())
      }
    }catch(e){
      setLista(await getCachedAgendamentos())
      setClientes(await getCachedClientes())
      setErro('Sem conexão com o servidor. Exibindo a agenda disponível no aparelho.')
    }
    setLoading(false)
  }

  useEffect(()=>{carregar()},[profile?.perfil])

  useEffect(()=>{
    if(!openItemId || !lista.length)return
    const item=lista.find(x=>x.id===openItemId)
    if(item){
      editar(item)
      clearOpenItem?.()
    }
  },[openItemId,lista])

  useEffect(()=>{
    const abrir=()=>novo()
    window.addEventListener('fortal:new-agendamento',abrir)
    return()=>window.removeEventListener('fortal:new-agendamento',abrir)
  },[tecnicos,profile?.perfil])
  useEffect(()=>{
    const fn=async()=>{await syncPendingChanges(supabase,setSyncStatus);await carregar()}
    window.addEventListener('online',fn)
    return()=>window.removeEventListener('online',fn)
  },[])

  const exibidos=useMemo(()=>{
    const now=new Date()
    let ini,fim
    if(view==='hoje'){ ini=startOfDay(now); fim=endOfDay(now) }
    else if(view==='semana'){
      ini=startOfDay(now); ini.setDate(ini.getDate()-ini.getDay())
      fim=endOfDay(ini); fim.setDate(ini.getDate()+6)
    }else{
      ini=new Date(now.getFullYear(),now.getMonth(),1)
      fim=new Date(now.getFullYear(),now.getMonth()+1,0,23,59,59,999)
    }
    return lista.filter(a=>{
      const d=new Date(a.inicio)
      return d>=ini && d<=fim && (profile?.perfil==='admin' || a.tecnico_id===session.user.id)
    }).sort((a,b)=>new Date(a.inicio)-new Date(b.inicio))
  },[lista,view,profile?.perfil,session.user.id])

  const grupos=useMemo(()=>{
    const g={}
    for(const a of exibidos){
      const k=dateKey(a.inicio)
      ;(g[k] ||= []).push(a)
    }
    return g
  },[exibidos])

  function novo(){
    const d=new Date(); d.setMinutes(Math.ceil(d.getMinutes()/15)*15,0,0)
    const end=new Date(d.getTime()+60*60*1000)
    setEdit(null)
    setForm({...empty,
      tecnico_id: profile?.perfil==='admin' ? (tecnicos[0]?.id||session.user.id) : session.user.id,
      inicio:localInputValue(d.toISOString()),
      fim_previsto:localInputValue(end.toISOString())
    })
    setModal(true)
  }

  function editar(a){
    setEdit(a)
    setForm({...empty,...a,
      inicio:localInputValue(a.inicio),
      fim_previsto:localInputValue(a.fim_previsto)
    })
    setModal(true)
  }

  function clienteSelecionado(id){ return clientes.find(c=>c.id===id) }

  async function salvar(e){
    e.preventDefault(); setErro('')
    const cliente=clienteSelecionado(form.cliente_id)
    const payload={
      ...form,
      id:edit?.id||crypto.randomUUID(),
      tecnico_id: profile?.perfil==='admin' ? form.tecnico_id : session.user.id,
      inicio:isoFromLocal(form.inicio),
      fim_previsto:isoFromLocal(form.fim_previsto),
      endereco_atendimento:form.endereco_atendimento || [cliente?.endereco,cliente?.numero,cliente?.bairro,cliente?.cidade,cliente?.uf].filter(Boolean).join(', ')
    }

    try{
      if(navigator.onLine){
        const clean={...payload}
        const {data,error}=await supabase.from('agendamentos').upsert(clean,{onConflict:'id'}).select().single()
        if(error) throw error
        await saveLocalAgendamento(data,'synced')
      }else{
        await saveLocalAgendamento(payload,'pending')
        await queueChange('agendamentos','upsert',payload)
        setSyncStatus('pending')
      }
      setModal(false); await carregar()
    }catch(e){
      if(!navigator.onLine){
        await saveLocalAgendamento(payload,'pending')
        await queueChange('agendamentos','upsert',payload)
        setSyncStatus('pending'); setModal(false); await carregar()
      }else setErro(e.message||'Não foi possível salvar o agendamento.')
    }
  }

  async function excluir(a){
    if(!confirm('Excluir este agendamento?')) return
    if(navigator.onLine){
      const {error}=await supabase.from('agendamentos').delete().eq('id',a.id)
      if(error){setErro(error.message);return}
    }else{
      await queueChange('agendamentos','delete',{id:a.id})
      setSyncStatus('pending')
    }
    await removeLocalAgendamento(a.id); await carregar()
  }

  async function statusRapido(a,status){
    const payload={...a,status}
    delete payload._syncStatus
    if(navigator.onLine){
      const {data,error}=await supabase.from('agendamentos').update({status}).eq('id',a.id).select().single()
      if(error){setErro(error.message);return}
      await saveLocalAgendamento(data,'synced')
    }else{
      await saveLocalAgendamento(payload,'pending')
      await queueChange('agendamentos','upsert',payload)
      setSyncStatus('pending')
    }
    await carregar()
  }

  function rota(a){
    const c=clienteSelecionado(a.cliente_id)
    let destino=''
    if(c?.latitude && c?.longitude) destino=`${c.latitude},${c.longitude}`
    else destino=a.endereco_atendimento || [c?.endereco,c?.numero,c?.bairro,c?.cidade,c?.uf,c?.cep].filter(Boolean).join(', ')
    if(!destino) return alert('Este atendimento não possui endereço cadastrado.')
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`,'_blank')
  }

  function nomeCliente(id){ return clienteSelecionado(id)?.nome || 'Cliente' }
  function nomeTecnico(id){ return tecnicos.find(t=>t.id===id)?.nome || 'Técnico' }

  return <>
    <div className="toolbar">
      <div><h2>Agenda</h2><p>Controle de visitas, retornos e atendimentos.</p></div>
      <button className="primary" onClick={novo}><Plus size={18}/> Novo agendamento</button>
    </div>

    {!navigator.onLine && <div className="offlineNotice"><WifiOff size={17}/> Agenda offline. Alterações serão sincronizadas quando a internet voltar.</div>}
    {erro && <div className="warningBox">{erro}</div>}

    <section className="panel">
      <div className="agendaTop">
        <div className="agendaHeader">
          <button className={view==='hoje'?'selected':''} onClick={()=>setView('hoje')}>Hoje</button>
          <button className={view==='semana'?'selected':''} onClick={()=>setView('semana')}>Semana</button>
          <button className={view==='mes'?'selected':''} onClick={()=>setView('mes')}>Mês</button>
        </div>
        <button className="ghost" onClick={async()=>{await syncPendingChanges(supabase,setSyncStatus);await carregar()}}><RefreshCcw size={16}/> Sincronizar</button>
      </div>

      {loading ? <div className="loadingText">Carregando agenda...</div> :
       exibidos.length===0 ? <div className="emptySmall"><CalendarDays size={36}/><b>Nenhum atendimento neste período</b><span>Use “Novo agendamento” para adicionar um atendimento.</span></div> :
       Object.entries(grupos).map(([dia,itens])=><div className="agendaDay" key={dia}>
         <div className="agendaDayTitle">{dia}</div>
         {itens.map(a=>{
           const d=new Date(a.inicio)
           const hora=d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})
           return <div className="agendaCard" key={a.id}>
             <div className="agendaTime"><Clock size={16}/><b>{hora}</b></div>
             <div className="agendaInfo">
               <b>{nomeCliente(a.cliente_id)}</b>
               <span>{a.tipo_atendimento} • {a.sistema||'Sistema não informado'}</span>
               <small><UserRound size={13}/> {nomeTecnico(a.tecnico_id)} • Prioridade {a.prioridade}</small>
               {a._syncStatus==='pending' && <em>Aguardando sincronização</em>}
             </div>
             <div className="agendaActions">
               <span className={`statusBadge status-${a.status}`}>{statusLabel(a.status)}</span>
               <button className="iconBtn" title="Abrir rota" onClick={()=>rota(a)}><Navigation size={17}/></button>
               {a.status!=='concluido' && <button className="iconBtn success" title="Concluir" onClick={()=>statusRapido(a,'concluido')}><CheckCircle2 size={17}/></button>}
               <button className="iconBtn" title="Editar" onClick={()=>editar(a)}><Pencil size={17}/></button>
               <button className="iconBtn danger" title="Excluir" onClick={()=>excluir(a)}><Trash2 size={17}/></button>
             </div>
           </div>
         })}
       </div>)
      }
    </section>

    {modal && <div className="modalBackdrop">
      <div className="modal agendaModal">
        <div className="modalHead">
          <div><span className="eyebrow">FORTAL TECH</span><h2>{edit?'Editar agendamento':'Novo agendamento'}</h2></div>
          <button className="iconBtn" onClick={()=>setModal(false)}><X/></button>
        </div>
        {erro && <div className="warningBox modalError">{erro}</div>}
        <form onSubmit={salvar}>
          <div className="formGrid">
            <div className="field span2"><label>Cliente *</label>
              <select required value={form.cliente_id} onChange={e=>{
                const id=e.target.value, c=clienteSelecionado(id)
                setForm({...form,cliente_id:id,endereco_atendimento:[c?.endereco,c?.numero,c?.bairro,c?.cidade,c?.uf].filter(Boolean).join(', ')})
              }}>
                <option value="">Selecione...</option>
                {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="field"><label>Tipo de atendimento</label>
              <select value={form.tipo_atendimento} onChange={e=>setForm({...form,tipo_atendimento:e.target.value})}>{tipos.map(x=><option key={x}>{x}</option>)}</select>
            </div>
            <div className="field"><label>Sistema</label>
              <select value={form.sistema||''} onChange={e=>setForm({...form,sistema:e.target.value})}>{sistemas.map(x=><option key={x}>{x}</option>)}</select>
            </div>
            <div className="field"><label>Prioridade</label>
              <select value={form.prioridade} onChange={e=>setForm({...form,prioridade:e.target.value})}>{prioridades.map(x=><option key={x} value={x}>{x[0].toUpperCase()+x.slice(1)}</option>)}</select>
            </div>
            <div className="field"><label>Status</label>
              <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{statusList.map(x=><option key={x} value={x}>{statusLabel(x)}</option>)}</select>
            </div>
            <div className="field"><label>Início *</label><input required type="datetime-local" value={form.inicio} onChange={e=>setForm({...form,inicio:e.target.value})}/></div>
            <div className="field"><label>Fim previsto</label><input type="datetime-local" value={form.fim_previsto||''} onChange={e=>setForm({...form,fim_previsto:e.target.value})}/></div>
            {profile?.perfil==='admin' && <div className="field span2"><label>Técnico responsável</label>
              <select value={form.tecnico_id||''} onChange={e=>setForm({...form,tecnico_id:e.target.value})}>
                {tecnicos.map(t=><option key={t.id} value={t.id}>{t.nome || 'Usuário'} — {t.perfil}</option>)}
              </select>
            </div>}
            <div className="field span2"><label>Endereço do atendimento</label><input value={form.endereco_atendimento||''} onChange={e=>setForm({...form,endereco_atendimento:e.target.value})}/></div>
            <div className="field span2 reminderBox">
              <label><input type="checkbox" checked={!!form.lembrete_ativo} onChange={e=>setForm({...form,lembrete_ativo:e.target.checked})}/> Ativar lembrete dentro do aplicativo</label>
              {form.lembrete_ativo&&<select value={form.lembrete_minutos||60} onChange={e=>setForm({...form,lembrete_minutos:Number(e.target.value)})}>
                <option value="15">15 minutos antes</option>
                <option value="30">30 minutos antes</option>
                <option value="60">1 hora antes</option>
                <option value="120">2 horas antes</option>
                <option value="1440">1 dia antes</option>
              </select>}
            </div>
            <div className="field span2"><label>Título / resumo</label><input value={form.titulo||''} onChange={e=>setForm({...form,titulo:e.target.value})} placeholder="Ex.: Preventiva mensal CFTV"/></div>
            <div className="field span2"><label>Observações</label><textarea rows="4" value={form.observacoes||''} onChange={e=>setForm({...form,observacoes:e.target.value})}/></div>
          </div>
          <div className="modalActions">
            <button type="button" className="ghost" onClick={()=>setModal(false)}>Cancelar</button>
            <button className="primary"><Save size={17}/> Salvar agendamento</button>
          </div>
        </form>
      </div>
    </div>}
  </>
}
