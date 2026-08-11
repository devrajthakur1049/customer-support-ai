export default function EscalationBanner({ reason }) {
  return (
    <div className="bg-amber-50 border border-amber-300 text-amber-800 text-sm rounded px-3 py-2 mb-3">
      <p className="font-medium">This conversation has been escalated to a human agent.</p>
      {reason && <p className="mt-1 text-amber-700">{reason}</p>}
    </div>
  );
}
