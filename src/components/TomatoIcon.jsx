export function TomatoIcon({ size = 16, className = "", title, ...props }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={title ? undefined : "true"}
      role={title ? "img" : undefined}
      {...props}
    >
      {title && <title>{title}</title>}
      <path
        d="M9.6 5.75c.62-1.28 1.4-2.18 2.4-2.75.98.57 1.77 1.47 2.4 2.75"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 5.65c1.08-1.05 2.23-1.58 3.45-1.58.42 1.17.3 2.33-.37 3.48"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 5.65c-1.08-1.05-2.23-1.58-3.45-1.58-.42 1.17-.3 2.33.37 3.48"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.1 13.05c0-3.55 2.5-6.15 6.9-6.15s6.9 2.6 6.9 6.15c0 4.05-2.8 7.1-6.9 7.1s-6.9-3.05-6.9-7.1Z"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
