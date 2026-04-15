// Props: startPTT, stopPTT, isSpeaking, disabled, size ('large'|'normal')
import { useState } from 'react'

export default function PTTButton({ startPTT, stopPTT, isSpeaking, disabled, size = 'normal' }) {
  const [pressing, setPressing] = useState(false)

  const handleStart = async (e) => {
    e.preventDefault()
    if (disabled) return
    setPressing(true)
    await startPTT()
  }

  const handleEnd = async (e) => {
    e.preventDefault()
    if (!pressing) return
    setPressing(false)
    await stopPTT()
  }

  const isLarge = size === 'large'

  return (
    <button
      onMouseDown={handleStart}
      onTouchStart={handleStart}
      onMouseUp={handleEnd}
      onTouchEnd={handleEnd}
      onMouseLeave={handleEnd}
      disabled={disabled}
      className={`
        select-none transition-all duration-150 font-bold
        flex flex-col items-center justify-center gap-1
        ${isLarge ? 'w-full py-8 rounded-2xl text-xl' : 'w-full py-4 rounded-xl text-sm'}
        ${disabled
          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
          : pressing || isSpeaking
            ? 'bg-red-600 text-white shadow-lg shadow-red-500/50 scale-[0.98] ring-4 ring-red-400 ring-offset-2 animate-pulse'
            : 'bg-orange-500 hover:bg-orange-600 text-white shadow-md active:scale-[0.97]'
        }
      `}
    >
      <span className={isLarge ? 'text-4xl' : 'text-2xl'}>🎙</span>
      <span>{pressing || isSpeaking ? 'TRANSMITTING...' : 'HOLD TO TALK'}</span>
      {disabled && <span className="text-xs font-normal opacity-70">Mic unavailable</span>}
    </button>
  )
}
