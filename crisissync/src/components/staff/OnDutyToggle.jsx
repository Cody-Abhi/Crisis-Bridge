// src/components/staff/OnDutyToggle.jsx
export default function OnDutyToggle({ isOnDuty, onChange }) {
  return (
    <button
      className={`duty-toggle ${isOnDuty ? 'on' : 'off'}`}
      onClick={() => onChange(!isOnDuty)}
      type="button"
    >
      {isOnDuty ? '● ON DUTY' : 'OFF DUTY'}
    </button>
  )
}
