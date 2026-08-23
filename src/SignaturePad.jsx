import React,{useEffect,useRef,useState} from 'react'
import {Eraser} from 'lucide-react'

export default function SignaturePad({value,onChange,label='Assinatura'}){
  const canvasRef=useRef(null)
  const drawing=useRef(false)
  const [hasInk,setHasInk]=useState(!!value)

  useEffect(()=>{
    const canvas=canvasRef.current
    const ctx=canvas.getContext('2d')
    const resize=()=>{
      const ratio=window.devicePixelRatio||1
      const rect=canvas.getBoundingClientRect()
      canvas.width=Math.max(1,Math.floor(rect.width*ratio))
      canvas.height=Math.max(1,Math.floor(rect.height*ratio))
      ctx.setTransform(ratio,0,0,ratio,0,0)
      ctx.lineWidth=2
      ctx.lineCap='round'
      ctx.strokeStyle='#e5edf6'
      if(value){
        const img=new Image()
        img.onload=()=>{
          ctx.clearRect(0,0,rect.width,rect.height)
          ctx.drawImage(img,0,0,rect.width,rect.height)
        }
        img.src=value
      }
    }
    resize()
    window.addEventListener('resize',resize)
    return()=>window.removeEventListener('resize',resize)
  },[])

  function pos(e){
    const c=canvasRef.current
    const r=c.getBoundingClientRect()
    const p=e.touches?.[0]||e
    return {x:p.clientX-r.left,y:p.clientY-r.top}
  }
  function start(e){
    e.preventDefault()
    drawing.current=true
    const {x,y}=pos(e)
    const ctx=canvasRef.current.getContext('2d')
    ctx.beginPath();ctx.moveTo(x,y)
  }
  function move(e){
    if(!drawing.current)return
    e.preventDefault()
    const {x,y}=pos(e)
    const ctx=canvasRef.current.getContext('2d')
    ctx.lineTo(x,y);ctx.stroke()
    setHasInk(true)
  }
  function end(){
    if(!drawing.current)return
    drawing.current=false
    const data=canvasRef.current.toDataURL('image/png')
    onChange?.(data)
  }
  function clear(){
    const c=canvasRef.current
    c.getContext('2d').clearRect(0,0,c.width,c.height)
    setHasInk(false)
    onChange?.('')
  }

  return <div className="signatureWrap">
    <div className="signatureHead"><b>{label}</b><button type="button" onClick={clear}><Eraser size={14}/> Limpar</button></div>
    <canvas
      ref={canvasRef}
      className="signatureCanvas"
      onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
      onTouchStart={start} onTouchMove={move} onTouchEnd={end}
    />
    <span>{hasInk?'Assinatura registrada':'Assine usando o dedo ou mouse'}</span>
  </div>
}
