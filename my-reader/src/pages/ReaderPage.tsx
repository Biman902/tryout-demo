import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { get as idbGet } from 'idb-keyval'
import type { StoredBook } from './LibraryPage'
import { useSwipeable } from 'react-swipeable'
import { clsx } from 'clsx'

const DB_PREFIX = 'myreader:book:'

type Theme = 'light' | 'sepia' | 'dark'

type TypographySettings = {
  fontFamily: 'serif' | 'sans'
  fontSizePx: number
  lineHeight: number
  marginPercent: number
}

type Panel = 'toc' | 'notes' | null

// type TransitionMode = 'slide' | 'fade'

export default function ReaderPage() {
  const { bookId } = useParams<{ bookId: string }>()
  const navigate = useNavigate()
  const [book, setBook] = useState<StoredBook | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [theme, setTheme] = useState<Theme>('light')
  const [typography, setTypography] = useState<TypographySettings>({ fontFamily: 'serif', fontSizePx: 18, lineHeight: 1.5, marginPercent: 10 })
  const [panel, setPanel] = useState<Panel>(null)
  const [showBars, setShowBars] = useState<boolean>(false)
  // const [transition] = useState<TransitionMode>('slide')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [showSettings, setShowSettings] = useState<boolean>(false)

  useEffect(() => {
    async function load() {
      const meta = await idbGet(DB_PREFIX + bookId!)
      const b = await idbGet(DB_PREFIX + bookId! + ':blob')
      setBook(meta as StoredBook)
      setBlob(b as Blob)
      const savedTheme = localStorage.getItem('myreader:theme') as Theme | null
      const savedTypo = localStorage.getItem('myreader:typo')
      if (savedTheme) setTheme(savedTheme)
      if (savedTypo) setTypography(JSON.parse(savedTypo))
    }
    load()
  }, [bookId])

  function saveSettings(t: Theme, ty: TypographySettings) {
    localStorage.setItem('myreader:theme', t)
    localStorage.setItem('myreader:typo', JSON.stringify(ty))
  }

  const bg = useMemo(() => {
    if (theme === 'light') return 'var(--bg-reader-light)'
    if (theme === 'sepia') return 'var(--bg-reader-sepia)'
    return 'var(--bg-reader-dark)'
  }, [theme])
  const fg = useMemo(() => {
    if (theme === 'light') return 'var(--text-reader-light)'
    if (theme === 'sepia') return 'var(--text-reader-sepia)'
    return 'var(--text-reader-dark)'
  }, [theme])

  const handlers = useSwipeable({
    onSwipedLeft: () => goNextPage(),
    onSwipedRight: () => goPrevPage(),
    trackMouse: true,
  })

  function goNextPage() {
    // Implement per renderer - placeholder
  }
  function goPrevPage() {
    // Implement per renderer - placeholder
  }

  function toggleBars() {
    setShowBars((s) => !s)
  }

  return (
    <div className="relative min-h-screen" style={{ background: bg, color: fg }} {...handlers}>
      {/* Top reader bar */}
      <div
        className={clsx('fixed top-0 left-0 right-0 flex items-center justify-between px-2 md:px-4', showBars ? 'opacity-100' : 'opacity-0 pointer-events-none')}
        style={{ height: '56px', transition: 'opacity 200ms ease-in-out', background: theme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.9)' }}
      >
        <button className="p-2" onClick={() => navigate(-1)} aria-label="Back"><BackIcon color={theme === 'dark' ? '#E6E6E6' : '#262626'} /></button>
        <div className="flex items-center gap-2">
          <button className="p-2" aria-label="Bookmark"><BookmarkIcon color={theme === 'dark' ? '#E6E6E6' : '#262626'} /></button>
          <button className="p-2" aria-label="More"><DotsIcon color={theme === 'dark' ? '#E6E6E6' : '#262626'} /></button>
        </div>
      </div>

      {/* Bottom reader bar */}
      <div
        className={clsx('fixed bottom-0 left-0 right-0 flex items-center justify-around px-2', showBars ? 'opacity-100' : 'opacity-0 pointer-events-none')}
        style={{ height: '56px', transition: 'opacity 200ms ease-in-out', background: theme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.9)' }}
      >
        <button className="p-2" onClick={() => setPanel('toc')} aria-label="TOC"><ListIcon color={theme === 'dark' ? '#E6E6E6' : '#262626'} /></button>
        <button className="p-2" onClick={() => setPanel('notes')} aria-label="Notes"><PenIcon color={theme === 'dark' ? '#E6E6E6' : '#262626'} /></button>
        <button className="p-2" onClick={() => { setTheme(nextTheme(theme)); saveSettings(nextTheme(theme), typography) }} aria-label="Theme"><SunMoonIcon theme={theme} /></button>
        <button className="p-2" onClick={() => setShowSettings(true)} aria-label="Aa"><AaIcon color={theme === 'dark' ? '#E6E6E6' : '#262626'} /></button>
      </div>

      {/* Reading container */}
      <div
        ref={containerRef}
        onClick={toggleBars}
        className="mx-auto w-full"
        style={{ paddingLeft: `${typography.marginPercent}%`, paddingRight: `${typography.marginPercent}%`, paddingTop: '56px', paddingBottom: '56px', maxWidth: '1100px' }}
      >
        <Renderer book={book} blob={blob} theme={theme} typography={typography} />
      </div>

      <TOCPanel open={panel === 'toc'} onClose={() => setPanel(null)} />
      <NotesPanel open={panel === 'notes'} onClose={() => setPanel(null)} />

      <TypographyPanel
        open={showSettings}
        close={() => setShowSettings(false)}
        typography={typography}
        setTypography={(ty) => { setTypography(ty); saveSettings(theme, ty) }}
      />
    </div>
  )
}

function Renderer({ book, blob, theme, typography }: { book: StoredBook | null; blob: Blob | null; theme: Theme; typography: TypographySettings }) {
  if (!book || !blob) return <div className="py-10 text-center opacity-60">Loading…</div>
  if (book.mimeType === 'application/epub+zip') return <EpubRenderer blob={blob} theme={theme} typography={typography} />
  if (book.mimeType === 'application/pdf') return <PdfRenderer blob={blob} />
  return <TxtRenderer blob={blob} typography={typography} />
}

function EpubRenderer({ blob, theme, typography }: { blob: Blob; theme: Theme; typography: TypographySettings }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    let book: any
    import('epubjs').then((m) => {
      const Epub = (m as any).default || (m as any)
      book = Epub(blob)
      const rendition = book.renderTo(containerRef.current!, { width: '100%', height: '80vh', spread: 'none' })
      rendition.themes.register('custom', {
        body: {
          background: theme === 'light' ? 'var(--bg-reader-light)' : theme === 'sepia' ? 'var(--bg-reader-sepia)' : 'var(--bg-reader-dark)',
          color: theme === 'light' ? 'var(--text-reader-light)' : theme === 'sepia' ? 'var(--text-reader-sepia)' : 'var(--text-reader-dark)',
          fontFamily: typography.fontFamily === 'serif' ? 'Noto Serif, serif' : 'Noto Sans, sans-serif',
          fontSize: `${typography.fontSizePx}px`,
          lineHeight: `${typography.lineHeight}`,
        },
      })
      rendition.themes.select('custom')
      rendition.display()
    })
    return () => { /* cleanup if needed */ }
  }, [blob, theme, typography])
  return <div ref={containerRef} />
}

