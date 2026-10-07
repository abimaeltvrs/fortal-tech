export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Método não permitido.'})
  const apiKey=process.env.RESEND_API_KEY,from=process.env.OS_EMAIL_FROM
  if(!apiKey||!from)return res.status(503).json({error:'Envio automático ainda não configurado. Configure RESEND_API_KEY e OS_EMAIL_FROM na Vercel.'})
  const {to,cliente,numero,data,tipo,status,pdfBase64,filename}=req.body||{}
  if(!to||!numero||!pdfBase64)return res.status(400).json({error:'Dados do envio incompletos.'})
  if(String(pdfBase64).length>12000000)return res.status(413).json({error:'O PDF ficou grande demais. Use Compartilhar.'})
  const safe=(v='')=>String(v).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]))
  try{
    const rr=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],subject:`Ordem de Serviço ${numero} - FORTAL TECH`,html:`<div style="font-family:Arial,sans-serif;color:#20242a;line-height:1.6"><h2>FORTAL TECH</h2><p>Olá, ${safe(cliente||'Cliente')}.</p><p>Segue em anexo a Ordem de Serviço referente ao atendimento realizado.</p><p><strong>OS:</strong> ${safe(numero)}<br><strong>Data:</strong> ${safe(data||'-')}<br><strong>Tipo:</strong> ${safe(tipo||'-')}<br><strong>Status:</strong> ${safe(status||'-')}</p><p>O documento completo segue anexado em PDF.</p><p>Atenciosamente,<br><strong>FORTAL TECH</strong></p></div>`,attachments:[{filename:filename||`${numero}.pdf`,content:pdfBase64}]})})
    const out=await rr.json().catch(()=>({}));if(!rr.ok)return res.status(rr.status).json({error:out?.message||'O serviço de e-mail recusou o envio.'});return res.status(200).json({ok:true,id:out.id})
  }catch(e){return res.status(500).json({error:e.message||'Falha ao enviar e-mail.'})}
}
