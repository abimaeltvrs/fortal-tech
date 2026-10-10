// Identidade visual unificada para PDFs FORTAL TECH.
import logo from '../public/icon-512.png'
export const PDF_COLORS={dark:[15,18,22],gold:[220,174,50],light:[249,248,244],ink:[34,37,42]}
export function pdfHeader(doc,title){
  const w=doc.internal.pageSize.getWidth()
  doc.setFillColor(...PDF_COLORS.dark);doc.rect(0,0,w,34,'F')
  doc.setFillColor(...PDF_COLORS.gold);doc.rect(0,33,w,1.2,'F')
  try{doc.addImage(logo,'PNG',14,4.5,24,24)}catch(e){/* Fallback tipográfico */}
  doc.setTextColor(...PDF_COLORS.gold);doc.setFont('helvetica','bold');doc.setFontSize(17)
  doc.text('FORTAL TECH',43,14)
  doc.setTextColor(255,255,255);doc.setFont('helvetica','normal');doc.setFontSize(9.5)
  doc.text(doc.splitTextToSize(title,150),43,21)
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
