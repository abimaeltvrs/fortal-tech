// Identidade visual oficial FORTAL TECH — documentos A4.
import officialLogo from '../public/fortal-logo-pdf.jpg'
export const PDF_COLORS={dark:[15,18,22],gold:[245,189,30],light:[247,247,247],ink:[31,34,38],muted:[95,101,110]}
export function pdfHeader(doc,title,{compact=false}={}){
  const w=doc.internal.pageSize.getWidth(),h=compact?31:40
  // Fundo preto puro igual ao fundo da imagem oficial: evita o efeito de logo colada.
  doc.setFillColor(0,0,0);doc.rect(0,0,w,h,'F')
  doc.setFillColor(...PDF_COLORS.gold);doc.rect(0,h-1.5,w,1.5,'F')
  // Logo oficial, preservando a proporção da arte original.
  try{doc.addImage(officialLogo,'JPEG',9,3,compact?37:46,compact?24:32)}catch(e){
    doc.setFont('helvetica','bold');doc.setFontSize(14);doc.setTextColor(...PDF_COLORS.gold);doc.text('FORTAL TECH',12,17)
  }
  const start=compact?52:60
  doc.setFont('helvetica','bold');doc.setFontSize(compact?11:12.5);doc.setTextColor(...PDF_COLORS.gold)
  const lines=doc.splitTextToSize(String(title||'DOCUMENTO'),w-start-12)
  doc.text(lines.slice(0,2),start,compact?10:13)
  doc.setFont('helvetica','normal');doc.setFontSize(8.2);doc.setTextColor(255,255,255)
  doc.text('fortaltech2026@gmail.com',start,compact?20:26)
  doc.text('(21) 98384-3349  |  Fortaleza',start,compact?26:33)
  doc.setTextColor(...PDF_COLORS.ink)
}
export function pdfFooter(doc,reference=''){
  const pages=doc.getNumberOfPages(),w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight()
  for(let p=1;p<=pages;p++){
    doc.setPage(p)
    doc.setFillColor(...PDF_COLORS.dark);doc.rect(0,h-16,w,16,'F')
    doc.setFillColor(...PDF_COLORS.gold);doc.rect(0,h-16,w,1.1,'F')
    doc.setFont('helvetica','normal');doc.setFontSize(7.2);doc.setTextColor(255,255,255)
    doc.text('FORTAL TECH  |  SEGURANÇA ELETRÔNICA & ELÉTRICA',12,h-8)
    if(reference)doc.text(String(reference),w/2,h-8,{align:'center'})
    doc.text(`Página ${p} de ${pages}`,w-12,h-8,{align:'right'})
  }
}
export const pdfTableTheme={
  headStyles:{fillColor:PDF_COLORS.dark,textColor:[255,255,255],fontStyle:'bold'},
  alternateRowStyles:{fillColor:PDF_COLORS.light},
  footStyles:{fillColor:PDF_COLORS.gold,textColor:PDF_COLORS.dark,fontStyle:'bold'},
  styles:{overflow:'linebreak',valign:'middle',lineColor:[225,225,225],lineWidth:.1},
  margin:{left:14,right:14,top:16,bottom:21}
}
