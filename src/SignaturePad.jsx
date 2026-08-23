import React,{useEffect,useRef,useState} from 'react'
import {Eraser} from 'lucide-react'

export default function SignaturePad({value,onChange,label='Assinatura',invalid=false}){
  const canvasRef=useRef(null)
  const drawing=useRef(false)
  const lastPoint=useRef(null)
  const [hasInk,setHasInk]=useState(!!value)

  function setupCanvas(){
    const canvas=canvasRef.current
    if(!canvas)return
    const rect=canvas.getBoundingClientRect()
    const ratio=window.devicePixelRatio||1
    const snapshot=value || (hasInk ? canvas.toDataURL('image/png') : '')
    canvas.width=Math.max(1,Math.floor(rect.width*ratio))
    canvas.height=Math.max(1,Math.floor(rect.height*ratio))
    const ctx=canvas.getContext('2d')
    ctx.setTransform(ratio,0,0,ratio,0,0)
    ctx.lineWidth=2.2
    ctx.lineCap='round'
    ctx.lineJoin='round'
    ctx.strokeStyle='#e5edf6'
    if(snapshot){
      const img=new Image()
      img.onload=()=>{
        ctx.clearRect(0,0,rect.width,rect.height)
        ctx.drawImage(img,0,0,rect.width,rect.height)
      }
      img.src=snapshot
    }
  }

  useEffect(()=>{
    setupCanvas()
    const canvas=canvasRef.current
    if(!canvas)return
    const ro=new ResizeObserver(()=>setupCanvas())
    ro.observe(canvas)
    return()=>ro.disconnect()
  },[])

  useEffect(()=>{
    if(!value){
      if(!hasInk){
        const canvas=canvasRef.current
        const rect=canvas?.getBoundingClientRect()
        if(canvas&&rect) canvas.getContext('2d').clearRect(0,0,rect.width,rect.height)
      }
      return
    }
    setHasInk(true)
    const canvas=canvasRef.current
    if(!canvas)return
    const rect=canvas.getBoundingClientRect()
    const ctx=canvas.getContext('2d')
    const img=new Image()
    img.onload=()=>{
      ctx.clearRect(0,0,rect.width,rect.height)
      ctx.drawImage(img,0,0,rect.width,rect.height)
    }
    img.src=value
  },[value])

  function point(e){
    const c=canvasRef.current
    const r=c.getBoundingClientRect()
    return {x:e.clientX-r.left,y:e.clientY-r.top}
  }

  function start(e){
    e.preventDefault()
    canvasRef.current?.setPointerCapture?.(e.pointerId)
    drawing.current=true
    lastPoint.current=point(e)
    const ctx=canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(lastPoint.current.x,lastPoint.current.y)
  }

  function move(e){
    if(!drawing.current)return
    e.preventDefault()
    const p=point(e)
    const ctx=canvasRef.current.getContext('2d')
    ctx.lineTo(p.x,p.y)
    ctx.stroke()
    lastPoint.current=p
    setHasInk(true)
  }

  function end(e){
    if(!drawing.current)return
    e?.preventDefault?.()
    drawing.current=false
    lastPoint.current=null
    const data=canvasRef.current.toDataURL('image/png')
    setHasInk(true)
    onChange?.(data)
  }

  function clear(){
    const c=canvasRef.current
    const r=c.getBoundingClientRect()
    c.getContext('2d').clearRect(0,0,r.width,r.height)
    setHasInk(false)
    onChange?.('')
  }

  return <div className={`signatureWrap ${invalid?'invalidField':''}`}>
    <div className="signatureHead">
      <b>{label}</b>
      <button type="button" onClick={clear}><Eraser size={14}/> Limpar</button>
    </div>
    <canvas
      ref={canvasRef}
      className="signatureCanvas"
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={end}
    />
    <span>{hasInk?'Assinatura registrada':'Assine usando o dedo ou mouse'}</span>
  </div>
}
