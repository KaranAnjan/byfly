import { useEffect, useState } from 'react'
import { apiRequest } from '../../lib/apiClient'
import { getImageUrl } from '../../lib/imageUrl'
import { Upload, X, Loader2 } from 'lucide-react'

const ImageUploader = ({ productId, images = [], legacyImage = '', maxImages = 4, onImagesChange }) => {
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    const current = (images || []).slice()
    if (current.length === 0 && legacyImage) current.push({ url: legacyImage, image_index: 1 })
    setItems(current.sort((a, b) => Number(a.image_index) - Number(b.image_index)))
  }, [images, legacyImage])

  const update = (next) => {
    const sorted = next.filter(Boolean).sort((a, b) => Number(a.image_index) - Number(b.image_index))
    setItems(sorted)
    onImagesChange?.(sorted)
  }

  const upload = async (event, index) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size >= 1024 * 1024) { alert('Image must be smaller than 1 MB'); return }
    if (!productId) { alert('Save the product first, then add images from Edit Product.'); return }
    try {
      setBusy(index)
      const body = new FormData()
      body.append('file', file)
      body.append('image_index', String(index))
      const result = await apiRequest(`/admin/products/${productId}/images`, { method: 'POST', body })
      update([...items.filter((image) => Number(image.image_index) !== index), result])
    } catch (error) { alert(`Error uploading image: ${error.message}`) }
    finally { setBusy(null); event.target.value = '' }
  }

  const remove = async (image) => {
    if (!productId) return
    if (!image.id) { update(items.filter((item) => item !== image)); return }
    try {
      setBusy(Number(image.image_index))
      await apiRequest(`/admin/products/${productId}/images/${image.id}`, { method: 'DELETE' })
      update(items.filter((item) => item.id !== image.id))
    } catch (error) { alert(`Error deleting image: ${error.message}`) }
    finally { setBusy(null) }
  }

  return <div className="w-full">
    <div className="mb-3 flex items-center justify-between"><div><p className="text-sm font-medium text-gray-700">Product images</p><p className="text-xs text-gray-500">Up to {maxImages} images, each under 1 MB</p></div><span className="text-xs text-gray-500">{items.length}/{maxImages}</span></div>
    {!productId && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">Save the product first. Then edit it to add up to four images.</p>}
    {productId && <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="mx-auto h-[260px] w-full max-w-[260px]">
        {[1].map((index) => {
        const image = items.find((item) => Number(item.image_index) === index)
        return <div key={index} className="relative h-full overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white">
          {image ? <><img src={getImageUrl(image.url)} alt={`Product image ${index}`} className="h-full w-full object-cover" /><button type="button" onClick={() => remove(image)} disabled={busy === index} className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white shadow"><X className="h-3 w-3" /></button>{busy === index && <div className="absolute inset-0 grid place-items-center bg-white/70"><Loader2 className="h-5 w-5 animate-spin text-emerald-700" /></div>}</> : <label className={`flex h-full cursor-pointer flex-col items-center justify-center gap-1 text-xs text-slate-500 ${busy === index ? 'pointer-events-none opacity-60' : 'hover:border-emerald-500 hover:text-emerald-700'}`}><Upload className="h-6 w-6" /><span>{index === 1 ? 'Main image' : `Image ${index}`}</span><input type="file" accept="image/*" onChange={(event) => upload(event, index)} disabled={busy !== null} className="hidden" /></label>}
        </div>
        })}
      </div>
      <div className="grid grid-cols-3 gap-3 sm:h-[260px] sm:grid-cols-1 sm:grid-rows-3">
        {Array.from({ length: Math.max(0, maxImages - 1) }, (_, slot) => slot + 2).map((index) => {
          const image = items.find((item) => Number(item.image_index) === index)
          return <div key={index} className="relative aspect-square min-h-0 overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white sm:aspect-auto">
            {image ? <><img src={getImageUrl(image.url)} alt={`Product image ${index}`} className="h-full w-full object-cover" /><button type="button" onClick={() => remove(image)} disabled={busy === index} className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white shadow"><X className="h-3 w-3" /></button>{busy === index && <div className="absolute inset-0 grid place-items-center bg-white/70"><Loader2 className="h-5 w-5 animate-spin text-emerald-700" /></div>}</> : <label className={`flex h-full cursor-pointer flex-col items-center justify-center gap-1 text-xs text-slate-500 ${busy === index ? 'pointer-events-none opacity-60' : 'hover:border-emerald-500 hover:text-emerald-700'}`}><Upload className="h-6 w-6" /><span>Image {index}</span><input type="file" accept="image/*" onChange={(event) => upload(event, index)} disabled={busy !== null} className="hidden" /></label>}
          </div>
        })}
      </div>
    </div>}
  </div>
}

export default ImageUploader
