// Book metadata lookup. Open Library is free and keyless; Google Books is only queried when
// VITE_GOOGLE_BOOKS_KEY is set (keyless Google calls share a quota that is usually exhausted)
// and helps with Indonesian titles Open Library lacks.

const OL_FIELDS = 'key,title,author_name,first_publish_year,number_of_pages_median,cover_i,isbn'
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_BOOKS_KEY

function isIsbn(q) {
  const d = q.replace(/[\s-]/g, '')
  return /^(\d{9}[\dXx]|\d{13})$/.test(d) ? d : null
}

async function searchOpenLibrary(q, signal) {
  const isbn = isIsbn(q)
  const params = new URLSearchParams({ fields: OL_FIELDS, limit: '12' })
  params.set(isbn ? 'isbn' : 'q', isbn || q)
  const res = await fetch(`https://openlibrary.org/search.json?${params}`, { signal })
  if (!res.ok) throw new Error(`Open Library ${res.status}`)
  const { docs = [] } = await res.json()
  return docs.map(d => ({
    source_key: `ol:${d.key}`,
    title: d.title || '',
    author: (d.author_name || []).slice(0, 3).join(', '),
    pages: d.number_of_pages_median || 0,
    published_year: d.first_publish_year || null,
    isbn: isbn || (d.isbn || []).find(x => x.length === 13) || (d.isbn || [])[0] || '',
    cover_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : '',
  }))
}

async function searchGoogle(q, signal) {
  if (!GOOGLE_KEY) return []
  const isbn = isIsbn(q)
  const params = new URLSearchParams({ q: isbn ? `isbn:${isbn}` : q, maxResults: '12', key: GOOGLE_KEY })
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`, { signal })
  if (!res.ok) throw new Error(`Google Books ${res.status}`)
  const { items = [] } = await res.json()
  return items.map(({ id, volumeInfo: v = {} }) => {
    const ids = v.industryIdentifiers || []
    return {
      source_key: `gb:${id}`,
      title: [v.title, v.subtitle].filter(Boolean).join(': '),
      author: (v.authors || []).slice(0, 3).join(', '),
      pages: v.pageCount || 0,
      published_year: parseInt(v.publishedDate) || null,
      isbn: (ids.find(i => i.type === 'ISBN_13') || ids[0] || {}).identifier || '',
      cover_url: (v.imageLinks?.thumbnail || '').replace(/^http:/, 'https:'),
    }
  })
}

// Returns merged results, deduped by title+author. Rejects only if every source fails.
export async function searchBooks(q, signal) {
  const results = await Promise.allSettled([searchOpenLibrary(q, signal), searchGoogle(q, signal)])
  if (results.every(r => r.status === 'rejected')) throw results[0].reason
  const [ol, gb] = results.map(r => (r.status === 'fulfilled' ? r.value : []))

  // Interleave so both sources surface near the top
  const merged = []
  for (let i = 0; i < Math.max(ol.length, gb.length); i++) {
    if (ol[i]) merged.push(ol[i])
    if (gb[i]) merged.push(gb[i])
  }
  const seen = new Set()
  return merged.filter(b => {
    const k = `${b.title}|${b.author}`.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}
