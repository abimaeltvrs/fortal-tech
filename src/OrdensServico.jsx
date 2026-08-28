import React,{useEffect,useMemo,useRef,useState} from 'react'
import {
  Plus,ClipboardList,Search,X,Save,Trash2,Pencil,WifiOff,
  ChevronDown,ChevronUp,PackagePlus,CheckCircle2,AlertTriangle,
  FileDown,Camera,ImagePlus,Trash,Flag,UserCheck,RefreshCcw
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import SignaturePad from './SignaturePad'
import {
  getCachedClientes,cacheClientes,getCachedOrdensServico,cacheOrdensServico,
  saveLocalOS,removeLocalOS,replaceLocalOSChildren,getLocalOSChildren,queueChange,
  saveLocalOSMedia,getLocalOSMedia,removeLocalOSMedia,replaceLocalOSSignatures,getLocalOSSignatures
} from './offline'
import {syncPendingChanges} from './sync'
import {saveDraft,loadDraft,clearDraft,draftAgeLabel} from './drafts'
import {sanitizeOSPayload} from './sanitize'

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

function money(v){
  return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
}
function dataBR(v){
  if(!v) return '-'
  const [y,m,d]=String(v).slice(0,10).split('-')
  return y&&m&&d?`${d}/${m}/${y}`:v
}
function statusChecklist(v){
  return ({ok:'OK',irregular:'IRREGULAR',nao_aplicavel:'N/A',nao_verificado:'NÃO VERIFICADO'})[v]||v||'-'
}

export default function OrdensServico({supabase,profile,session,setSyncStatus,openItemId,clearOpenItem}){
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
  const [sucesso,setSucesso]=useState('')
  const [expanded,setExpanded]=useState({})
  const [statusRapido,setStatusRapido]=useState({})
  const [statusSalvando,setStatusSalvando]=useState(null)
  const [fotos,setFotos]=useState([])
  const [assinaturaCliente,setAssinaturaCliente]=useState('')
  const [assinaturaTecnico,setAssinaturaTecnico]=useState('')
  const [nomeAceiteCliente,setNomeAceiteCliente]=useState('')
  const [cargoAceiteCliente,setCargoAceiteCliente]=useState('')
  const [pendenciasFormulario,setPendenciasFormulario]=useState([])
  const [salvandoOS,setSalvandoOS]=useState(false)
  const [visualizacao,setVisualizacao]=useState(null)
  const [draftRecovered,setDraftRecovered]=useState(null)
  const [draftDirty,setDraftDirty]=useState(false)
  const [viewChildren,setViewChildren]=useState({sistemas:[],checklist:[],materiais:[],fotos:[],assinaturas:[]})
  const modalRef=useRef(null)


  useEffect(()=>{
    if(!modal)return
    setDraftDirty(true)
    const t=setTimeout(()=>{
      saveDraft(draftKey(),buildDraftPayload())
    },450)
    return()=>clearTimeout(t)
  },[
    modal,edit?.id,form,sistemas,checklist,materiais,fotos,
    assinaturaCliente,assinaturaTecnico,nomeAceiteCliente,cargoAceiteCliente,expanded
  ])

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
    if(!openItemId || !lista.length)return
    const item=lista.find(x=>x.id===openItemId)
    if(item){
      editar(item)
      clearOpenItem?.()
    }
  },[openItemId,lista])

  useEffect(()=>{
    const abrir=()=>novo()
    window.addEventListener('fortal:new-os',abrir)
    return()=>window.removeEventListener('fortal:new-os',abrir)
  },[tecnicos,profile.perfil])

  useEffect(()=>{
    const abrirOS=(e)=>{
      const id=e.detail
      const item=lista.find(x=>x.id===id)
      if(item) editar(item)
    }
    window.addEventListener('fortal:view-os-local',abrirOS)
    return()=>window.removeEventListener('fortal:view-os-local',abrirOS)
  },[lista])

  const filtradas=useMemo(()=>{
    const q=busca.toLowerCase().trim()
    if(!q)return lista
    return lista.filter(os=>[
      os.numero,os.clientes?.nome,clientes.find(c=>c.id===os.cliente_id)?.nome,
      os.tipo_atendimento,os.status
    ].filter(Boolean).join(' ').toLowerCase().includes(q))
  },[lista,busca,clientes])

  const totalMateriais=useMemo(()=>materiais.reduce((s,m)=>
    s+(Number(m.quantidade||0)*Number(m.preco_unitario||0)),0
  ),[materiais])

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


  function draftKey(){
    return edit?.id ? `os:${edit.id}` : 'os:new'
  }

  function buildDraftPayload(){
    return {
      form,
      sistemas,
      checklist,
      materiais,
      fotos,
      assinaturaCliente,
      assinaturaTecnico,
      nomeAceiteCliente,
      cargoAceiteCliente,
      expanded
    }
  }

  function restoreDraft(payload){
    if(!payload)return
    if(payload.form){
      const safe={...payload.form}
      // campos retornados por joins/queries são apenas para visualização
      delete safe.clientes
      delete safe.profiles
      delete safe.tecnicos
      delete safe.os_sistemas
      delete safe.os_checklist
      delete safe.os_materiais
      delete safe.os_fotos
      delete safe.os_assinaturas
      setForm(safe)
    }
    if(Array.isArray(payload.sistemas))setSistemas(payload.sistemas)
    if(Array.isArray(payload.checklist))setChecklist(payload.checklist)
    if(Array.isArray(payload.materiais))setMateriais(payload.materiais)
    if(Array.isArray(payload.fotos))setFotos(payload.fotos)
    if(typeof payload.assinaturaCliente==='string')setAssinaturaCliente(payload.assinaturaCliente)
    if(typeof payload.assinaturaTecnico==='string')setAssinaturaTecnico(payload.assinaturaTecnico)
    if(typeof payload.nomeAceiteCliente==='string')setNomeAceiteCliente(payload.nomeAceiteCliente)
    if(typeof payload.cargoAceiteCliente==='string')setCargoAceiteCliente(payload.cargoAceiteCliente)
    if(payload.expanded)setExpanded(payload.expanded)
  }

  function descartarRascunho(){
    clearDraft(draftKey())
    setDraftRecovered(null)
    setDraftDirty(false)
  }

  function novo(){
    setErro('')
    setSucesso('')
    setPendenciasFormulario([])
    const now=new Date()
    const hh=String(now.getHours()).padStart(2,'0')
    const mm=String(now.getMinutes()).padStart(2,'0')
    setEdit(null)
    setForm({...empty,
      tecnico_id:profile.perfil==='admin'?(tecnicos[0]?.id||session.user.id):session.user.id,
      data_visita:now.toISOString().slice(0,10),
      horario_chegada:`${hh}:${mm}`
    })
    setSistemas([])
    setChecklist([])
    setMateriais([])
    setFotos([])
    setAssinaturaCliente('')
    setAssinaturaTecnico('')
    setNomeAceiteCliente('')
    setCargoAceiteCliente('')
    setExpanded({})
    setModal(true)
  }


  async function visualizar(os){
    setErro('')
    try{
      let children
      if(navigator.onLine){
        const [sr,cr,mr,fr,ar]=await Promise.all([
          supabase.from('os_sistemas').select('*').eq('os_id',os.id),
          supabase.from('os_checklist').select('*').eq('os_id',os.id).order('sistema').order('grupo'),
          supabase.from('os_materiais').select('*').eq('os_id',os.id),
          supabase.from('os_fotos').select('*').eq('os_id',os.id).order('created_at'),
          supabase.from('os_assinaturas').select('*').eq('os_id',os.id)
        ])
        if(sr.error)throw sr.error
        if(cr.error)throw cr.error
        if(mr.error)throw mr.error
        children={
          sistemas:sr.data||[],
          checklist:cr.data||[],
          materiais:mr.data||[],
          fotos:fr.data||[],
          assinaturas:ar.data||[]
        }
        for(const f of children.fotos){
          if(f.arquivo_path){
            const {data}=await supabase.storage.from('os-arquivos').createSignedUrl(f.arquivo_path,3600)
            f.preview_url=data?.signedUrl||''
          }
        }
      }else{
        const c=await getLocalOSChildren(os.id)
        children={
          ...c,
          fotos:await getLocalOSMedia(os.id),
          assinaturas:await getLocalOSSignatures(os.id)
        }
      }
      setViewChildren(children)
      setVisualizacao(os)
    }catch(e){
      setErro(`Não foi possível abrir a OS: ${e.message||'erro não identificado.'}`)
    }
  }

  async function editar(os){
    setErro('')
    setSucesso('')
    setPendenciasFormulario([])
    setEdit(os)
    setForm({
      ...empty,
      cliente_id:os.cliente_id||'',
      tipo_atendimento:os.tipo_atendimento||empty.tipo_atendimento,
      prioridade:os.prioridade||empty.prioridade,
      data_visita:os.data_visita||'',
      status:os.status||empty.status,
      horario_chegada:os.horario_chegada||'',
      horario_termino:os.horario_termino||'',
      tecnico_id:os.tecnico_id||'',
      motivo:os.motivo||'',
      problema_relatado:os.problema_relatado||'',
      diagnostico:os.diagnostico||'',
      causa_identificada:os.causa_identificada||'',
      servico_executado:os.servico_executado||'',
      pendencias:os.pendencias||'',
      recomendacoes:os.recomendacoes||'',
      necessita_orcamento:Boolean(os.necessita_orcamento),
      condicao_final:os.condicao_final||'',
      observacoes:os.observacoes||'',
      encerrada_em:os.encerrada_em||null
    })
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

    let media=[]
    let assin=[]
    if(navigator.onLine){
      const [fr,ar]=await Promise.all([
        supabase.from('os_fotos').select('*').eq('os_id',os.id).order('created_at'),
        supabase.from('os_assinaturas').select('*').eq('os_id',os.id)
      ])
      media=fr.data||[]
      assin=ar.data||[]
      for(const f of media){
        if(f.arquivo_path){
          const {data}=await supabase.storage.from('os-arquivos').createSignedUrl(f.arquivo_path,3600)
          f.preview_url=data?.signedUrl||''
        }
      }
    }else{
      media=await getLocalOSMedia(os.id)
      assin=await getLocalOSSignatures(os.id)
    }
    setFotos(media)
    const ac=assin.find(x=>x.tipo==='cliente')
    const at=assin.find(x=>x.tipo==='tecnico')
    setAssinaturaCliente(ac?.assinatura_data||ac?.preview_data||'')
    setNomeAceiteCliente(ac?.nome||'')
    setCargoAceiteCliente(ac?.cargo||'')
    setAssinaturaTecnico(at?.assinatura_data||at?.preview_data||'')
    const savedDraft=loadDraft(`os:${os.id}`)
    if(savedDraft?.data){
      restoreDraft(savedDraft.data)
      setDraftRecovered(savedDraft.saved_at)
    }else{
      setDraftRecovered(null)
    }
    setModal(true)
  }

  function updateChecklist(id,status){
    setChecklist(c=>c.map(x=>x.id===id?{...x,status}:x))
  }

  function addMaterial(){
    setMateriais(m=>[...m,{id:crypto.randomUUID(),os_id:edit?.id||'',descricao:'',quantidade:1,unidade:'un',preco_unitario:0}])
  }

  function updateMaterial(id,key,value){
    setMateriais(m=>m.map(x=>x.id===id?{...x,[key]:value}:x))
  }


  async function fileToDataUrl(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader()
      reader.onload=()=>resolve(reader.result)
      reader.onerror=reject
      reader.readAsDataURL(file)
    })
  }

  async function adicionarFotos(tipo,fileList){
    const files=[...fileList].slice(0,8)
    const novas=[]
    for(const file of files){
      const data=await fileToDataUrl(file)
      novas.push({
        id:crypto.randomUUID(),
        os_id:edit?.id||'',
        tipo,
        arquivo_path:'',
        preview_data:data,
        preview_url:data,
        legenda:'',
        created_at:new Date().toISOString(),
        _new:true
      })
    }
    setFotos(f=>[...f,...novas])
  }

  async function excluirFoto(foto){
    if(foto.arquivo_path&&navigator.onLine){
      await supabase.storage.from('os-arquivos').remove([foto.arquivo_path])
      await supabase.from('os_fotos').delete().eq('id',foto.id)
    }
    await removeLocalOSMedia(foto.id)
    setFotos(x=>x.filter(y=>y.id!==foto.id))
  }

  async function salvarMidiasEAssinaturas(osId){
    const salvas=[]
    for(const foto of fotos){
      if(foto.arquivo_path&&!foto._new){
        salvas.push(foto)
        continue
      }
      if(navigator.onLine){
        const blob=await (await fetch(foto.preview_data||foto.preview_url)).blob()
        const ext=(blob.type.split('/')[1]||'jpg').replace('jpeg','jpg')
        const path=`${osId}/${foto.tipo}/${foto.id}.${ext}`
        const {error:upErr}=await supabase.storage.from('os-arquivos').upload(path,blob,{upsert:true,contentType:blob.type})
        if(upErr) throw upErr
        const row={
          id:foto.id,os_id:osId,tipo:foto.tipo,arquivo_path:path,
          legenda:foto.legenda||'',created_at:foto.created_at||new Date().toISOString()
        }
        const {error}=await supabase.from('os_fotos').upsert(row,{onConflict:'id'})
        if(error) throw error
        salvas.push({...row,preview_url:foto.preview_data||foto.preview_url})
      }else{
        const row={...foto,os_id:osId,_syncStatus:'pending'}
        await saveLocalOSMedia(row,'pending')
        salvas.push(row)
      }
    }

    const assinaturas=[
      assinaturaCliente?{
        id:crypto.randomUUID(),os_id:osId,tipo:'cliente',
        nome:nomeAceiteCliente||'',cargo:cargoAceiteCliente||'',
        assinatura_data:assinaturaCliente,created_at:new Date().toISOString()
      }:null,
      assinaturaTecnico?{
        id:crypto.randomUUID(),os_id:osId,tipo:'tecnico',
        nome:profile.nome||'',cargo:'Técnico',
        assinatura_data:assinaturaTecnico,created_at:new Date().toISOString()
      }:null
    ].filter(Boolean)

    if(navigator.onLine){
      await supabase.from('os_assinaturas').delete().eq('os_id',osId)
      if(assinaturas.length){
        const {error}=await supabase.from('os_assinaturas').insert(assinaturas)
        if(error) throw error
      }
    }else{
      await replaceLocalOSSignatures(osId,assinaturas.map(x=>({...x,_syncStatus:'pending'})))
    }
    return {fotos:salvas,assinaturas}
  }



  function irParaCampoObrigatorio(id){
    setTimeout(()=>{
      const root=modalRef.current
      const el=root?.querySelector?.(`[data-field="${id}"]`)
      if(!el)return

      // Rola o próprio modal, não a página atrás dele.
      const top=Math.max(0,el.offsetTop-95)
      root.scrollTo?.({top,behavior:'smooth'})

      el.classList.remove('fieldPulse')
      void el.offsetWidth
      el.classList.add('fieldPulse')

      setTimeout(()=>{
        const control=el.querySelector?.('input,select,textarea,button')
        control?.focus?.({preventScroll:true})
      },320)

      setTimeout(()=>el.classList.remove('fieldPulse'),1800)
    },60)
  }

  function validarFormulario(){
    const faltas=[]
    if(!form.cliente_id) faltas.push({id:'cliente',label:'Cliente'})
    if(!form.data_visita) faltas.push({id:'data_visita',label:'Data da visita'})
    if(!form.horario_chegada) faltas.push({id:'horario_chegada',label:'Horário de chegada'})
    if(!sistemas.length) faltas.push({id:'sistemas',label:'Sistema(s) envolvido(s)'})

    if(form.status==='concluida'){
      if(!form.condicao_final) faltas.push({id:'condicao_final',label:'Condição final do sistema'})
      if(!nomeAceiteCliente.trim()) faltas.push({id:'nome_aceite',label:'Nome do responsável pelo cliente'})
      if(!assinaturaCliente) faltas.push({id:'assinatura_cliente',label:'Assinatura do cliente'})
      if(!assinaturaTecnico) faltas.push({id:'assinatura_tecnico',label:'Assinatura do técnico'})
    }

    setPendenciasFormulario(faltas)

    if(faltas.length){
      setErro(`Faltam ${faltas.length} item(ns) para salvar: ${faltas.map(x=>x.label).join(', ')}.`)
      irParaCampoObrigatorio(faltas[0].id)
      return false
    }
    return true
  }

  async function persistirOS(formEfetivo,{finalizando=false}={}){
    setErro('')
    setSucesso('')

    // valida usando exatamente o estado que será salvo
    const faltas=[]
    if(!formEfetivo.cliente_id) faltas.push({id:'cliente',label:'Cliente'})
    if(!formEfetivo.data_visita) faltas.push({id:'data_visita',label:'Data da visita'})
    if(!formEfetivo.horario_chegada) faltas.push({id:'horario_chegada',label:'Horário de chegada'})
    if(!sistemas.length) faltas.push({id:'sistemas',label:'Sistema(s) envolvido(s)'})

    if(formEfetivo.status==='concluida'){
      if(!formEfetivo.condicao_final) faltas.push({id:'condicao_final',label:'Condição final do sistema'})
      if(!nomeAceiteCliente.trim()) faltas.push({id:'nome_aceite',label:'Nome do responsável pelo cliente'})
      if(!assinaturaCliente) faltas.push({id:'assinatura_cliente',label:'Assinatura do cliente'})
      if(!assinaturaTecnico) faltas.push({id:'assinatura_tecnico',label:'Assinatura do técnico'})
    }

    setPendenciasFormulario(faltas)
    if(faltas.length){
      setErro(
        `${finalizando?'Não foi possível finalizar':'Não foi possível salvar'} a OS. `+
        `Preencha: ${faltas.map(x=>x.label).join(', ')}.`
      )
      irParaCampoObrigatorio(faltas[0].id)
      return false
    }

    setSalvandoOS(true)
    const eraEdicao=Boolean(edit)
    const osId=edit?.id||crypto.randomUUID()
    // IMPORTANTE:
    // nunca envie o objeto inteiro do formulário ao Supabase.
    // Registros carregados com joins podem conter propriedades auxiliares
    // como `clientes`, que não são colunas reais de ordens_servico.
    const allowedOSFields=[
      'cliente_id',
      'tipo_atendimento',
      'prioridade',
      'data_visita',
      'status',
      'horario_chegada',
      'horario_termino',
      'tecnico_id',
      'motivo',
      'problema_relatado',
      'diagnostico',
      'causa_identificada',
      'servico_executado',
      'pendencias',
      'recomendacoes',
      'necessita_orcamento',
      'condicao_final',
      'observacoes',
      'encerrada_em'
    ]

    const osPayload={
      id:osId,
      numero:edit?.numero||numeroOS()
    }

    for(const field of allowedOSFields){
      if(Object.prototype.hasOwnProperty.call(formEfetivo,field)){
        osPayload[field]=formEfetivo[field]
      }
    }

    // Normalizações
    osPayload.cliente_id=formEfetivo.cliente_id||null
    osPayload.tecnico_id=profile.perfil==='admin'
      ? (formEfetivo.tecnico_id||null)
      : session.user.id
    osPayload.data_visita=formEfetivo.data_visita||null
    osPayload.horario_chegada=formEfetivo.horario_chegada||null
    osPayload.horario_termino=formEfetivo.horario_termino||null
    osPayload.encerrada_em=formEfetivo.encerrada_em||null
    osPayload.updated_at=new Date().toISOString()

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
      unidade:x.unidade||'un',
      preco_unitario:Number(x.preco_unitario||0)
    }))
    const safeOSPayload=sanitizeOSPayload(osPayload)
    const bundle={os:safeOSPayload,sistemas:sistPayload,checklist:checkPayload,materiais:matPayload}

    try{
      if(navigator.onLine){
        const {data,error}=await supabase.from('ordens_servico')
          .upsert(safeOSPayload,{onConflict:'id'}).select().single()
        if(error) throw error

        // Só substitui os filhos depois que a OS principal foi gravada.
        const deletes=await Promise.all([
          supabase.from('os_sistemas').delete().eq('os_id',osId),
          supabase.from('os_checklist').delete().eq('os_id',osId),
          supabase.from('os_materiais').delete().eq('os_id',osId)
        ])
        const deleteError=deletes.find(x=>x.error)?.error
        if(deleteError) throw deleteError

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

        await salvarMidiasEAssinaturas(osId)
        await saveLocalOS(data,'synced')
        await replaceLocalOSChildren(osId,{
          sistemas:savedSistemas,
          checklist:savedChecklist,
          materiais:savedMateriais
        })
      }else{
        await saveLocalOS(safeOSPayload,'pending')
        await replaceLocalOSChildren(osId,{
          sistemas:sistPayload,
          checklist:checkPayload,
          materiais:matPayload
        })
        await salvarMidiasEAssinaturas(osId)
        await queueChange('ordens_servico','upsert_bundle',bundle)
        setSyncStatus('pending')
      }

      // Só fecha depois de TODAS as etapas terem sido concluídas.
      clearDraft(edit?.id ? `os:${edit.id}` : 'os:new')
      clearDraft(`os:${osId}`)
      setDraftRecovered(null)
      setDraftDirty(false)
      setModal(false)
      setEdit(null)
      setForm(empty)
      setSistemas([])
      setChecklist([])
      setMateriais([])
      setFotos([])
      setAssinaturaCliente('')
      setAssinaturaTecnico('')
      setNomeAceiteCliente('')
      setCargoAceiteCliente('')
      setExpanded({})
      setPendenciasFormulario([])
      await carregar()

      setSucesso(
        finalizando
          ? 'OS finalizada e salva com sucesso.'
          : eraEdicao
            ? 'OS atualizada com sucesso.'
            : 'OS criada com sucesso.'
      )
      window.scrollTo({top:0,behavior:'smooth'})
      return true
    }catch(e){
      // No modo online, mantém o modal aberto para o usuário não perder nada.
      setErro(
        `${finalizando?'Não foi possível finalizar':'Não foi possível salvar'} a OS: `+
        `${e.message||'erro não identificado.'}`
      )
      setTimeout(()=>{
        modalRef.current?.scrollTo?.({top:0,behavior:'smooth'})
      },50)
      return false
    }finally{
      setSalvandoOS(false)
    }
  }

  async function salvar(e){
    e?.preventDefault?.()
    await persistirOS({...form},{finalizando:false})
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


  async function finalizarOSAtual(){
    if(!edit || salvandoOS)return

    const agora=new Date()
    const hh=String(agora.getHours()).padStart(2,'0')
    const mm=String(agora.getMinutes()).padStart(2,'0')
    const ss=String(agora.getSeconds()).padStart(2,'0')

    const formFinal={
      ...form,
      status:'concluida',
      horario_termino:`${hh}:${mm}:${ss}`,
      encerrada_em:agora.toISOString()
    }

    // Atualiza visualmente e salva usando o mesmo objeto, sem depender
    // da atualização assíncrona do estado do React.
    setForm(formFinal)
    await persistirOS(formFinal,{finalizando:true})
  }

  async function salvarStatusRapido(os){
    const novoStatus=statusRapido[os.id]||os.status
    setErro('')
    setSucesso('')
    setStatusSalvando(os.id)

    const agora=new Date()
    const hh=String(agora.getHours()).padStart(2,'0')
    const mm=String(agora.getMinutes()).padStart(2,'0')
    const ss=String(agora.getSeconds()).padStart(2,'0')

    const patch={status:novoStatus,updated_at:agora.toISOString()}

    if(novoStatus==='concluida'){
      patch.horario_termino=`${hh}:${mm}:${ss}`
      patch.encerrada_em=agora.toISOString()
    }else if(os.status==='concluida' && novoStatus!=='concluida'){
      patch.encerrada_em=null
      patch.horario_termino=null
    }

    try{
      if(navigator.onLine){
        const {data,error}=await supabase.from('ordens_servico')
          .update(patch).eq('id',os.id).select().single()
        if(error) throw error
        await saveLocalOS(data,'synced')
      }else{
        const local={...os,...patch,_syncStatus:'pending'}
        await saveLocalOS(local,'pending')
        await queueChange('ordens_servico','upsert_bundle',{
          os:local,
          sistemas:(await getLocalOSChildren(os.id)).sistemas,
          checklist:(await getLocalOSChildren(os.id)).checklist,
          materiais:(await getLocalOSChildren(os.id)).materiais
        })
        setSyncStatus('pending')
      }

      setStatusRapido(x=>{
        const n={...x}
        delete n[os.id]
        return n
      })
      await carregar()
      setSucesso(
        novoStatus==='concluida'
          ? `OS ${os.numero} concluída às ${hh}:${mm}.`
          : `Status da ${os.numero} atualizado.`
      )
    }catch(e){
      setErro(e.message||'Não foi possível atualizar o status da OS.')
    }finally{
      setStatusSalvando(null)
    }
  }

  const nomeCliente=id=>clientes.find(c=>c.id===id)?.nome||'Cliente'
  const labelSistema=cod=>sistemasCatalogo.find(x=>x[0]===cod)?.[1]||cod

  async function gerarPDF(os){
    setErro('')
    try{
      const cliente=clientes.find(c=>c.id===os.cliente_id)||{}
      let children
      if(navigator.onLine){
        const [sr,cr,mr,fr,ar]=await Promise.all([
          supabase.from('os_sistemas').select('*').eq('os_id',os.id),
          supabase.from('os_checklist').select('*').eq('os_id',os.id).order('sistema').order('grupo'),
          supabase.from('os_materiais').select('*').eq('os_id',os.id),
          supabase.from('os_fotos').select('*').eq('os_id',os.id).order('created_at'),
          supabase.from('os_assinaturas').select('*').eq('os_id',os.id)
        ])
        if(sr.error) throw sr.error
        if(cr.error) throw cr.error
        if(mr.error) throw mr.error
        children={sistemas:sr.data||[],checklist:cr.data||[],materiais:mr.data||[],fotos:fr.data||[],assinaturas:ar.data||[]}
      }else{
        children=await getLocalOSChildren(os.id)
        children.fotos=await getLocalOSMedia(os.id)
        children.assinaturas=await getLocalOSSignatures(os.id)
      }

      const doc=new jsPDF({unit:'mm',format:'a4'})
      const pageW=210
      let y=16

      const line=(label,value)=>{
        doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.text(`${label}:`,14,y)
        doc.setFont('helvetica','normal')
        const txt=doc.splitTextToSize(String(value||'-'),135)
        doc.text(txt,55,y); y+=Math.max(6,txt.length*4.2)
      }
      const section=(title)=>{
        if(y>270){doc.addPage();y=16}
        y+=2
        doc.setFillColor(15,28,46)
        doc.rect(14,y-4,182,8,'F')
        doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(10)
        doc.text(title,17,y+1)
        doc.setTextColor(25,25,25)
        y+=10
      }
      const paragraph=(label,value)=>{
        if(!value) return
        doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text(label,14,y);y+=4
        doc.setFont('helvetica','normal')
        const lines=doc.splitTextToSize(String(value),180)
        if(y+lines.length*4.3>280){doc.addPage();y=16}
        doc.text(lines,14,y);y+=lines.length*4.3+3
      }

      doc.setFillColor(8,17,31);doc.rect(0,0,pageW,30,'F')
      doc.setTextColor(19,185,129);doc.setFont('helvetica','bold');doc.setFontSize(18)
      doc.text('FORTAL TECH',14,13)
      doc.setTextColor(255,255,255);doc.setFontSize(11)
      doc.text('ORDEM DE SERVIÇO - MANUTENÇÃO PREVENTIVA E CORRETIVA',14,21)
      doc.setTextColor(30,30,30)
      y=38

      line('Nº da OS',os.numero)
      line('Data',dataBR(os.data_visita))
      line('Tipo de atendimento',os.tipo_atendimento)
      line('Prioridade',String(os.prioridade||'-').toUpperCase())
      line('Status',os.status)

      section('1. DADOS DO CLIENTE')
      line('Cliente / Condomínio',cliente.nome)
      line('CPF / CNPJ',cliente.documento)
      line('Endereço',[cliente.endereco,cliente.numero,cliente.complemento,cliente.bairro,cliente.cidade,cliente.uf].filter(Boolean).join(', '))
      line('Responsável',cliente.responsavel)
      line('Telefone',cliente.telefone)
      line('Data da visita',dataBR(os.data_visita))
      line('Chegada',os.horario_chegada||'-')
      line('Término',os.horario_termino||'-')

      section('2. SOLICITAÇÃO / MOTIVO DO ATENDIMENTO')
      paragraph('Descrição',os.motivo)
      const sistemasPDF=(children.sistemas||[]).map(x=>labelSistema(x.sistema)).join(', ')
      line('Sistema(s) envolvido(s)',sistemasPDF)

      if((children.checklist||[]).length){
        section('3. CHECKLIST TÉCNICO')
        const rows=(children.checklist||[]).map(x=>[
          labelSistema(x.sistema),x.grupo||'',x.item,statusChecklist(x.status),x.observacao||''
        ])
        autoTable(doc,{
          startY:y,
          head:[['Sistema','Grupo','Item','Status','Observação']],
          body:rows,
          styles:{fontSize:6.8,cellPadding:1.5,overflow:'linebreak'},
          headStyles:{fillColor:[15,28,46]},
          columnStyles:{0:{cellWidth:27},1:{cellWidth:30},2:{cellWidth:67},3:{cellWidth:24},4:{cellWidth:34}},
          margin:{left:14,right:14}
        })
        y=doc.lastAutoTable.finalY+6
      }

      let pdfSection=4
      if(os.tipo_atendimento==='Manutenção Corretiva'){
        section(`${pdfSection}. MANUTENÇÃO CORRETIVA / DIAGNÓSTICO`)
        paragraph('Problema relatado',os.problema_relatado)
        paragraph('Diagnóstico técnico',os.diagnostico)
        paragraph('Causa identificada',os.causa_identificada)
        paragraph('Serviço executado',os.servico_executado)
        paragraph('Equipamento/peça substituída',os.equipamento_substituido)
        paragraph('Teste realizado após o reparo',os.teste_realizado)
        line('Resultado',os.resultado)
        pdfSection++
      }

      section(`${pdfSection}. MATERIAIS / PEÇAS UTILIZADOS`)
      const mats=children.materiais||[]
      if(mats.length){
        autoTable(doc,{
          startY:y,
          head:[['Item','Descrição','Qtd.','Un.','Preço unit.','Subtotal']],
          body:mats.map((m,i)=>[
            i+1,m.descricao,Number(m.quantidade||0).toLocaleString('pt-BR'),
            m.unidade||'un',money(m.preco_unitario),
            money(Number(m.quantidade||0)*Number(m.preco_unitario||0))
          ]),
          foot:[['','','','','TOTAL',money(mats.reduce((s,m)=>s+Number(m.quantidade||0)*Number(m.preco_unitario||0),0))]],
          styles:{fontSize:7.5,cellPadding:1.8},
          headStyles:{fillColor:[15,28,46]},
          footStyles:{fillColor:[19,185,129],textColor:[3,17,12],fontStyle:'bold'},
          margin:{left:14,right:14}
        })
        y=doc.lastAutoTable.finalY+6
      }else{
        paragraph('', 'Nenhum material informado.')
      }

      pdfSection++; section(`${pdfSection}. PENDÊNCIAS / RECOMENDAÇÕES`)
      paragraph('Pendências identificadas',os.pendencias)
      paragraph('Recomendações técnicas',os.recomendacoes)
      line('Necessita orçamento adicional',os.necessita_orcamento?'SIM':'NÃO')
      paragraph('Descrição do orçamento recomendado',os.descricao_orcamento)
      line('Prazo recomendado para correção',os.prazo_correcao)

      pdfSection++; section(`${pdfSection}. CONDIÇÃO FINAL DO SISTEMA`)
      line('Condição final',os.condicao_final)
      paragraph('Observações finais',os.observacoes_finais)

      if(os.prioridade==='emergencial'){
        if(y>250){doc.addPage();y=16}
        y+=4
        doc.setFillColor(253,230,138)
        doc.roundedRect(14,y,182,20,2,2,'F')
        doc.setTextColor(90,60,0);doc.setFont('helvetica','bold');doc.setFontSize(10)
        doc.text('ATENDIMENTO EMERGENCIAL - CUSTO DOS MATERIAIS',18,y+7)
        doc.setFontSize(14)
        doc.text(money(mats.reduce((s,m)=>s+Number(m.quantidade||0)*Number(m.preco_unitario||0),0)),18,y+15)
        doc.setTextColor(30,30,30);y+=26
      }


      const fotosPDF=children.fotos||[]
      if(fotosPDF.length){
        if(y>225){doc.addPage();y=16}
        pdfSection++; section(`${pdfSection}. REGISTRO FOTOGRÁFICO`)
        for(const foto of fotosPDF.slice(0,6)){
          try{
            let src=foto.preview_data||foto.preview_url||''
            if(!src&&foto.arquivo_path&&navigator.onLine){
              const {data}=await supabase.storage.from('os-arquivos').createSignedUrl(foto.arquivo_path,600)
              src=data?.signedUrl||''
            }
            if(src){
              const img=await new Promise((resolve,reject)=>{
                const im=new Image();im.crossOrigin='anonymous';im.onload=()=>resolve(im);im.onerror=reject;im.src=src
              })
              const canvas=document.createElement('canvas')
              const maxW=900
              const scale=Math.min(1,maxW/img.width)
              canvas.width=img.width*scale;canvas.height=img.height*scale
              canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height)
              const dataUrl=canvas.toDataURL('image/jpeg',0.72)
              if(y>225){doc.addPage();y=16}
              doc.addImage(dataUrl,'JPEG',14,y,58,42)
              doc.setFontSize(8);doc.setTextColor(80)
              doc.text(String(foto.tipo||'foto').toUpperCase(),76,y+8)
              y+=47
            }
          }catch{}
        }
      }

      const ass=children.assinaturas||[]
      const ac=ass.find(x=>x.tipo==='cliente')
      const at=ass.find(x=>x.tipo==='tecnico')
      if(y>235){doc.addPage();y=16}
      pdfSection++; section(`${pdfSection}. ACEITE DO SERVIÇO`)
      doc.setFontSize(8);doc.setTextColor(40)
      doc.text('Declaro que acompanhei a execução dos serviços descritos nesta Ordem de Serviço e fui informado sobre as condições, serviços, pendências e recomendações registradas.',14,y,{maxWidth:180})
      y+=14
      if(ac?.assinatura_data){
        try{doc.addImage(ac.assinatura_data,'PNG',14,y,70,25)}catch{}
      }
      if(at?.assinatura_data){
        try{doc.addImage(at.assinatura_data,'PNG',112,y,70,25)}catch{}
      }
      y+=28
      doc.setDrawColor(130);doc.line(14,y,90,y);doc.line(112,y,188,y)
      doc.setFontSize(8)
      doc.text(ac?.nome||'Responsável pelo cliente',14,y+5)
      doc.text(at?.nome||'Técnico responsável',112,y+5)
      if(ac?.cargo)doc.text(ac.cargo,14,y+10)


      const pages=doc.getNumberOfPages()
      for(let p=1;p<=pages;p++){
        doc.setPage(p)
        doc.setFontSize(7);doc.setTextColor(120)
        doc.text(`FORTAL TECH • ${os.numero} • Página ${p}/${pages}`,105,292,{align:'center'})
      }

      const filename=`${os.numero}.pdf`
      try{
        doc.save(filename)
      }catch(saveError){
        const blob=doc.output('blob')
        const url=URL.createObjectURL(blob)
        const a=document.createElement('a')
        a.href=url
        a.download=filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(()=>URL.revokeObjectURL(url),1500)
      }
      setSucesso(`PDF da ${os.numero} gerado.`)
    }catch(e){
      console.error('Erro ao gerar PDF:',e)
      setErro(`Não foi possível gerar o PDF: ${e.message||'erro não identificado.'}`)
    }
  }

  function gerarOrcamentoDaOS(os){
    window.dispatchEvent(new CustomEvent('fortal:orcamento-from-os',{detail:os}))
    window.dispatchEvent(new CustomEvent('fortal:navigate',{detail:'orcamentos'}))
  }

  return <>
    <div className="toolbar">
      <div><h2>Ordens de Serviço</h2><p>Preventivas, corretivas, visitas técnicas e retornos.</p></div>
      <button className="primary" onClick={novo}><Plus size={18}/> Nova OS</button>
    </div>

    {!navigator.onLine&&<div className="offlineNotice"><WifiOff size={17}/> Modo offline. A OS será sincronizada automaticamente quando a internet voltar.</div>}
    {sucesso&&<div className="successBox">{sucesso}</div>}
    {erro&&<div className="warningBox">{erro}</div>}

    <section className="panel">
      <div className="searchBar">
        <Search size={18}/>
        <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por OS, cliente, tipo ou status..." />
      </div>

      {filtradas.length===0?
        <div className="emptySmall"><ClipboardList size={36}/><b>Nenhuma OS encontrada</b><span>Crie a primeira Ordem de Serviço.</span></div>:
        <div className="osList">
          {filtradas.map(os=><div className="osRow clickableOS" key={os.id} onClick={()=>visualizar(os)}>
            <div className="osMain">
              <div className="osNumber">{os.numero}</div>
              <div><b>{os.clientes?.nome||nomeCliente(os.cliente_id)}</b>
                <span>{os.tipo_atendimento||'Atendimento'} • {os.data_visita||'Sem data'}</span>
                {os._syncStatus==='pending'&&<em>Aguardando sincronização</em>}
              </div>
            </div>
            <div className="osActions" onClick={e=>e.stopPropagation()}>
              <div className="quickStatus">
                <select
                  value={statusRapido[os.id]??os.status}
                  onChange={e=>setStatusRapido(x=>({...x,[os.id]:e.target.value}))}
                >
                  <option value="agendada">Agendada</option>
                  <option value="em_atendimento">Em atendimento</option>
                  <option value="aguardando_material">Aguardando material</option>
                  <option value="aguardando_orcamento">Aguardando orçamento</option>
                  <option value="concluida">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                </select>
                <button
                  className="saveStatusBtn"
                  disabled={statusSalvando===os.id}
                  onClick={()=>salvarStatusRapido(os)}
                >
                  {statusSalvando===os.id?'Salvando...':'Salvar status'}
                </button>
              </div>

              <div className="osActionButtons">
                {os.necessita_orcamento&&<button className="budgetFromOSBtn" title="Criar orçamento desta OS" onClick={()=>{
                  window.dispatchEvent(new CustomEvent('fortal:go-orcamento',{detail:os}))
                }}>Orçamento</button>}
                <button className="iconBtn pdfBtn" title="Gerar PDF" onClick={()=>gerarPDF(os)}><FileDown size={17}/></button>
                <button className="iconBtn" title="Editar OS completa" onClick={()=>editar(os)}><Pencil size={17}/></button>
                <button className="iconBtn danger" title="Excluir" onClick={()=>excluir(os)}><Trash2 size={17}/></button>
              </div>
            </div>
          </div>)}
        </div>}
    </section>


    {visualizacao&&<div className="modalBackdrop">
      <div className="modal osViewModal">
        <div className="modalHead">
          <div>
            <span className="eyebrow">ORDEM DE SERVIÇO</span>
            <h2>{visualizacao.numero}</h2>
          </div>
          <button className="iconBtn" onClick={()=>setVisualizacao(null)}><X/></button>
        </div>

        <div className="osViewStatus">
          <span className={`statusBadge status-${visualizacao.status}`}>{visualizacao.status}</span>
          <strong>{visualizacao.tipo_atendimento||'Atendimento'}</strong>
        </div>

        <div className="osViewInfo">
          <div><span>Cliente</span><b>{nomeCliente(visualizacao.cliente_id)}</b></div>
          <div><span>Data da visita</span><b>{visualizacao.data_visita||'-'}</b></div>
          <div><span>Chegada</span><b>{visualizacao.horario_chegada||'-'}</b></div>
          <div><span>Término</span><b>{visualizacao.horario_termino||'-'}</b></div>
          <div><span>Prioridade</span><b>{visualizacao.prioridade||'-'}</b></div>
          <div><span>Status</span><b>{visualizacao.status||'-'}</b></div>
        </div>

        {visualizacao.motivo&&<section className="osSection">
          <h3>Solicitação / motivo do atendimento</h3>
          <div className="clientNotes">{visualizacao.motivo}</div>
        </section>}

        <section className="osSection">
          <h3>Sistemas envolvidos</h3>
          <div className="viewSystemChips">
            {(viewChildren.sistemas||[]).map(s=><span key={s.id}>{labelSistema(s.sistema)}</span>)}
          </div>
        </section>

        {(viewChildren.checklist||[]).length>0&&<section className="osSection">
          <h3>Checklist técnico</h3>
          <div className="viewChecklist">
            {(viewChildren.checklist||[]).map(i=><div key={i.id}>
              <span>{i.item}</span>
              <b className={`viewCheckStatus ${i.status}`}>{i.status==='ok'?'OK':i.status==='irregular'?'Irregular':i.status==='nao_aplicavel'?'N/A':'Não verificado'}</b>
            </div>)}
          </div>
        </section>}

        {visualizacao.tipo_atendimento==='Manutenção Corretiva'&&<section className="osSection">
          <h3>Manutenção corretiva / diagnóstico</h3>
          <div className="viewTextGrid">
            <div><span>Problema relatado</span><b>{visualizacao.problema_relatado||'-'}</b></div>
            <div><span>Diagnóstico técnico</span><b>{visualizacao.diagnostico||'-'}</b></div>
            <div><span>Causa identificada</span><b>{visualizacao.causa_identificada||'-'}</b></div>
            <div><span>Serviço executado</span><b>{visualizacao.servico_executado||'-'}</b></div>
          </div>
        </section>}

        <section className="osSection">
          <h3>Materiais / peças utilizados</h3>
          {(viewChildren.materiais||[]).length===0?<div className="emptyInline">Nenhum material registrado.</div>:
          <div className="viewMaterials">
            {(viewChildren.materiais||[]).map((m,i)=><div key={m.id}>
              <span>{i+1}</span>
              <div><b>{m.descricao}</b><small>Qtd. {Number(m.quantidade||0).toLocaleString('pt-BR')} {m.unidade||'un'}</small></div>
              <strong>{money(Number(m.quantidade||0)*Number(m.preco_unitario||0))}</strong>
            </div>)}
          </div>}
        </section>

        {(viewChildren.fotos||[]).length>0&&<section className="osSection">
          <h3>Registro fotográfico</h3>
          <div className="photoGrid">
            {(viewChildren.fotos||[]).map(f=><div className="photoCard" key={f.id}>
              <img src={f.preview_url||f.preview_data} alt={f.tipo}/>
              <span>{f.tipo}</span>
            </div>)}
          </div>
        </section>}

        <section className="osSection">
          <h3>Pendências / recomendações</h3>
          <div className="viewTextGrid">
            <div><span>Pendências</span><b>{visualizacao.pendencias||'-'}</b></div>
            <div><span>Recomendações</span><b>{visualizacao.recomendacoes||'-'}</b></div>
            <div><span>Necessita orçamento</span><b>{visualizacao.necessita_orcamento?'Sim':'Não'}</b></div>
            <div><span>Condição final</span><b>{visualizacao.condicao_final||'-'}</b></div>
          </div>
        </section>

        {(viewChildren.assinaturas||[]).length>0&&<section className="osSection">
          <h3>Assinaturas</h3>
          <div className="viewSignatures">
            {(viewChildren.assinaturas||[]).map(a=><div key={a.id}>
              <b>{a.tipo==='cliente'?'Responsável pelo cliente':'Técnico responsável'}</b>
              {a.assinatura_data&&<img src={a.assinatura_data} alt={`Assinatura ${a.tipo}`}/>}
              <span>{a.nome||'-'} {a.cargo?`• ${a.cargo}`:''}</span>
            </div>)}
          </div>
        </section>}

        <div className="osViewActions">
          <button className="ghost" onClick={()=>gerarPDF(visualizacao)}><FileDown size={16}/> Gerar PDF</button>
          {visualizacao.necessita_orcamento&&<button className="ghost" onClick={()=>{
            const item=visualizacao
            setVisualizacao(null)
            window.dispatchEvent(new CustomEvent('fortal:go-orcamento',{detail:item}))
          }}>Orçamento</button>}
          <button className="primary" onClick={()=>{
            const item=visualizacao
            setVisualizacao(null)
            editar(item)
          }}><Pencil size={16}/> Editar OS</button>
        </div>
      </div>
    </div>}

    {modal&&<div className="modalBackdrop">
      <div className="modal osModal" ref={modalRef}>
        <div className="modalHead">
          <div><span className="eyebrow">FORTAL TECH</span><h2>{edit?edit.numero:'Nova Ordem de Serviço'}</h2></div>
          <button className="iconBtn" onClick={()=>setModal(false)}><X/></button>
        </div>
        {draftRecovered&&<div className="draftRecoveredBanner">
          <div>
            <b>Rascunho recuperado</b>
            <span>Seu preenchimento foi restaurado {draftAgeLabel(draftRecovered)}.</span>
          </div>
          <button type="button" onClick={descartarRascunho}>Descartar rascunho</button>
        </div>}
        {!draftRecovered&&draftDirty&&<div className="draftSavingHint">Rascunho salvo automaticamente neste aparelho.</div>}


        {erro&&<div className="warningBox modalError">
          <b>{erro}</b>
          {pendenciasFormulario.length>0&&<div className="missingList">
            {pendenciasFormulario.map(x=><button type="button" key={x.id} onClick={()=>irParaCampoObrigatorio(x.id)}>{x.label}</button>)}
          </div>}
        </div>}

        <form onSubmit={salvar}>
          <div className="osSection">
            <h3>1. Dados do atendimento</h3>
            <div className="formGrid">
              <div data-field="cliente" className={`field span2 ${pendenciasFormulario.some(x=>x.id==='cliente')?'invalidField':''}`}><label>Cliente *</label>
                <select value={form.cliente_id} onChange={e=>setForm({...form,cliente_id:e.target.value})}>
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
              <div data-field="data_visita" className={`field ${pendenciasFormulario.some(x=>x.id==='data_visita')?'invalidField':''}`}><label>Data da visita *</label><input type="date" value={form.data_visita||''} onChange={e=>setForm({...form,data_visita:e.target.value})}/></div>
              <div className="field"><label>Status</label>
                <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                  <option value="aberta">Aberta</option><option value="agendada">Agendada</option><option value="em_atendimento">Em atendimento</option><option value="aguardando_material">Aguardando material</option><option value="aguardando_orcamento">Aguardando orçamento</option><option value="concluida">Concluída</option><option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div data-field="horario_chegada" className={`field ${pendenciasFormulario.some(x=>x.id==='horario_chegada')?'invalidField':''}`}><label>Horário de chegada *</label><input type="time" value={form.horario_chegada||''} onChange={e=>setForm({...form,horario_chegada:e.target.value})}/></div>
              <div className="field"><label>Horário de término</label><input type="time" value={form.horario_termino||''} onChange={e=>setForm({...form,horario_termino:e.target.value})}/></div>
              {profile.perfil==='admin'&&<div className="field span2"><label>Técnico responsável</label>
                <select value={form.tecnico_id||''} onChange={e=>setForm({...form,tecnico_id:e.target.value})}>
                  {tecnicos.map(t=><option key={t.id} value={t.id}>{t.nome||'Usuário'} — {t.perfil}</option>)}
                </select>
              </div>}
              <div className="field span2"><label>Solicitação / motivo do atendimento</label><textarea rows="4" value={form.motivo||''} onChange={e=>setForm({...form,motivo:e.target.value})}/></div>
            </div>
          </div>

          <div data-field="sistemas" className={`osSection ${pendenciasFormulario.some(x=>x.id==='sistemas')?'invalidSection':''}`}>
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

          {form.tipo_atendimento==='Manutenção Corretiva'&&<div className="osSection">
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
          </div>}

          <div className="osSection">
            <div className="sectionHead"><h3>{form.tipo_atendimento==='Manutenção Corretiva'?'4':'3'}. Materiais / peças utilizados</h3><button type="button" className="ghost" onClick={addMaterial}><PackagePlus size={16}/> Adicionar material</button></div>
            {materiais.length===0?<div className="emptyInline">Nenhum material informado.</div>:
              <>
                <div className="materialHeader">
                  <span>#</span><span>Nome do item</span><span>Qtd.</span><span>Un.</span><span>Preço</span><span>Subtotal</span><span></span>
                </div>
                {materiais.map((m,i)=><div className="materialRow priced" key={m.id}>
                  <span>{i+1}</span>
                  <input placeholder="Nome / descrição do item" value={m.descricao} onChange={e=>updateMaterial(m.id,'descricao',e.target.value)}/>
                  <input type="number" min="0" step="0.01" value={m.quantidade} onChange={e=>updateMaterial(m.id,'quantidade',e.target.value)}/>
                  <input placeholder="un" value={m.unidade||'un'} onChange={e=>updateMaterial(m.id,'unidade',e.target.value)}/>
                  <input type="number" min="0" step="0.01" placeholder="0,00" value={m.preco_unitario??0} onChange={e=>updateMaterial(m.id,'preco_unitario',e.target.value)}/>
                  <strong>{money(Number(m.quantidade||0)*Number(m.preco_unitario||0))}</strong>
                  <button type="button" className="iconBtn danger" onClick={()=>setMateriais(x=>x.filter(y=>y.id!==m.id))}><Trash2 size={16}/></button>
                </div>)}
                <div className={`materialTotal ${form.prioridade==='emergencial'?'emergency':''}`}>
                  <span>{form.prioridade==='emergencial'?'Total de materiais - OS Emergencial':'Total dos materiais'}</span>
                  <strong>{money(totalMateriais)}</strong>
                </div>
              </>}
          </div>


          <div className="osSection">
            <h3>{form.tipo_atendimento==='Manutenção Corretiva'?'5':'4'}. Registro fotográfico</h3>
            <p className="sectionHelp">Adicione fotos antes, durante e depois do serviço. No celular você pode usar a câmera ou a galeria.</p>
            <div className="photoTypeGrid">
              {[
                ['antes','Antes do serviço'],
                ['durante','Durante o serviço'],
                ['depois','Depois do serviço'],
                ['irregularidade','Irregularidade']
              ].map(([tipo,label])=><label className="photoAdd" key={tipo}>
                <Camera size={17}/><span>{label}</span>
                <input type="file" accept="image/*" capture="environment" multiple onChange={e=>adicionarFotos(tipo,e.target.files)}/>
              </label>)}
            </div>
            {fotos.length>0&&<div className="photoGrid">
              {fotos.map(f=><div className="photoCard" key={f.id}>
                <img src={f.preview_url||f.preview_data} alt={f.tipo}/>
                <span>{f.tipo}</span>
                <button type="button" onClick={()=>excluirFoto(f)}><Trash size={14}/></button>
              </div>)}
            </div>}
          </div>

          <div className="osSection">
            <h3>{form.tipo_atendimento==='Manutenção Corretiva'?'6':'5'}. Aceite e assinaturas</h3>
            <div className="formGrid">
              <div data-field="nome_aceite" className={`field ${pendenciasFormulario.some(x=>x.id==='nome_aceite')?'invalidField':''}`}><label>Responsável pelo cliente</label><input value={nomeAceiteCliente} onChange={e=>setNomeAceiteCliente(e.target.value)}/></div>
              <div className="field"><label>Cargo / Função</label><input value={cargoAceiteCliente} onChange={e=>setCargoAceiteCliente(e.target.value)}/></div>
            </div>
            <div className="signatureGrid">
              <div data-field="assinatura_cliente"><SignaturePad invalid={pendenciasFormulario.some(x=>x.id==='assinatura_cliente')} label="Assinatura do cliente" value={assinaturaCliente} onChange={setAssinaturaCliente}/></div>
              <div data-field="assinatura_tecnico"><SignaturePad invalid={pendenciasFormulario.some(x=>x.id==='assinatura_tecnico')} label="Assinatura do técnico" value={assinaturaTecnico} onChange={setAssinaturaTecnico}/></div>
            </div>
          </div>

          <div className="osSection">
            <h3>{form.tipo_atendimento==='Manutenção Corretiva'?'7':'6'}. Pendências / recomendações</h3>
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
            <h3>{form.tipo_atendimento==='Manutenção Corretiva'?'8':'7'}. Condição final do sistema</h3>
            <div className="formGrid">
              <div data-field="condicao_final" className={`field span2 ${pendenciasFormulario.some(x=>x.id==='condicao_final')?'invalidField':''}`}><label>Condição final</label>
                <select value={form.condicao_final||''} onChange={e=>setForm({...form,condicao_final:e.target.value})}>
                  <option value="">Selecione...</option><option>Sistema funcionando normalmente</option><option>Sistema funcionando parcialmente</option><option>Equipamento permanece com falha</option><option>Necessário substituição de equipamento</option><option>Necessário novo atendimento</option><option>Aguardando aprovação de orçamento</option>
                </select>
              </div>
              <div className="field span2"><label>Observações finais</label><textarea rows="4" value={form.observacoes_finais||''} onChange={e=>setForm({...form,observacoes_finais:e.target.value})}/></div>
            </div>
          </div>

          <div className="osSaveBar">
            <div className="saveHint"><CheckCircle2 size={17}/> Fotos e assinaturas ficam vinculadas ao histórico desta OS.</div>
            <div className="modalActions compact">
              {edit&&form.status!=='concluida'&&<button type="button" className="finalizeBtn" disabled={salvandoOS} onClick={finalizarOSAtual}><Flag size={16}/> {salvandoOS?'Finalizando...':'Finalizar OS'}</button>}
              <button type="button" className="ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="primary" disabled={salvandoOS}>{salvandoOS?<><RefreshCcw className="spin" size={17}/> Salvando...</>:<><Save size={17}/> Salvar OS</>}</button>
            </div>
          </div>
        </form>
      </div>
    </div>}
  </>
}
