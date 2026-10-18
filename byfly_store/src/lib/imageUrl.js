// Product images are served through the Go API S3 proxy.
export const getImageUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) {
    try {
      const image = new URL(path)
      if (image.hostname.includes('.s3.') || image.hostname.startsWith('s3.')) {
        const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '')
        return `${apiBase}/images/${image.pathname.replace(/^\//, '')}`
      }
    } catch { /* use the original value */ }
    return path
  }
  const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '')
  return `${apiBase}/images/${path.replace(/^\/+/, '')}`
}
