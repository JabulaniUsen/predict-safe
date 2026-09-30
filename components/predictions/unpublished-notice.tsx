import { Clock } from 'lucide-react'

/**
 * Shown on public prediction surfaces when the requested date hasn't been
 * published by the admin yet. Rendered INSTEAD of any prediction content —
 * including locked previews — so nothing about the unpublished day leaks.
 */
export function UnpublishedNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 ${
        compact ? 'p-6' : 'p-8 lg:p-12'
      }`}
    >
      <Clock className={`${compact ? 'h-8 w-8' : 'h-12 w-12'} text-[#1e40af] mb-3`} />
      <h3 className="text-lg font-bold text-gray-900 mb-1">
        Predictions not published yet
      </h3>
      <p className="text-sm text-gray-600 max-w-md">
        Our experts are still preparing the predictions for this date. Please check back soon.
      </p>
    </div>
  )
}
