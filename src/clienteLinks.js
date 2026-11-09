export function whatsappUrl(phone){
  let digits=String(phone||'').replace(/\D/g,'')
  if(digits.startsWith('00'))digits=digits.slice(2)
  if(digits.startsWith('0') && (digits.length===11||digits.length===12))digits=digits.slice(1)
  if(!digits.startsWith('55') && (digits.length===10||digits.length===11))digits='55'+digits
  if(digits.length<12||digits.length>13)return null
  return `https://wa.me/${digits}`
}
