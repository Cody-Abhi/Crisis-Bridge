// Props: speakingUser (string | null), isSpeaking (boolean — am I speaking?)
export default function SpeakingIndicator({ speakingUser, isSpeaking }) {
  if (!speakingUser && !isSpeaking) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-slate-50 rounded-lg">
        <div className="w-2 h-2 bg-slate-300 rounded-full" />
        <span className="text-slate-400 text-xs">Channel quiet</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 py-2 px-3 bg-green-50 border border-green-200 rounded-lg">
      {/* Animated sound bars */}
      <div className="flex items-end gap-0.5 h-4">
        {[3, 5, 4, 6, 3].map((h, i) => (
          <div
            key={i}
            className="w-1 bg-green-500 rounded-full animate-bounce"
            style={{ height: `${h * 2}px`, animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
      <span className="text-green-700 text-xs font-semibold">
        {isSpeaking ? 'You are speaking' : `${speakingUser} is speaking`}
      </span>
    </div>
  )
}
