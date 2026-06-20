import { BadgeCheck } from 'lucide-react';

export default function VerifiedBadge({ size = 16, showLabel = false }) {
  return (
    <span
      className="inline-flex items-center gap-1 shrink-0"
      title="Verified Service Provider"
    >
      <BadgeCheck size={size} className="text-green-400" fill="rgba(74,222,128,0.15)" />
      {showLabel && (
        <span className="text-xs font-semibold text-green-400">Verified</span>
      )}
    </span>
  );
}