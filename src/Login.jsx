import React,{useState} from 'react'
import {LockKeyhole,Mail,Loader2} from 'lucide-react'
import fortalLogo from './assets/fortal-tech-logo.png'
export default function Login({supabase}){
 const [email,setEmail]=useState(''),[senha,setSenha]=useState(''),[loading,setLoading]=useState(false),[erro,setErro]=useState('')
 async function entrar(e){e.preventDefault();setErro('');setLoading(true);const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password:senha});if(error)setErro('E-mail ou senha inválidos.');setLoading(false)}
 return <div className="loginPage"><div className="loginCard"><div className="loginBrand officialLoginBrand">
  <img src={fortalLogo} alt="FORTAL TECH"/>
  <div><span>FORTAL TECH</span><h1>Gestão Técnica</h1><small>Segurança Eletrônica & Elétrica</small></div>
</div><div className="loginIntro"><h2>Acesso ao sistema</h2><p>Entre com seu usuário autorizado.</p></div><form onSubmit={entrar}><label>E-mail</label><div className="inputIcon"><Mail size={18}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div><label>Senha</label><div className="inputIcon"><LockKeyhole size={18}/><input type="password" value={senha} onChange={e=>setSenha(e.target.value)} required /></div>{erro&&<div className="errorBox">{erro}</div>}<button className="primary loginBtn" disabled={loading}>{loading?<Loader2 className="spin" size={18}/>:<LockKeyhole size={18}/>} {loading?'Entrando...':'Entrar'}</button></form><div className="loginFoot">Sistema interno • FORTAL TECH</div></div></div>
}
