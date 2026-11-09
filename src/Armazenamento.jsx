import React,{useEffect,useState} from 'react'
import JSZip from 'jszip'
import {HardDrive,RefreshCw,Download,Trash2,AlertTriangle,ShieldCheck,Upload} from 'lucide-react'

const MB=1048576
const formatMB=n=>(Number(n||0)/MB).toLocaleString('pt-BR',{maximumFractionDigits:2})+' MB'
const buckets=['os-arquivos']
const tables=['clientes','ordens_servico','os_sistemas','os_checklist','os_materiais','os_fotos','os_assinaturas','orcamentos','orcamento_itens','orcamento_reparos']
const MAX_ZIP=300*1024*1024

function saveFile(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}

export default function Armazenamento({supabase,profile}){
 const [stats,setStats]=useState([]),[db,setDb]=useState(null),[candidates,setCandidates]=useState([])
 const [busy,setBusy]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[backupReady,setBackupReady]=useState(false),[confirm,setConfirm]=useState('')
 const [restoreFile,setRestoreFile]=useState(null),[restorePreview,setRestorePreview]=useState(null),[restoreConfirm,setRestoreConfirm]=useState('')
 const admin=profile?.perfil==='admin'
 async function rpc(name){const {data,error}=await supabase.rpc(name);if(error)throw new Error(error.message);return data}
 async function refresh(){if(!admin)return;setBusy('consultando');setError('');setMessage('');setBackupReady(false);setCandidates([]);try{const result=await rpc('fortal_storage_overview');setStats(result?.buckets||[]);setDb(result?.database||null)}catch(e){setError('Não foi possível consultar: '+e.message+'. Execute o SQL V1.16.4.') }finally{setBusy('')}}
 useEffect(()=>{if(admin)refresh()},[admin])
 async function backup(){setBusy('backup');setError('');setMessage('');setBackupReady(false);try{
  const inventory=await rpc('fortal_storage_inventory');if(!Array.isArray(inventory))throw new Error('Inventário indisponível')
  const {data:records,error:exportError}=await supabase.rpc('fortal_operational_export');if(exportError)throw new Error(exportError.message)
  if(!records||!records.tables)throw new Error('Exportação operacional indisponível. Execute o SQL V1.16.5.')
  const zip=new JSZip(),manifest={app:'FORTAL TECH',version:'1.16.5',generated_at:new Date().toISOString(),type:'operational-backup',tables:tables.map(name=>({name,count:(records.tables[name]||[]).length})),files:inventory.filter(f=>f.bucket==='os-arquivos').map(({bucket,path,size})=>({bucket,path,size}))}
  zip.file('operacional.json',JSON.stringify(records))
  let downloaded=0
  for(const f of manifest.files){
   if(!buckets.includes(f.bucket))throw new Error('Bucket inesperado')
   const {data,error}=await supabase.storage.from(f.bucket).download(f.path);if(error||!data)throw new Error('Falha ao baixar '+f.path+': '+(error?.message||'arquivo indisponível'))
   zip.file('storage/'+f.bucket+'/'+f.path,data);downloaded++
   setMessage(`Preparando backup: ${downloaded}/${manifest.files.length} arquivos`)
  }
  zip.file('manifest.json',JSON.stringify(manifest,null,2))
  const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:4}})
  saveFile(blob,'FORTAL_TECH_BACKUP_OPERACIONAL_'+new Date().toISOString().slice(0,10)+'.zip')
  setBackupReady(true);setMessage('Backup operacional preparado. Verifique o ZIP antes de utilizá-lo ou executar limpeza.')
 }catch(e){setError('Backup interrompido. Nenhum arquivo foi excluído. '+e.message)}finally{setBusy('')}}
 async function chooseRestore(file){setRestoreFile(null);setRestorePreview(null);setRestoreConfirm('');setError('');if(!file)return;try{
  if(file.size>MAX_ZIP)throw new Error('ZIP acima de 300 MB. Use restauração assistida para arquivos grandes.')
  const zip=await JSZip.loadAsync(file)
  const mFile=zip.file('manifest.json'),rFile=zip.file('operacional.json')
  if(!mFile||!rFile)throw new Error('Arquivo incompatível: exige backup operacional V1.16.5.')
  const manifest=JSON.parse(await mFile.async('string')),records=JSON.parse(await rFile.async('string'))
  if(manifest.app!=='FORTAL TECH'||manifest.type!=='operational-backup'||!records.tables)throw new Error('Manifesto inválido')
  if(Object.keys(records.tables).some(t=>!tables.includes(t)))throw new Error('Backup contém tabelas não permitidas')
  for(const t of tables)if(records.tables[t]&&!Array.isArray(records.tables[t]))throw new Error('Tabela inválida: '+t)
  const paths=manifest.files||[]
  if(paths.some(f=>f.bucket!=='os-arquivos'||!f.path||f.path.includes('..')||f.path.startsWith('/')))throw new Error('Caminhos de arquivos inválidos')
  for(const f of paths)if(!zip.file('storage/'+f.bucket+'/'+f.path))throw new Error('Arquivo ausente: '+f.path)
  setRestorePreview({manifest,records,zip});setRestoreFile(file)
 }catch(e){setError('Não foi possível validar o backup: '+e.message)}}
 async function restore(){if(!restorePreview||restoreConfirm!=='RESTAURAR')return;setBusy('restaurando');setError('');setMessage('');try{
  const {manifest,records,zip}=restorePreview
  // Insere dados sem sobrescrever registros existentes, dentro de uma transação SQL.
  const {data:result,error:restoreError}=await supabase.rpc('fortal_operational_restore',{payload:records})
  if(restoreError)throw new Error('Falha na restauração dos registros: '+restoreError.message)
  let uploaded=0,skipped=0
  for(const f of manifest.files){
   const {data:exists,error:existsError}=await supabase.storage.from(f.bucket).list(f.path.includes('/')?f.path.substring(0,f.path.lastIndexOf('/')):'',{search:f.path.split('/').pop(),limit:100})
   if(existsError)throw new Error('Falha ao conferir '+f.path+': '+existsError.message)
   if((exists||[]).some(x=>x.name===f.path.split('/').pop())){skipped++;continue}
   const blob=await zip.file('storage/'+f.bucket+'/'+f.path).async('blob')
   const {error}=await supabase.storage.from(f.bucket).upload(f.path,blob,{upsert:false,contentType:'application/octet-stream'})
   if(error)throw new Error('Registros restaurados, mas falhou o arquivo '+f.path+': '+error.message)
   uploaded++;setMessage(`Restaurando fotos: ${uploaded+skipped}/${manifest.files.length}`)
  }
  setMessage(`Restauração concluída. Registros existentes preservados. ${uploaded} foto(s) recuperada(s), ${skipped} já existente(s). Detalhes dos registros: ${JSON.stringify(result)}. Atualize o aplicativo.`)
  setRestorePreview(null);setRestoreFile(null);setRestoreConfirm('')
 }catch(e){setError('Restauração interrompida: '+e.message+'; verifique os dados antes de tentar novamente.')}finally{setBusy('')}}
 async function scan(){setBusy('analisando');setError('');setMessage('');setCandidates([]);try{const data=await rpc('fortal_storage_orphans');setCandidates(data||[]);setMessage((data||[]).length?'Revise os candidatos antes de excluir.':'Nenhum arquivo órfão identificado.')}catch(e){setError(e.message)}finally{setBusy('')}}
 async function cleanup(){if(confirm!=='EXCLUIR'||!backupReady||!candidates.length||!alert80)return;setBusy('limpando');setError('');try{
  const latest=await rpc('fortal_storage_orphans'),allowed=new Set((latest||[]).map(x=>x.bucket+'|'+x.path))
  const chosen=candidates.filter(x=>allowed.has(x.bucket+'|'+x.path))
  if(chosen.length!==candidates.length)throw new Error('Inventário mudou. Analise novamente antes de limpar.')
  let deleted=0
  for(const f of chosen){const {error}=await supabase.storage.from(f.bucket).remove([f.path]);if(error)throw new Error('Falha ao excluir '+f.path+': '+error.message);deleted++}
  setCandidates([]);setBackupReady(false);setConfirm('');setMessage(`${deleted} arquivo(s) órfão(s) removido(s).`)
  const result=await rpc('fortal_storage_overview');setStats(result?.buckets||[]);setDb(result?.database||null)
 }catch(e){setError('Limpeza interrompida: '+e.message+' (arquivos já excluídos não são restaurados automaticamente).')}finally{setBusy('')}}
 if(!admin)return <section className="panel"><h2>Acesso restrito</h2><p>Somente administradores podem consultar e gerenciar o armazenamento.</p></section>
 const used=stats.reduce((a,x)=>a+Number(x.bytes||0),0),percent=used/(1024*MB)*100,dbPercent=Number(db?.bytes||0)/(500*MB)*100,alert80=dbPercent>=80
 return <div className="storageAdmin">
  <div className="toolbar"><div><h2>Configurações · Armazenamento</h2><p>Monitore o Supabase e faça backups antes de qualquer limpeza.</p></div><button className="ghost" disabled={!!busy} onClick={refresh}><RefreshCw size={17}/> Atualizar</button></div>
  <div className="cards"><div className="card"><div className="cardIcon"><HardDrive size={22}/></div><div><span>Storage (referência Free: 1 GB)</span><strong>{formatMB(used)}</strong><small>{percent.toFixed(2).replace('.',',')}% da referência</small></div></div><div className="card"><div className="cardIcon"><HardDrive size={22}/></div><div><span>Banco PostgreSQL</span><strong>{db?.bytes!=null?formatMB(db.bytes):'—'}</strong><small>{dbPercent.toFixed(2).replace('.',',')}% de 500 MB (referência Free)</small></div></div></div>
  <section className="panel"><h3>Arquivos por categoria</h3>{stats.map(b=><div className="storageBucket" key={b.bucket}><b>{b.bucket}</b><span>{b.count} arquivo(s) · {formatMB(b.bytes)}</span></div>)}<div className="storageBar"><div style={{width:Math.min(100,percent)+'%'}}/></div><p className="muted">Alertas somente a partir de 80% do banco de dados (400 MB de 500 MB). {alert80?'ALERTA: banco acima de 80%. Faça o backup antes de avaliar limpeza.':'Sem alerta de capacidade no momento.'}</p><p className="muted">Os valores são estimativas baseadas nos metadados. A cota real e o tráfego mensal devem ser conferidos no painel Usage do Supabase.</p></section>
  <section className="panel"><h3><ShieldCheck size={18}/> Backup operacional</h3><p>Clientes, OS, checklists, materiais, histórico vinculado, orçamentos, reparos, fotos e assinaturas registradas no banco. Inclui os arquivos do bucket de OS. Não inclui contas de autenticação, financeiro nem manuais.</p>{alert80?<div className="storageWarning"><AlertTriangle size={18}/> Banco acima de 80%: recomenda-se gerar e conferir o backup.</div>:<p className="muted">Banco abaixo de 80%: nenhum alerta ou backup obrigatório. O download manual permanece disponível para emergências.</p>}<button className="primary" disabled={!!busy} onClick={backup}><Download size={17}/> {busy==='backup'?'Preparando ZIP...':'Baixar backup operacional'}</button><p className="muted">Guarde o ZIP em local seguro: contém dados pessoais e documentos de clientes. Confirme o download e abra o arquivo antes de limpar.</p></section>
  <section className="panel"><h3><Upload size={18}/> Restaurar backup operacional</h3><p>Selecione um ZIP operacional gerado nesta versão. A restauração é exclusiva para administradores, preserva registros existentes e não sobrescreve fotos. Os dados são verificados antes de confirmar.</p><input type="file" accept=".zip,application/zip" disabled={!!busy} onChange={e=>chooseRestore(e.target.files?.[0])}/>{restorePreview&&<><p><b>Backup válido:</b> {new Date(restorePreview.manifest.generated_at).toLocaleString('pt-BR')}</p><div className="storageCandidates">{restorePreview.manifest.tables.map(t=><div key={t.name}>{t.name}: {t.count} registro(s)</div>)}<div>Fotos de OS: {restorePreview.manifest.files.length}</div></div><p className="muted">Registros já existentes serão ignorados. A restauração dos dados é transacional, mas o envio das fotos é separado; se falhar, repita o processo. Não recupera usuários excluídos do Supabase Auth.</p><label>Para confirmar, digite RESTAURAR</label><input value={restoreConfirm} onChange={e=>setRestoreConfirm(e.target.value)} placeholder="RESTAURAR"/><button className="primary" disabled={!!busy||restoreConfirm!=='RESTAURAR'} onClick={restore}>Restaurar dados e fotos</button></>}</section>
  <section className="panel"><h3><Trash2 size={18}/> Limpeza segura</h3><p>Apenas arquivos órfãos (sem referência na tabela de fotos de OS ou de manuais). Fotos de OS e manuais em uso são preservados. Nenhuma exclusão é automática.</p><button className="ghost" disabled={!!busy||!alert80} onClick={scan}>Analisar arquivos órfãos</button>{!alert80&&<p className="muted">Limpeza desabilitada enquanto o banco estiver abaixo de 80%.</p>}{candidates.length>0&&<><p><b>{candidates.length} candidato(s) encontrado(s)</b> · {formatMB(candidates.reduce((a,f)=>a+Number(f.size||0),0))}</p><div className="storageCandidates">{candidates.map(f=><div key={f.bucket+'|'+f.path}>{f.bucket}/{f.path} · {formatMB(f.size)}</div>)}</div><div className="storageWarning"><AlertTriangle size={18}/> Antes de excluir, baixe e verifique o backup. A remoção não tem desfazer.</div><label>Para confirmar, digite EXCLUIR</label><input value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="EXCLUIR"/><button className="danger" disabled={!!busy||!backupReady||confirm!=='EXCLUIR'} onClick={cleanup}>Excluir {candidates.length} arquivo(s) órfão(s)</button>{!backupReady&&<p className="muted">Faça o backup nesta sessão para habilitar a limpeza.</p>}</>}</section>
  {busy&&<p role="status">{busy==='consultando'?'Consultando armazenamento...':busy==='analisando'?'Analisando referências...':busy==='limpando'?'Excluindo arquivos...':busy==='restaurando'?'Restaurando backup...':'Preparando backup...'}</p>}
  {message&&<p role="status">{message}</p>}{error&&<div className="errorBox" role="alert">{error}</div>}
  <section className="panel"><h3>Proteção dos dados</h3><p>Este backup operacional não substitui um backup completo do PostgreSQL e do Supabase Auth. Guarde uma cópia fora do Supabase. A restauração não apaga dados existentes; novos registros são inseridos com seus identificadores originais, mantendo os vínculos entre clientes, OS e orçamentos.</p></section>
 </div>
}
