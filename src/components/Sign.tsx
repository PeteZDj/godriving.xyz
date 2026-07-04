import { RoadSign } from '../data/signs';

export function Sign({ sign, className = '' }: { sign: RoadSign; className?: string }) {
  return (
    <div
      className={`select-none ${className}`}
      aria-label={sign.name}
      dangerouslySetInnerHTML={{ __html: sign.svg }}
    />
  );
}