function PdfRenderer({ blob }: { blob: Blob }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    import('pdfjs-dist').then(async (pdfjsLib) => {
      const pdfjs = (pdfjsLib as any)
      // Set worker if available
      if (pdfjs.GlobalWorkerOptions && pdfjs.workerSrc === undefined) {
        // Use the same bundle for worker in this simple setup
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
      }
      const url = URL.createObjectURL(blob)
      const pdf = await pdfjs.getDocument({ url }).promise
      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 1.2 })
      const canvas = canvasRef.current!
      const ctx = canvas.getContext('2d')!
      canvas.height = viewport.height
      canvas.width = viewport.width
      await page.render({ canvasContext: ctx, viewport }).promise
      URL.revokeObjectURL(url)
    })
  }, [blob])
  return <div className="flex justify-center"><canvas ref={canvasRef} /></div>
}

function TxtRenderer({ blob, typography }: { blob: Blob; typography: TypographySettings }) {
  const [text, setText] = useState('')
  useEffect(() => {
    blob.text().then(setText)
  }, [blob])
  return (
    <article
      style={{
        fontFamily: typography.fontFamily === 'serif' ? 'Noto Serif, serif' : 'Noto Sans, sans-serif',
        fontSize: `${typography.fontSizePx}px`,
        lineHeight: typography.lineHeight,
      }}
      className="whitespace-pre-wrap"
    >
      {text}
    </article>
  )
}

function TOCPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div
      className={clsx('fixed inset-y-0 left-0 w-[80%] md:w-[300px] bg-white shadow-xl z-30 transform transition-transform duration-200', open ? 'translate-x-0' : '-translate-x-full')}
      style={{ transitionDuration: '250ms' }}
    >
      <div className="p-4 font-semibold">Table of Contents</div>
      <button className="absolute top-2 right-2 p-2" onClick={onClose}>Close</button>
      <div className="p-4 space-y-2 text-sm">
        {/* Chapters populated via renderer integration */}
        <div className="text-gray-500">No chapters available</div>
      </div>
    </div>
  )
}

function NotesPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div
      className={clsx('fixed inset-y-0 right-0 w-[80%] md:w-[300px] bg-white shadow-xl z-30 transform transition-transform duration-200', open ? 'translate-x-0' : 'translate-x-full')}
      style={{ transitionDuration: '250ms' }}
    >
      <div className="p-4 font-semibold">Notes & Bookmarks</div>
      <button className="absolute top-2 left-2 p-2" onClick={onClose}>Close</button>
      <div className="p-4 space-y-2 text-sm">
        <div className="text-gray-500">No notes yet</div>
      </div>
    </div>
  )
}

function TypographyPanel({ open, close, typography, setTypography }: { open: boolean; close: () => void; typography: TypographySettings; setTypography: (t: TypographySettings) => void }) {
  const [local, setLocal] = useState<TypographySettings>(typography)
  useEffect(() => { setLocal(typography) }, [typography])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-end md:items-center justify-center" onClick={close}>
      <div className="bg-white w-full md:w-[560px] rounded-t-2xl md:rounded-2xl p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="font-semibold">Typography</div>
        <div className="grid grid-cols-4 gap-3 items-center">
          <label className="col-span-1 text-sm text-gray-600">Font size</label>
          <input type="range" min={12} max={28} value={local.fontSizePx} onChange={(e) => setLocal({ ...local, fontSizePx: Number(e.target.value) })} className="col-span-3" />
          <label className="col-span-1 text-sm text-gray-600">Line height</label>
          <input type="range" min={1.2} max={2.0} step={0.05} value={local.lineHeight} onChange={(e) => setLocal({ ...local, lineHeight: Number(e.target.value) })} className="col-span-3" />
          <label className="col-span-1 text-sm text-gray-600">Margins</label>
          <input type="range" min={5} max={15} value={local.marginPercent} onChange={(e) => setLocal({ ...local, marginPercent: Number(e.target.value) })} className="col-span-3" />
        </div>
        <div className="flex items-center gap-2">
          <button className={clsx('px-3 py-2 rounded border', local.fontFamily === 'serif' ? 'bg-blue-50 border-blue-500' : 'border-gray-300')} onClick={() => setLocal({ ...local, fontFamily: 'serif' })}>Serif</button>
          <button className={clsx('px-3 py-2 rounded border', local.fontFamily === 'sans' ? 'bg-blue-50 border-blue-500' : 'border-gray-300')} onClick={() => setLocal({ ...local, fontFamily: 'sans' })}>Sans</button>
        </div>
        <div className="flex justify-end gap-2">
          <button className="px-3 py-2" onClick={close}>Cancel</button>
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => { setTypography(local); close() }}>Apply</button>
        </div>
      </div>
    </div>
  )
}

function nextTheme(t: Theme): Theme {
  return t === 'light' ? 'sepia' : t === 'sepia' ? 'dark' : 'light'
}

function BackIcon({ color = '#262626' }: { color?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  )
}
function BookmarkIcon({ color = '#262626' }: { color?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 4h12v16l-6-4-6 4V4z" stroke={color} strokeWidth="2" strokeLinejoin="round"/></svg>
  )
}
function DotsIcon({ color = '#262626' }: { color?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="1.8" fill={color}/><circle cx="12" cy="12" r="1.8" fill={color}/><circle cx="12" cy="19" r="1.8" fill={color}/></svg>
  )
}
function SunMoonIcon({ theme }: { theme: Theme }) {
  if (theme === 'dark') return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 12a9 9 0 11-9-9 7 7 0 009 9z" stroke="#E6E6E6" strokeWidth="2"/></svg>
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" stroke="#262626" strokeWidth="2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="#262626" strokeWidth="2"/></svg>
}
function AaIcon({ color = '#262626' }: { color?: string }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 18l6-14 6 14M5 13h8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function ListIcon({ color = '#262626' }: { color?: string }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke={color} strokeWidth="2" strokeLinecap="round"/></svg>
}
function PenIcon({ color = '#262626' }: { color?: string }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 20l4-1 9-9-3-3-9 9-1 4zM14 6l3 3" stroke={color} strokeWidth="2" strokeLinejoin="round"/></svg>
}