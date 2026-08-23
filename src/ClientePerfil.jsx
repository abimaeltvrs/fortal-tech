import React,{useEffect,useState} from 'react'
import {X,MapPin,Phone,Mail,Building2,UserRound,FileText,History} from 'lucide-react'
import HistoricoCliente from './HistoricoCliente'

export default function ClientePerfil({cliente,onClose,supabase}){
  const [historico,setHistorico]=useState(false)

  function rota(){
    let destino=''
    if(cliente.latitude&&cliente.longitude)destino=`${cliente.latitude},${cliente.longitude}`
    else destino=[cliente.endereco,cliente.numero,cliente.complemento,cliente.bairro,cliente.cidade,cliente.uf,cliente.cep].filter(Boolean).join(', ')
    if(!destino)return alert('Cliente sem endereço cadastrado.')
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`,'_blank')
  }

  return <>
    <div className="modalBackdrop">
      <div className="modal clientProfileModal">
        <div className="modalHead">
          <div><span className="eyebrow">PERFIL DO CLIENTE</span><h2>{cliente.nome}</h2></div>
          <button className="iconBtn" onClick={onClose}><X/></button>
        </div>

        <div className="clientProfileGrid">
          <div className="profileCard"><Building2/><span>CPF / CNPJ</span><b>{cliente.documento||'Não informado'}</b></div>
          <div className="profileCard"><Phone/><span>Telefone</span><b>{cliente.telefone||'Não informado'}</b></div>
          <div className="profileCard"><Mail/><span>E-mail</span><b>{cliente.email||'Não informado'}</b></div>
          <div className="profileCard"><UserRound/><span>Responsável</span><b>{cliente.responsavel||'Não informado'}</b><small>{cliente.cargo_responsavel||''}</small></div>
        </div>

        <section className="osSection">
          <h3>Endereço</h3>
          <div className="clientAddress">
            <span>{[cliente.endereco,cliente.numero,cliente.complemento,cliente.bairro,cliente.cidade,cliente.uf,cliente.cep].filter(Boolean).join(', ')||'Não informado'}</span>
            <button className="ghost" onClick={rota}><MapPin size={16}/> Abrir rota</button>
          </div>
        </section>

        <section className="osSection">
          <h3>Observações cadastradas</h3>
          <div className="clientNotes">{cliente.observacoes||'Nenhuma observação cadastrada.'}</div>
        </section>

        <div className="profileActions">
          <button className="primary" onClick={()=>setHistorico(true)}><History size={17}/> Ver histórico completo</button>
        </div>
      </div>
    </div>

    {historico&&<HistoricoCliente supabase={supabase} cliente={cliente} onClose={()=>setHistorico(false)}/>}
  </>
}
