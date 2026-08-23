import React,{useEffect,useRef,useState} from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export default function PdfPagePreview({url,page,label,onOpen}){
  const canvasRef=useRef(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  useEffect(()=>{
    let cancelled=false
    let doc=null
    async function render(){
      setLoading(true);setError('')
      try{
        doc=await pdfjsLib.getDocument({url}).promise
        const safePage=Math.min(Math.max(1,Number(page)||1),doc.numPages)
        const pdfPage=await doc.getPage(safePage)
        const baseViewport=pdfPage.getViewport({scale:1})
        const targetWidth=Math.min(720,Math.max(280,canvasRef.current?.parentElement?.clientWidth||360))
        const scale=targetWidth/baseViewport.width
        const viewport=pdfPage.getViewport({scale})
        const canvas=canvasRef.current
        if(!canvas||cancelled)return
        const ratio=Math.min(window.devicePixelRatio||1,2)
        canvas.width=Math.floor(viewport.width*ratio)
        canvas.height=Math.floor(viewport.height*ratio)
        canvas.style.width=`${viewport.width}px`
        canvas.style.height=`${viewport.height}px`
        const ctx=canvas.getContext('2d')
        await pdfPage.render({
          canvasContext:ctx,
          viewport,
          transform:ratio!==1?[ratio,0,0,ratio,0,0]:null
        }).promise
      }catch(e){
        if(!cancelled)setError(e.message||'Não foi possível gerar a prévia.')
      }finally{
        if(!cancelled)setLoading(false)
      }
    }
    render()
    return()=>{
      cancelled=true
      try{doc?.destroy?.()}catch{}
    }
  },[url,page])

  return <div className="pdfVisualPreview">
    <div className="pdfVisualHead">
      <div><b>Referência visual do manual</b><span>Página {page}{label?` • ${label}`:''}</span></div>
      <button type="button" onClick={onOpen}>Abrir página</button>
    </div>
    <div className="pdfCanvasWrap">
      {loading&&<div className="pdfPreviewState">Carregando página...</div>}
      {error&&<div className="pdfPreviewState error">{error}</div>}
      <canvas ref={canvasRef} className={loading||error?'hiddenCanvas':''}/>
    </div>
    <small>Imagem extraída da página real do PDF cadastrado.</small>
  </div>
}
