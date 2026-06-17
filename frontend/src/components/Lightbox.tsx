import { useAdmin } from '../store'

export function Lightbox() {
  const s = useAdmin()
  if (!s.lightboxImage) return null
  return (
    <div
      onClick={s.closeLightbox}
      style={{
        position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 40, background: 'rgba(10,6,4,0.82)', animation: 'overlayIn 0.18s ease', cursor: 'zoom-out',
      }}
    >
      <img
        src={s.lightboxImage}
        alt="foto menu"
        style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', animation: 'modalIn 0.22s ease' }}
      />
    </div>
  )
}
