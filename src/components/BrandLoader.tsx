/** Ladezeichen: Bodenjäger-Logo steht fest, der Ring dreht sich darum. */
export default function BrandLoader({ className = 'h-14 w-14', label = 'Wird geladen' }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-label={label} className={`relative inline-block ${className}`}>
      <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-ash border-t-brand" aria-hidden="true" />
      <svg viewBox="0 0 60.96 60.96" className="absolute inset-[18%] fill-brand" aria-hidden="true">
        <path d="m60.96,30.48c0,16.83-13.65,30.48-30.48,30.48S0,47.31,0,30.48,13.65,0,30.48,0s30.48,13.65,30.48,30.48Zm-29.74,5.06c0,6.95-2.65,8.87-6.88,8.87-1.99,0-3.77-.33-5.16-.79l-1.13,8.14c1.99.66,5.03,1.06,7.34,1.06,9.79,0,15.88-4.43,15.88-17.14V7.48h-10.06v28.06Z" />
      </svg>
    </span>
  );
}
