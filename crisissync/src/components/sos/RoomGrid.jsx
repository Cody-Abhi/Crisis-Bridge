import RoomBlock from './RoomBlock'

export default function RoomGrid({ floorLayout = {}, activeSOS = [] }) {
  // Build a map of roomNumber -> sosData for fast lookup
  const sosMap = {}
  activeSOS.forEach(sos => {
    sosMap[sos.roomNumber] = sos
  })

  // Floors might be string numbers like "1", "2"
  const floors = Object.keys(floorLayout).sort((a, b) => Number(a) - Number(b))

  if (floors.length === 0) {
    return <div className="text-slate-500 italic p-4 border border-dashed border-slate-300 rounded-xl text-center">No floor layout configured for this hotel.</div>
  }

  return (
    <div className="space-y-4 bg-white p-6 rounded-xl border border-slate-200">
      <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Floor Map</h3>
      <div className="space-y-4">
        {floors.map(floor => (
          <div key={floor} className="flex items-start gap-4 flex-wrap">
            {/* Floor label */}
            <div className="text-sm font-bold text-slate-500 w-16 shrink-0 pt-3">
              Floor {floor}
            </div>
            {/* Room blocks */}
            <div className="flex flex-wrap gap-2 flex-1">
              {floorLayout[floor].map(roomNum => (
                <RoomBlock
                  key={roomNum}
                  roomNumber={roomNum}
                  sosData={sosMap[roomNum] || null}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
