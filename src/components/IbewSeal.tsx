import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

const IBEW_LOGO_URL =
  '/assets/aistudio/International_Brotherhood_of_Electrical_Workers_logo_ba4bba9a.png';

interface IbewSealProps {
  className?: string;
}

export function IbewSeal({ className = 'w-9 h-9' }: IbewSealProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <span
        className={`${className} inline-flex items-center justify-center rounded-full bg-blue-950 text-amber-300 border border-amber-500/40 shrink-0`}
        aria-label="IBEW Local Union 84 emblem"
      >
        <ShieldCheck className="w-1/2 h-1/2" aria-hidden="true" />
      </span>
    );
  }

  return (
    <img
      src={IBEW_LOGO_URL}
      alt="International Brotherhood of Electrical Workers seal"
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`${className} object-contain shrink-0 select-none`}
    />
  );
}
