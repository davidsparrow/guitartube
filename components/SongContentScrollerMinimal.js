/* components/SongContentScrollerMinimal.js - TESTING HTML INJECTION */

export default function SongContentScrollerMinimal({
  content,
  isLoading = false,
  error = null
}) {
  return (
    <div className="h-full bg-black border rounded p-3">
      {/* CSS injection (we know this works) */}
      <style jsx>{`
        @keyframes scrollDown {
          0% {
            transform: translateY(0px);
          }
          100% {
            transform: translateY(var(--scroll-distance));
          }
        }
      `}</style>

      <div className="text-white text-sm mb-2">
        PHASE 9: Testing HTML content injection
      </div>

      {/* FIXED: Safe HTML rendering instead of dangerouslySetInnerHTML */}
      <div className="h-32 overflow-y-auto">
        <div className="text-sm leading-relaxed font-mono text-white">
          {content ? (
            <pre className="whitespace-pre-wrap">
              {content.replace(/<[^>]*>/g, '')}
            </pre>
          ) : (
            <p>No content available</p>
          )}
        </div>
      </div>
    </div>
  )
}
