import { API_BASE_URL } from './apiClient'

// Product images are served through the Go API S3 proxy.
export const getImageUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) {
    try {
      const image = new URL(path)
      if (image.hostname.includes('.s3.') || image.hostname.startsWith('s3.')) {
        return API_BASE_URL ? `${API_BASE_URL}/images/${image.pathname.replace(/^\//, '')}` : path
      }
    } catch { /* use the original value */ }
    return path
  }
  return API_BASE_URL ? `${API_BASE_URL}/images/${path.replace(/^\/+/, '')}` : path
}
