// Identidade visual unificada para PDFs FORTAL TECH.
import officialLogo from '../public/fortal-logo-pdf.jpg'
export const PDF_COLORS={dark:[15,18,22],gold:[220,174,50],light:[249,248,244],ink:[34,37,42]}
export function pdfHeader(doc,title){
  const w=doc.internal.pageSize.getWidth()
  doc.setFillColor(...PDF_COLORS.dark);doc.rect(0,0,w,34,'F')
  doc.setFillColor(...PDF_COLORS.gold);doc.rect(0,33,w,1.2,'F')
  // Logomarca oficial enviada pela empresa, sem substituir pelo ícone do PWA.
  try{doc.addImage(officialLogo,'JPEG',10,2.5,43,29)}catch(e){
    doc.setFont('helvetica','bold');doc.setFontSize(13);doc.setTextColor(...PDF_COLORS.gold);doc.text('FORTAL TECH',12,17)
  }
  doc.setFont('helvetica','bold');doc.setFontSize(12.5);doc.setTextColor(...PDF_COLORS.gold)
  const lines=doc.splitTextToSize(String(title||'DOCUMENTO'),w-119)
  doc.text(lines.slice(0,2),58,11)
  doc.setFont('helvetica','normal');doc.setFontSize(8.2);doc.setTextColor(255,255,255)
  doc.text('fortaltech2026@gmail.com',58,22)
  doc.text('(21) 98384-3349  |  Fortaleza',58,28)
  doc.setTextColor(...PDF_COLORS.ink)
}
export function pdfFooter(doc,reference=''){
  const pages=doc.getNumberOfPages();const w=doc.internal.pageSize.getWidth();const h=doc.internal.pageSize.getHeight()
  for(let p=1;p<=pages;p++){
    doc.setPage(p);doc.setDrawColor(...PDF_COLORS.gold);doc.setLineWidth(.35);doc.line(14,h-12,w-14,h-12)
    doc.setFont('helvetica','normal');doc.setFontSize(7.3);doc.setTextColor(100,100,100)
    doc.text('FORTAL TECH'+(reference?'  |  '+String(reference):''),14,h-8)
    doc.text(`Página ${p} de ${pages}`,w-14,h-8,{align:'right'})
  }
}
export const pdfTableTheme={
  headStyles:{fillColor:PDF_COLORS.dark,textColor:[255,255,255],fontStyle:'bold'},
  alternateRowStyles:{fillColor:PDF_COLORS.light},
  footStyles:{fillColor:PDF_COLORS.gold,textColor:PDF_COLORS.dark,fontStyle:'bold'},
  styles:{overflow:'linebreak',valign:'middle'},
  margin:{left:14,right:14,top:40,bottom:18}
}
