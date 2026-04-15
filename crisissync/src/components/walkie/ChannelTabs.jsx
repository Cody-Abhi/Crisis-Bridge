// Props: channels [{id, label, hasActivity}], activeChannel, onSwitch
export default function ChannelTabs({ channels, activeChannel, onSwitch }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {channels.map(ch => (
        <button
          key={ch.id}
          onClick={() => onSwitch(ch.id)}
          className={`relative text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
            activeChannel === ch.id
              ? 'bg-cs-navy text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {ch.label}
          {ch.hasActivity && activeChannel !== ch.id && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
      ))}
    </div>
  )
}
