import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { set as idbSet, get as idbGet, keys as idbKeys } from 'idb-keyval'
import { clsx } from 'clsx'

export type StoredBook = {
  id: string
  title: string
  author?: string
  coverDataUrl?: string
  mimeType: 'application/epub+zip' | 'application/pdf' | 'text/plain'
  createdAt: number
  progress?: number
}

const DB_PREFIX = 'myreader:book:'

function useBooks() {
  const [books, setBooks] = useState<StoredBook[]>([])

  useEffect(() => {
    let mounted = true
    async function load() {
      const allKeys = await idbKeys()
      const bookKeys = allKeys.filter((k) => typeof k === 'string' && (k as string).startsWith(DB_PREFIX)) as string[]
      const items: StoredBook[] = []
      for (const key of bookKeys) {
        const item = await idbGet(key)
        if (item) items.push(item as StoredBook)
      }
      items.sort((a, b) => b.createdAt - a.createdAt)
      if (mounted) setBooks(items)
    }
    load()
    return () => { mounted = false }
  }, [])

  return { books, setBooks }
}

function AppBar({ query, setQuery }: { query: string; setQuery: (v: string) => void }) {
  return (
    <div className="sticky top-0 z-20 w-full" style={{ height: '64px' }}>
      <div className="h-full flex items-center justify-between px-4 md:px-6" style={{ background: 'var(--bg-library-light)' }}>
        <div className="text-[20px] md:text-[20px] font-semibold">My Library</div>
        <div className="flex-1 px-4 max-w-xl">
          <div className="w-full rounded-full bg-[#F0F0F0] text-sm flex items-center px-3 py-2">
            <input
              className="bg-transparent w-full outline-none"
              placeholder="Search books"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <button aria-label="Menu" className="p-2 rounded-full hover:bg-black/5">
          <DotsIcon />
        </button>
      </div>
    </div>
  )
}

export default function LibraryPage() {
  const { books, setBooks } = useBooks()
  const [query, setQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return books
    return books.filter((b) => (b.title || '').toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q))
  }, [books, query])

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    for (const file of Array.from(files)) {
      const mimeGuess = guessMimeType(file)
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const coverDataUrl = await extractCover(file, mimeGuess)
      const book: StoredBook = {
        id,
        title: file.name.replace(/\.(epub|pdf|txt)$/i, ''),
        mimeType: mimeGuess,
        coverDataUrl: coverDataUrl || undefined,
        createdAt: Date.now(),
        author: 'Unknown',
        progress: 0,
      }
      await idbSet(DB_PREFIX + id, book)
      // store blob under separate key
      await idbSet(DB_PREFIX + id + ':blob', file)
    }
    const allKeys = await idbKeys()
    const bookKeys = allKeys.filter((k) => typeof k === 'string' && (k as string).startsWith(DB_PREFIX) && !(k as string).endsWith(':blob')) as string[]
    const items: StoredBook[] = []
    for (const key of bookKeys) {
      const item = await idbGet(key)
      if (item) items.push(item as StoredBook)
    }
    items.sort((a, b) => b.createdAt - a.createdAt)
    setBooks(items)
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-library-light)' }}>
      <AppBar query={query} setQuery={setQuery} />

      <div className="px-2 md:px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 md:gap-4 py-4">
          {filtered.map((b) => (
            <BookCard key={b.id} book={b} onClick={() => navigate(`/reader/${b.id}`)} />
          ))}
        </div>
        <div className="py-6 text-center">
          <button
            className="px-3 py-2 text-sm rounded border"
            onClick={async () => {
              const res = await fetch('/samples/plain.txt')
              const txt = await res.blob()
              const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
              const book: StoredBook = { id, title: 'Sample Text', author: 'Public Domain', createdAt: Date.now(), mimeType: 'text/plain', progress: 0 }
              await idbSet(DB_PREFIX + id, book)
              await idbSet(DB_PREFIX + id + ':blob', txt)
              const allKeys = await idbKeys()
              const bookKeys = allKeys.filter((k) => typeof k === 'string' && (k as string).startsWith(DB_PREFIX) && !(k as string).endsWith(':blob')) as string[]
              const items: StoredBook[] = []
              for (const key of bookKeys) {
                const item = await idbGet(key)
                if (item) items.push(item as StoredBook)
              }
              items.sort((a, b) => b.createdAt - a.createdAt)
              setBooks(items)
            }}
          >
            Import sample TXT
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept=".epub,application/epub+zip,.pdf,application/pdf,.txt,text/plain"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
      />

      <button
        aria-label="Add"
        onClick={() => fileInputRef.current?.click()}
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full flex items-center justify-center text-white"
        style={{ backgroundColor: 'var(--accent)', boxShadow: '0 6px 16px rgba(0,0,0,0.2)' }}
      >
        <PlusIcon />
      </button>
    </div>
  )
}

function BookCard({ book, onClick }: { book: StoredBook; onClick: () => void }) {
  return (
    <div
      role="button"
      onClick={onClick}
      className={clsx(
        'rounded-lg overflow-hidden bg-white shadow-card transition-transform duration-150',
        'hover:shadow-card-hover hover:scale-[1.02]'
      )}
    >
      <div className="aspect-[3/4] bg-gray-100">
        {book.coverDataUrl ? (
          <img src={book.coverDataUrl} alt="cover" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-gray-400">No Cover</div>
        )}
      </div>
      <div className="p-2">
        <div className="font-semibold text-sm truncate" title={book.title}>{book.title}</div>
        <div className="text-xs text-[#666] truncate">{book.author || 'Unknown'}</div>
      </div>
      <div className="h-[3px] mx-2 mb-2 rounded-full bg-gray-200 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.round((book.progress || 0) * 100)}%`, backgroundColor: 'var(--accent)' }} />
      </div>
    </div>
  )
}

function DotsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="5" r="1.8" fill="#444" />
      <circle cx="12" cy="12" r="1.8" fill="#444" />
      <circle cx="12" cy="19" r="1.8" fill="#444" />
    </svg>
  )
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0" />
      <path d="M12 6v12M6 12h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function guessMimeType(file: File): StoredBook['mimeType'] {
  const name = file.name.toLowerCase()
  if (name.endsWith('.epub')) return 'application/epub+zip'
  if (name.endsWith('.pdf')) return 'application/pdf'
  return 'text/plain'
}

async function extractCover(_file: File, mime: string): Promise<string | null> {
  try {
    if (mime === 'application/pdf') {
      // render first page thumbnail with pdfjs on the fly later; fallback here
      return null
    }
    if (mime === 'text/plain') {
      return null
    }
    // For EPUB, try to use epubjs to load cover when opening; we keep null now
    return null
  } catch (e) {
    return null
  }
}