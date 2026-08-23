import React,{useEffect,useMemo,useState} from 'react'
import {
  Plus,ClipboardList,Search,X,Save,Trash2,Pencil,WifiOff,
  ChevronDown,ChevronUp,PackagePlus,CheckCircle2,AlertTriangle
} from 'lucide-react'
import {
  getCachedClientes,cacheClientes,getCachedOrdensServico,cacheOrdensServico,
  saveLocalOS,removeLocalOS,replaceLocalOSChildren,getLocalOSChildren,queueChange
} from './offline'
import {syncPendingChanges} from './sync'

const sistemasCatalogo=[
  ['cftv','CFTV'],
  ['controle_acesso','Controle de Acesso'],
  ['cerca_eletrica','Cerca Elétrica'],
  ['alarme','Sistema de Alarme'],
  ['infraestrutura_rede','Infraestrutura/Rede'],
  ['fonte_nobreak','Fonte/Nobreak'],
  ['outro','Outro']
]

const checklistCatalogo={
  cftv:{
    'Câmeras':[
      'Verificação do funcionamento das câmeras','Verificação da imagem','Verificação de foco e enquadramento',
      'Verificação de lente','Limpeza das lentes','Verificação de fixação','Verificação de conectores',
      'Verificação do cabeamento','Verificação da alimentação','Verificação de câmeras offline',
      'Teste de visualização ao vivo','Teste de infravermelho/visão noturna',
      'Verificação de câmera com imagem distorcida/intermitente'
    ],
    'DVR/NVR':[
      'Equipamento funcionando','HD reconhecido','Capacidade de armazenamento verificada','Gravação funcionando',
      'Data e horário corretos','Reprodução de gravações testada','Rede/conectividade verificada',
      'Acesso remoto testado','Canais verificados','Limpeza/ventilação verificada'
    ]
  },
  controle_acesso:{
    'Equipamentos':['Controladora','Leitor facial','Leitor RFID/Tag','Biometria','Fechadura eletromagnética','Fechadura elétrica','Eclusa/Intertravamento','Botoeira','Sensor magnético','Catraca','Portão','Interfonia'],
    'Testes':['Teste de abertura','Teste de fechamento','Teste de leitura facial','Teste de leitura de cartão/tag','Teste de botoeira','Teste de fechadura','Verificação de alimentação','Verificação de bateria/fonte','Verificação de comunicação de rede','Verificação dos usuários cadastrados','Teste de acionamento remoto','Verificação dos registros/eventos']
  },
  cerca_eletrica:{
    'Verificações':['Central de choque funcionando','Alimentação elétrica verificada','Bateria verificada','Tensão de saída verificada conforme fabricante','Fios de alta tensão verificados','Isoladores verificados','Hastes verificadas','Fixações verificadas','Arames/fios verificados','Aterramento verificado','Sinais de oxidação identificados','Vegetação/objetos próximos removidos','Sirene testada','Disparo/alarme testado','Tamper/violação testado','Central comunicando corretamente','Perímetro inspecionado']
  },
  alarme:{
    'Central':['Central funcionando','Alimentação verificada','Bateria verificada','Comunicação verificada','Eventos verificados','Memória de eventos consultada'],
    'Sensores':['Sensores magnéticos testados','Sensores PIR testados','Sensores externos testados','Sensor de movimento testado','Botão de pânico testado','Sirene testada','Teclado testado'],
    'Comunicação':['Internet/IP','GPRS/4G','Aplicativo','Central de monitoramento','Notificação de disparo']
  },
  infraestrutura_rede:{
    'Infraestrutura / Rede / Alimentação':['Racks organizados','Switches funcionando','Patch cords/conectores verificados','Cabeamento verificado','Fontes de alimentação verificadas','Nobreak funcionando','Baterias verificadas','Tomadas/alimentação verificadas','Equipamentos sem aquecimento anormal','Equipamentos identificados','Rede de comunicação funcionando']
  },
  fonte_nobreak:{
    'Fonte / Nobreak':['Fonte funcionando','Tensão de saída verificada','Conexões verificadas','Bateria verificada','Nobreak funcionando','Autonomia verificada','Alarmes do nobreak verificados','Ventilação/aquecimento verificados']
  },
  outro:{'Verificações Gerais':['Inspeção visual','Funcionamento testado','Alimentação verificada','Conexões verificadas']}
}

