import { useDemoContext } from 'contexts/DemoContext'

export default function DemoBanner() {
  const { isLoggedIn, clearAllData } = useDemoContext()

  if (!isLoggedIn) return null

  return (
    <div className="bg-teal-600 px-4 py-2">
      <div className="container mx-auto flex items-center justify-between">
        <span className="text-sm text-white">
          Demo Mode - Your changes are saved locally in this browser
        </span>
        <button
          type="button"
          onClick={clearAllData}
          className="rounded bg-teal-800 px-3 py-1 text-xs text-white hover:bg-teal-900"
        >
          Reset Demo
        </button>
      </div>
    </div>
  )
}
