// Props: participants object { uid: { name, role, isSpeaking } }, currentUserId
export default function ParticipantList({ participants, currentUserId }) {
  const list = Object.entries(participants)
  if (list.length === 0) {
    return <p className="text-slate-400 text-xs italic py-1">No one in channel</p>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map(([uid, p]) => (
        <div
          key={uid}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
            p.isSpeaking
              ? 'bg-green-100 border-green-400 text-green-800'
              : uid === currentUserId
                ? 'bg-blue-100 border-blue-300 text-blue-700'
                : 'bg-slate-100 border-slate-300 text-slate-600'
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${p.isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
          {p.name}{uid === currentUserId ? ' (You)' : ''}
        </div>
      ))}
    </div>
  )
}