const empty={
  cliente_id:'',tecnico_id:'',tipo_atendimento:'Manutenção Preventiva',prioridade:'media',
  data_visita:'',horario_chegada:'',horario_termino:'',motivo:'',problema_relatado:'',
  diagnostico:'',causa_identificada:'',servico_executado:'',equipamento_substituido:'',
  teste_realizado:'',resultado:'',pendencias:'',recomendacoes:'',necessita_orcamento:false,
  descricao_orcamento:'',prazo_correcao:'',condicao_final:'',observacoes_finais:'',status:'aberta'
}

function numeroOS(){
  const d=new Date()
  const y=d.getFullYear()
  const stamp=String(Date.now()).slice(-6)
  return `OS-${y}-${stamp}`
}

export default function OrdensServico({supabase,profile,session,setSyncStatus}){
  const [lista,setLista]=useState([])
  const [clientes,setClientes]=useState([])
  const [tecnicos,setTecnicos]=useState([])
  const [busca,setBusca]=useState('')
  const [modal,setModal]=useState(false)
  const [edit,setEdit]=useState(null)
  const [form,setForm]=useState(empty)
  const [sistemas,setSistemas]=useState([])
  const [checklist,setChecklist]=useState([])
  const [materiais,setMateriais]=useState([])
  const [erro,setErro]=useState('')
  const [expanded,setExpanded]=useState({})

  async function carregar(){
    setErro('')
    try{
      if(navigator.onLine){
        let q=supabase.from('ordens_servico').select('*,clientes(nome)').order('created_at',{ascending:false})
        if(profile.perfil!=='admin') q=q.eq('tecnico_id',session.user.id)
        const [osr,cr]=await Promise.all([
          q,
          supabase.from('clientes').select('*').order('nome')
        ])
        if(osr.error) throw osr.error
        if(cr.error) throw cr.error
        setLista(osr.data||[])
        setClientes(cr.data||[])
        await cacheOrdensServico(osr.data||[])
        await cacheClientes(cr.data||[])
        if(profile.perfil==='admin'){
          const {data}=await supabase.from('profiles').select('id,nome,perfil,ativo').eq('ativo',true).order('nome')
          setTecnicos(data||[])
        }else{
          setTecnicos([{id:session.user.id,nome:profile.nome||'Técnico',perfil:'tecnico'}])
        }
      }else{
        setLista(await getCachedOrdensServico())
        setClientes(await getCachedClientes())
      }
    }catch(e){
      setLista(await getCachedOrdensServico())
      setClientes(await getCachedClientes())
      setErro('Sem conexão com o servidor. Exibindo OS disponíveis no aparelho.')
    }
  }

  useEffect(()=>{carregar()},[profile.perfil])

  useEffect(()=>{
    const abrir=()=>novo()
    window.addEventListener('fortal:new-os',abrir)
    return()=>window.removeEventListener('fortal:new-os',abrir)
  },[tecnicos,profile.perfil])

  const filtradas=useMemo(()=>{
    const q=busca.toLowerCase().trim()
    if(!q)return lista
    return lista.filter(os=>[
      os.numero,os.clientes?.nome,clientes.find(c=>c.id===os.cliente_id)?.nome,
      os.tipo_atendimento,os.status
    ].filter(Boolean).join(' ').toLowerCase().includes(q))
  },[lista,busca,clientes])

  function setSistema(cod,on){
    if(on){
      setSistemas(s=>[...s,{id:crypto.randomUUID(),os_id:edit?.id||'',sistema:cod,outro_descricao:null}])
      const novos=[]
      const grupos=checklistCatalogo[cod]||{}
      Object.entries(grupos).forEach(([grupo,itens])=>{
        itens.forEach(item=>novos.push({
          id:crypto.randomUUID(),os_id:edit?.id||'',sistema:cod,grupo,item,status:'nao_verificado',observacao:''
        }))
      })
      setChecklist(c=>[...c,...novos])
    }else{
      setSistemas(s=>s.filter(x=>x.sistema!==cod))
      setChecklist(c=>c.filter(x=>x.sistema!==cod))
    }
  }

  function novo(){
    const now=new Date()
    setEdit(null)
    setForm({...empty,
      tecnico_id:profile.perfil==='admin'?(tecnicos[0]?.id||session.user.id):session.user.id,
      data_visita:now.toISOString().slice(0,10)
    })
    setSistemas([])
    setChecklist([])
    setMateriais([])
    setExpanded({})
    setModal(true)
  }

  async function editar(os){
    setEdit(os)
    setForm({...empty,...os})
    let children
    if(navigator.onLine){
      const [sr,cr,mr]=await Promise.all([
        supabase.from('os_sistemas').select('*').eq('os_id',os.id),
        supabase.from('os_checklist').select('*').eq('os_id',os.id),
        supabase.from('os_materiais').select('*').eq('os_id',os.id)
      ])
      children={sistemas:sr.data||[],checklist:cr.data||[],materiais:mr.data||[]}
      await replaceLocalOSChildren(os.id,children)
    }else children=await getLocalOSChildren(os.id)
    setSistemas(children.sistemas)
    setChecklist(children.checklist)
    setMateriais(children.materiais)
    setModal(true)
  }

  function updateChecklist(id,status){
    setChecklist(c=>c.map(x=>x.id===id?{...x,status}:x))
  }

  function addMaterial(){
    setMateriais(m=>[...m,{id:crypto.randomUUID(),os_id:edit?.id||'',descricao:'',quantidade:1,unidade:'un'}])
  }

  function updateMaterial(id,key,value){
    setMateriais(m=>m.map(x=>x.id===id?{...x,[key]:value}:x))
  }

  async function salvar(e){
    e.preventDefault()
    setErro('')
    if(!form.cliente_id) return setErro('Selecione um cliente.')
    if(!sistemas.length) return setErro('Selecione pelo menos um sistema envolvido.')

    const osId=edit?.id||crypto.randomUUID()
    const osPayload={
      ...form,
      id:osId,
      numero:edit?.numero||numeroOS(),
      tecnico_id:profile.perfil==='admin'?form.tecnico_id:session.user.id,
      data_visita:form.data_visita||null,
      horario_chegada:form.horario_chegada||null,
      horario_termino:form.horario_termino||null,
      encerrada_em:form.encerrada_em||null,
      updated_at:new Date().toISOString()
    }
    const sistPayload=sistemas.map(x=>({
      os_id:osId,
      sistema:x.sistema,
      outro_descricao:x.outro_descricao||null
    }))
    const checkPayload=checklist.map(x=>({
      os_id:osId,
      sistema:x.sistema,
      grupo:x.grupo||null,
      item:x.item,
      status:x.status||'nao_verificado',
      observacao:x.observacao||''
    }))
    const matPayload=materiais.filter(x=>x.descricao.trim()).map(x=>({
      os_id:osId,
      descricao:x.descricao.trim(),
      quantidade:Number(x.quantidade||1),
      unidade:x.unidade||'un'
    }))
    const bundle={os:osPayload,sistemas:sistPayload,checklist:checkPayload,materiais:matPayload}

    try{
      if(navigator.onLine){
        const {data,error}=await supabase.from('ordens_servico')
          .upsert(osPayload,{onConflict:'id'}).select().single()
        if(error) throw error

        await supabase.from('os_sistemas').delete().eq('os_id',osId)
        await supabase.from('os_checklist').delete().eq('os_id',osId)
        await supabase.from('os_materiais').delete().eq('os_id',osId)

        let savedSistemas=[]
        let savedChecklist=[]
        let savedMateriais=[]

        if(sistPayload.length){
          const {data:rows,error}=await supabase.from('os_sistemas').insert(sistPayload).select()
          if(error) throw error
          savedSistemas=rows||[]
        }
        if(checkPayload.length){
          const {data:rows,error}=await supabase.from('os_checklist').insert(checkPayload).select()
          if(error) throw error
          savedChecklist=rows||[]
        }
        if(matPayload.length){
          const {data:rows,error}=await supabase.from('os_materiais').insert(matPayload).select()
          if(error) throw error
          savedMateriais=rows||[]
        }

        await saveLocalOS(data,'synced')
        await replaceLocalOSChildren(osId,{
          sistemas:savedSistemas,
          checklist:savedChecklist,
          materiais:savedMateriais
        })
      }else{
        await saveLocalOS(osPayload,'pending')
        await replaceLocalOSChildren(osId,{sistemas:sistPayload,checklist:checkPayload,materiais:matPayload})
        await queueChange('ordens_servico','upsert_bundle',bundle)
        setSyncStatus('pending')
      }
      setModal(false)
      await carregar()
    }catch(e){
      if(!navigator.onLine){
        await saveLocalOS(osPayload,'pending')
        await replaceLocalOSChildren(osId,{sistemas:sistPayload,checklist:checkPayload,materiais:matPayload})
        await queueChange('ordens_servico','upsert_bundle',bundle)
        setSyncStatus('pending')
        setModal(false)
        await carregar()
      }else setErro(e.message||'Não foi possível salvar a OS.')
    }
  }

  async function excluir(os){
    if(!confirm(`Excluir ${os.numero}?`))return
    if(navigator.onLine){
      const {error}=await supabase.from('ordens_servico').delete().eq('id',os.id)
      if(error){setErro(error.message);return}
    }else{
      await queueChange('ordens_servico','delete',{id:os.id})
      setSyncStatus('pending')
    }
    await removeLocalOS(os.id)
    await carregar()
  }

  const nomeCliente=id=>clientes.find(c=>c.id===id)?.nome||'Cliente'
  const labelSistema=cod=>sistemasCatalogo.find(x=>x[0]===cod)?.[1]||cod

  return <>
    <div className="toolbar">
      <div><h2>Ordens de Serviço</h2><p>Preventivas, corretivas, visitas técnicas e retornos.</p></div>
      <button className="primary" onClick={novo}><Plus size={18}/> Nova OS</button>
    </div>

    {!navigator.onLine&&<div className="offlineNotice"><WifiOff size={17}/> Modo offline. A OS será sincronizada automaticamente quando a internet voltar.</div>}
    {erro&&<div className="warningBox">{erro}</div>}

    <section className="panel">
      <div className="searchBar">
        <Search size={18}/>
        <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por OS, cliente, tipo ou status..." />
      </div>

      {filtradas.length===0?
        <div className="emptySmall"><ClipboardList size={36}/><b>Nenhuma OS encontrada</b><span>Crie a primeira Ordem de Serviço.</span></div>:
        <div className="osList">
          {filtradas.map(os=><div className="osRow" key={os.id}>
            <div className="osMain">
              <div className="osNumber">{os.numero}</div>
              <div><b>{os.clientes?.nome||nomeCliente(os.cliente_id)}</b>
                <span>{os.tipo_atendimento||'Atendimento'} • {os.data_visita||'Sem data'}</span>
                {os._syncStatus==='pending'&&<em>Aguardando sincronização</em>}
              </div>
            </div>
            <div className="osActions">
              <span className={`statusBadge status-${os.status}`}>{os.status}</span>
              <button className="iconBtn" onClick={()=>editar(os)}><Pencil size={17}/></button>
              <button className="iconBtn danger" onClick={()=>excluir(os)}><Trash2 size={17}/></button>
            </div>
          </div>)}
        </div>}
    </section>

    {modal&&<div className="modalBackdrop">
      <div className="modal osModal">
        <div className="modalHead">
          <div><span className="eyebrow">FORTAL TECH</span><h2>{edit?edit.numero:'Nova Ordem de Serviço'}</h2></div>
          <button className="iconBtn" onClick={()=>setModal(false)}><X/></button>
        </div>

        {erro&&<div className="warningBox modalError">{erro}</div>}

        <form onSubmit={salvar}>
          <div className="osSection">
            <h3>1. Dados do atendimento</h3>
            <div className="formGrid">
              <div className="field span2"><label>Cliente *</label>
                <select required value={form.cliente_id} onChange={e=>setForm({...form,cliente_id:e.target.value})}>
                  <option value="">Selecione...</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="field"><label>Tipo</label>
                <select value={form.tipo_atendimento} onChange={e=>setForm({...form,tipo_atendimento:e.target.value})}>
                  {['Manutenção Preventiva','Manutenção Corretiva','Visita Técnica','Retorno','Emergencial'].map(x=><option key={x}>{x}</option>)}
                </select>
              </div>
              <div className="field"><label>Prioridade</label>
                <select value={form.prioridade} onChange={e=>setForm({...form,prioridade:e.target.value})}>
                  <option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option><option value="emergencial">Emergencial</option>
                </select>
              </div>
              <div className="field"><label>Data da visita</label><input type="date" value={form.data_visita||''} onChange={e=>setForm({...form,data_visita:e.target.value})}/></div>
              <div className="field"><label>Status</label>
                <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                  <option value="aberta">Aberta</option><option value="agendada">Agendada</option><option value="em_atendimento">Em atendimento</option><option value="aguardando_material">Aguardando material</option><option value="aguardando_orcamento">Aguardando orçamento</option><option value="concluida">Concluída</option><option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div className="field"><label>Horário de chegada</label><input type="time" value={form.horario_chegada||''} onChange={e=>setForm({...form,horario_chegada:e.target.value})}/></div>
              <div className="field"><label>Horário de término</label><input type="time" value={form.horario_termino||''} onChange={e=>setForm({...form,horario_termino:e.target.value})}/></div>
              {profile.perfil==='admin'&&<div className="field span2"><label>Técnico responsável</label>
                <select value={form.tecnico_id||''} onChange={e=>setForm({...form,tecnico_id:e.target.value})}>
                  {tecnicos.map(t=><option key={t.id} value={t.id}>{t.nome||'Usuário'} — {t.perfil}</option>)}
                </select>
              </div>}
              <div className="field span2"><label>Solicitação / motivo do atendimento</label><textarea rows="4" value={form.motivo||''} onChange={e=>setForm({...form,motivo:e.target.value})}/></div>
            </div>
          </div>

          <div className="osSection">
            <h3>2. Sistemas envolvidos *</h3>
            <div className="systemGrid">
              {sistemasCatalogo.map(([cod,label])=>{
                const on=sistemas.some(x=>x.sistema===cod)
                return <label className={`systemOption ${on?'selected':''}`} key={cod}>
                  <input type="checkbox" checked={on} onChange={e=>setSistema(cod,e.target.checked)}/>
                  <span>{label}</span>
                </label>
              })}
            </div>
          </div>

          {sistemas.map(s=>{
            const items=checklist.filter(x=>x.sistema===s.sistema)
            const isOpen=expanded[s.sistema]!==false
            return <div className="osSection" key={s.sistema}>
              <button type="button" className="sectionToggle" onClick={()=>setExpanded(x=>({...x,[s.sistema]:!isOpen}))}>
                <span>Checklist — {labelSistema(s.sistema)}</span>{isOpen?<ChevronUp/>:<ChevronDown/>}
              </button>
              {isOpen&&<div className="checkGroups">
                {[...new Set(items.map(x=>x.grupo))].map(grupo=><div className="checkGroup" key={grupo}>
                  <h4>{grupo}</h4>
                  {items.filter(x=>x.grupo===grupo).map(item=><div className="checkRow" key={item.id}>
                    <div className="checkText">{item.item}</div>
                    <div className="checkStates">
                      {[
                        ['ok','OK'],['irregular','Irregular'],['nao_aplicavel','N/A'],['nao_verificado','—']
                      ].map(([v,l])=><button type="button" key={v} className={item.status===v?`state active ${v}`:'state'} onClick={()=>updateChecklist(item.id,v)}>{l}</button>)}
                    </div>
                  </div>)}
                </div>)}
              </div>}
            </div>
          })}

          <div className="osSection">
            <h3>3. Manutenção corretiva / diagnóstico</h3>
            <div className="formGrid">
              <div className="field span2"><label>Problema relatado</label><textarea rows="3" value={form.problema_relatado||''} onChange={e=>setForm({...form,problema_relatado:e.target.value})}/></div>
              <div className="field span2"><label>Diagnóstico técnico</label><textarea rows="3" value={form.diagnostico||''} onChange={e=>setForm({...form,diagnostico:e.target.value})}/></div>
              <div className="field span2"><label>Causa identificada</label><textarea rows="2" value={form.causa_identificada||''} onChange={e=>setForm({...form,causa_identificada:e.target.value})}/></div>
              <div className="field span2"><label>Serviço executado</label><textarea rows="4" value={form.servico_executado||''} onChange={e=>setForm({...form,servico_executado:e.target.value})}/></div>
              <div className="field"><label>Equipamento/peça substituída</label><input value={form.equipamento_substituido||''} onChange={e=>setForm({...form,equipamento_substituido:e.target.value})}/></div>
              <div className="field"><label>Resultado</label>
                <select value={form.resultado||''} onChange={e=>setForm({...form,resultado:e.target.value})}>
                  <option value="">Selecione...</option><option>Equipamento normalizado</option><option>Sistema normalizado</option><option>Funcionamento parcial</option><option>Necessário retorno</option><option>Necessário orçamento</option><option>Necessária substituição de equipamento</option>
                </select>
              </div>
              <div className="field span2"><label>Teste realizado após o reparo</label><textarea rows="2" value={form.teste_realizado||''} onChange={e=>setForm({...form,teste_realizado:e.target.value})}/></div>
            </div>
          </div>

          <div className="osSection">
            <div className="sectionHead"><h3>4. Materiais / peças utilizados</h3><button type="button" className="ghost" onClick={addMaterial}><PackagePlus size={16}/> Adicionar material</button></div>
            {materiais.length===0?<div className="emptyInline">Nenhum material informado.</div>:
              materiais.map((m,i)=><div className="materialRow" key={m.id}>
                <span>{i+1}</span>
                <input placeholder="Descrição" value={m.descricao} onChange={e=>updateMaterial(m.id,'descricao',e.target.value)}/>
                <input type="number" min="0" step="0.01" value={m.quantidade} onChange={e=>updateMaterial(m.id,'quantidade',e.target.value)}/>
                <input placeholder="un" value={m.unidade||'un'} onChange={e=>updateMaterial(m.id,'unidade',e.target.value)}/>
                <button type="button" className="iconBtn danger" onClick={()=>setMateriais(x=>x.filter(y=>y.id!==m.id))}><Trash2 size={16}/></button>
              </div>)}
          </div>

          <div className="osSection">
            <h3>5. Pendências / recomendações</h3>
            <div className="formGrid">
              <div className="field span2"><label>Pendências identificadas</label><textarea rows="3" value={form.pendencias||''} onChange={e=>setForm({...form,pendencias:e.target.value})}/></div>
              <div className="field span2"><label>Recomendações técnicas</label><textarea rows="3" value={form.recomendacoes||''} onChange={e=>setForm({...form,recomendacoes:e.target.value})}/></div>
              <div className="field span2 checkboxField"><label><input type="checkbox" checked={!!form.necessita_orcamento} onChange={e=>setForm({...form,necessita_orcamento:e.target.checked})}/> Necessita orçamento adicional</label></div>
              {form.necessita_orcamento&&<>
                <div className="field span2"><label>Descrição do orçamento recomendado</label><textarea rows="2" value={form.descricao_orcamento||''} onChange={e=>setForm({...form,descricao_orcamento:e.target.value})}/></div>
                <div className="field span2"><label>Prazo recomendado para correção</label><input value={form.prazo_correcao||''} onChange={e=>setForm({...form,prazo_correcao:e.target.value})}/></div>
              </>}
            </div>
          </div>

          <div className="osSection">
            <h3>6. Condição final do sistema</h3>
            <div className="formGrid">
              <div className="field span2"><label>Condição final</label>
                <select value={form.condicao_final||''} onChange={e=>setForm({...form,condicao_final:e.target.value})}>
                  <option value="">Selecione...</option><option>Sistema funcionando normalmente</option><option>Sistema funcionando parcialmente</option><option>Equipamento permanece com falha</option><option>Necessário substituição de equipamento</option><option>Necessário novo atendimento</option><option>Aguardando aprovação de orçamento</option>
                </select>
              </div>
              <div className="field span2"><label>Observações finais</label><textarea rows="4" value={form.observacoes_finais||''} onChange={e=>setForm({...form,observacoes_finais:e.target.value})}/></div>
            </div>
          </div>

          <div className="osSaveBar">
            <div className="saveHint"><CheckCircle2 size={17}/> Fotos, assinatura e PDF entram na próxima etapa.</div>
            <div className="modalActions compact">
              <button type="button" className="ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="primary"><Save size={17}/> Salvar OS</button>
            </div>
          </div>
        </form>
      </div>
    </div>}
  </>
}
