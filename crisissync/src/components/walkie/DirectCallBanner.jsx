// Props: targetStaff { uid, name, designation }, onInitiate, onDismiss
// Used two ways:
//   1. Admin initiates: shows "Start direct call with Raj Kumar?" + [Call] [Cancel]
//   2. Staff receives: shows "Admin wants to speak privately" + [Accept] [Decline]

export default function DirectCallBanner({ targetStaff, mode, onAccept, onDecline }) {
  return (
    <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-3 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">📻</span>
        <div>
          <p className="font-bold text-amber-800 text-sm">
            {mode === 'initiate'
              ? `Direct call to ${targetStaff?.name}`
              : 'Admin wants to speak privately'
            }
          </p>
          <p className="text-amber-600 text-xs">{targetStaff?.designation || ''}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs py-2 rounded-lg font-bold transition"
        >
          {mode === 'initiate' ? '📞 Start Call' : '✅ Accept'}
        </button>
        <button
          onClick={onDecline}
          className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs py-2 rounded-lg font-semibold transition"
        >
          {mode === 'initiate' ? '✕ Cancel' : '❌ Decline'}
        </button>
      </div>
    </div>
  )
}
