export function PolarisLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M24 3 30.5 17.5 45 24 30.5 30.5 24 45 17.5 30.5 3 24 17.5 17.5Z"
        fill="currentColor"
      />
      <path
        d="M24 24 30.5 17.5 45 24 30.5 30.5Z"
        className="fill-sidebar"
        opacity="0.25"
      />
      <path
        d="M24 24 30.5 30.5 24 45 17.5 30.5Z"
        className="fill-sidebar"
        opacity="0.5"
      />
      <path
        d="M24 24 17.5 30.5 3 24 17.5 17.5Z"
        className="fill-sidebar"
        opacity="0.15"
      />
    </svg>
  );
}
