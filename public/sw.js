const CACHE='fortal-tech-v1.12.9-pwa'
const APP_SHELL=['/','/index.html','/manifest.webmanifest','/icon-192.png','/icon-512.png']

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)))
  self.skipWaiting()
})
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))))
  self.clients.claim()
})
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return
  const url=new URL(event.request.url)

  if(url.hostname.includes('supabase.co')){
    event.respondWith(fetch(event.request,{cache:'no-store'}))
    return
  }

  // Navegação/HTML sempre tenta a rede primeiro para receber a versão nova.
  if(event.request.mode==='navigate' || url.pathname==='/' || url.pathname.endsWith('/index.html')){
    event.respondWith(
      fetch(event.request,{cache:'no-store'}).then(response=>{
        if(response.ok){
          const clone=response.clone()
          caches.open(CACHE).then(cache=>cache.put('/index.html',clone)).catch(()=>{})
        }
        return response
      }).catch(()=>caches.match('/index.html'))
    )
    return
  }

  // Assets: rede primeiro; cache apenas como fallback offline.
  event.respondWith(
    fetch(event.request).then(response=>{
      if(response.ok){
        const clone=response.clone()
        caches.open(CACHE).then(cache=>cache.put(event.request,clone)).catch(()=>{})
      }
      return response
    }).catch(()=>caches.match(event.request))
  )
})
