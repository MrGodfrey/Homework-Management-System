export const DEFAULT_SUBMISSION_UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024

export function formatFileSize(sizeBytes) {
  if (!Number.isFinite(sizeBytes)) return '-'
  if (sizeBytes < 1024) return `${sizeBytes}B`
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)}KB`
  const mb = sizeBytes / (1024 * 1024)
  return Number.isInteger(mb) ? `${mb}MB` : `${mb.toFixed(1)}MB`
}

export async function loadSubmissionUploadLimit(api) {
  try {
    const res = await api.get('/settings/upload-limits')
    const maxBytes = Number(res.data?.submission_max_bytes) || DEFAULT_SUBMISSION_UPLOAD_LIMIT_BYTES
    return {
      maxBytes,
      label: res.data?.submission_max_label || formatFileSize(maxBytes)
    }
  } catch {
    return {
      maxBytes: DEFAULT_SUBMISSION_UPLOAD_LIMIT_BYTES,
      label: formatFileSize(DEFAULT_SUBMISSION_UPLOAD_LIMIT_BYTES)
    }
  }
}

export function totalRawFileSize(files) {
  return files.reduce((total, file) => total + (file.raw?.size || file.size || 0), 0)
}
