import React,{useEffect,useMemo,useState} from 'react'
import {Users,Search,ShieldCheck,Wrench,UserCheck,UserX,RefreshCcw,Save} from 'lucide-react'

const roleLabel={admin:'Administrador',tecnico:'Técnico'}
const statusLabel={ativo:'Ativo',inativo:'Inativo'}

export default function Usuarios({supabase,session,profile}){
  const [lista,setLista]=useState([])
  const [busca,setBusca]=useState('')
  const [erro,setErro]=useState('')
  const [sucesso,setSucesso]=useState('')
  const [loading,setLoading]=useState(false)
  const [salvando,setSalvando]=useState(null)

  async function carregar(){
    setLoading(true);setErro('')
    const {data,error}=await supabase
      .from('profiles')
      .select('*')
      .order('nome',{ascending:true})
    if(error)setErro(error.message)
    else setLista(data||[])
    setLoading(false)
  }

  useEffect(()=>{carregar()},[])

  async function atualizarUsuario(u,patch){
    setErro('');setSucesso('');setSalvando(u.id)
    try{
      if(u.id===session.user.id && patch.status==='inativo'){
        throw new Error('Você não pode desativar o próprio usuário enquanto estiver conectado.')
      }
      if(u.id===session.user.id && patch.perfil==='tecnico'){
        throw new Error('Para evitar perder o acesso administrativo, altere outro administrador primeiro.')
      }

      const {data,error}=await supabase
        .from('profiles')
        .update({...patch,updated_at:new Date().toISOString()})
        .eq('id',u.id)
        .select()
        .single()

      if(error)throw error
      setLista(x=>x.map(i=>i.id===u.id?data:i))
      setSucesso(`${data.nome||data.email||'Usuário'} atualizado.`)
    }catch(e){
      setErro(e.message||'Não foi possível atualizar o usuário.')
    }finally{
      setSalvando(null)
    }
  }

  const filtrados=useMemo(()=>{
    const q=busca.toLowerCase().trim()
    if(!q)return lista
    return lista.filter(x=>[
      x.nome,x.email,roleLabel[x.perfil],statusLabel[x.status]
    ].filter(Boolean).join(' ').toLowerCase().includes(q))
  },[lista,busca])

  return <>
    <div className="toolbar">
      <div><h2>Usuários</h2><p>Controle de acesso de administradores e técnicos de campo.</p></div>
      <button className="ghost" onClick={carregar}><RefreshCcw size={16} className={loading?'spin':''}/> Atualizar</button>
    </div>

    {sucesso&&<div className="successBox">{sucesso}</div>}
    {erro&&<div className="warningBox">{erro}</div>}

    <div className="userInfoBox">
      <ShieldCheck size={19}/>
      <div>
        <b>Como adicionar um novo técnico?</b>
        <span>O técnico cria a conta normalmente na tela de acesso. Depois, o Administrador entra aqui para definir o perfil como Técnico e liberar ou bloquear o acesso.</span>
      </div>
    </div>

    <section className="panel">
      <div className="searchBar">
        <Search size={18}/>
        <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar usuário, e-mail ou perfil..." />
      </div>

      {filtrados.length===0?
        <div className="emptySmall"><Users size={36}/><b>Nenhum usuário encontrado</b></div>:
        <div className="usersList">
          {filtrados.map(u=><div className="userRow" key={u.id}>
            <div className="userIdentity">
              <div className={`userAvatar role-${u.perfil}`}>
                {u.perfil==='admin'?<ShieldCheck size={18}/>:<Wrench size={18}/>}
              </div>
              <div>
                <b>{u.nome||'Usuário sem nome'} {u.id===session.user.id&&<small>VOCÊ</small>}</b>
                <span>{u.email||'-'}</span>
                <em>{roleLabel[u.perfil]||u.perfil} • {statusLabel[u.status||'ativo']}</em>
              </div>
            </div>

            <div className="userControls">
              <label>
                <span>Perfil</span>
                <select
                  value={u.perfil||'tecnico'}
                  disabled={salvando===u.id}
                  onChange={e=>atualizarUsuario(u,{perfil:e.target.value})}
                >
                  <option value="admin">Administrador</option>
                  <option value="tecnico">Técnico</option>
                </select>
              </label>

              <button
                className={u.status==='inativo'?'activateUser':'deactivateUser'}
                disabled={salvando===u.id}
                onClick={()=>atualizarUsuario(u,{status:u.status==='inativo'?'ativo':'inativo'})}
              >
                {u.status==='inativo'?<><UserCheck size={15}/> Ativar</>:<><UserX size={15}/> Desativar</>}
              </button>
            </div>
          </div>)}
        </div>
      }
    </section>

    <section className="panel permissionsPanel">
      <h3>Permissões por perfil</h3>
      <div className="permissionCompare">
        <div>
          <ShieldCheck/>
          <b>Administrador</b>
          <span>Dashboard completo</span>
          <span>Agenda</span>
          <span>Clientes</span>
          <span>Ordens de Serviço</span>
          <span>Orçamentos</span>
          <span>Financeiro</span>
          <span>Relatórios</span>
          <span>Usuários</span>
          <span>Configurações</span>
        </div>
        <div>
          <Wrench/>
          <b>Técnico de campo</b>
          <span>Dashboard operacional</span>
          <span>Agenda atribuída</span>
          <span>Clientes</span>
          <span>Ordens de Serviço atribuídas</span>
          <span className="blocked">Sem Financeiro</span>
          <span className="blocked">Sem Relatórios financeiros</span>
          <span className="blocked">Sem Usuários</span>
          <span className="blocked">Sem Configurações administrativas</span>
        </div>
      </div>
    </section>
  </>
}
