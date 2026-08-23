export default async function handler(req, res) {
  const topic = String(req.query?.topic || 'segurança eletrônica').trim().slice(0, 120)
  const max = Math.min(Number(req.query?.limit || 8), 12)

  if (!topic) {
    return res.status(400).json({ error: 'Assunto não informado.' })
  }

  try {
    const q = encodeURIComponent(topic)
    const url = `https://news.google.com/rss/search?q=${q}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FORTAL-TECH-News/1.0'
      }
    })

    if (!response.ok) throw new Error(`Fonte respondeu ${response.status}`)

    const xml = await response.text()

    const decode = (s='') => s
      .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')

    const stripTags = (s='') => decode(s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())

    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      .slice(0, max)
      .map((match, index) => {
        const block = match[1]
        const get = (tag) => {
          const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
          return m ? decode(m[1].trim()) : ''
        }

        const rawTitle = stripTags(get('title'))
        const link = stripTags(get('link'))
        const pubDate = stripTags(get('pubDate'))
        const description = stripTags(get('description'))

        let source = ''
        let title = rawTitle
        const parts = rawTitle.split(' - ')
        if (parts.length > 1) {
          source = parts.pop()
          title = parts.join(' - ')
        }

        return {
          id: `${Date.now()}-${index}`,
          title,
          source,
          link,
          pubDate,
          description: description.slice(0, 260)
        }
      })
      .filter(x => x.title && x.link)

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800')
    return res.status(200).json({
      topic,
      updatedAt: new Date().toISOString(),
      items
    })
  } catch (error) {
    return res.status(500).json({
      error: 'Não foi possível atualizar as notícias agora.',
      detail: error.message
    })
  }
}
