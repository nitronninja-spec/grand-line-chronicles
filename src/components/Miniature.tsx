'use client'

import type { ImgHTMLAttributes, SyntheticEvent } from 'react'

// Version légère d'une image de media/ pour les cartes, listes et galeries : media/_mini/<chemin>.webp
// (600 px de large, créée par upload.php à l'envoi et par miniatures.mjs pour les anciennes images).
// L'original reste utilisé pour l'agrandissement (ImageLightbox) et le recadrage.
export function miniature(url: string | null | undefined): string {
  if (!url) return ''
  const m = url.match(/^(.*\/media\/)(?!_mini\/)(.+)\.(jpe?g|png|gif|webp|avif)$/i)
  return m ? `${m[1]}_mini/${m[2]}.webp` : url
}

// Si la miniature n'existe pas (image envoyée avant leur mise en place), on retombe sur l'original.
function repli(e: SyntheticEvent<HTMLImageElement>, original: string) {
  const img = e.currentTarget
  if (img.dataset.repli) return
  img.dataset.repli = '1'
  img.src = original
}

export default function Miniature({ src, ...props }: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src: string }) {
  return <img loading="lazy" decoding="async" {...props} src={miniature(src)} onError={e => repli(e, src)} />
}
