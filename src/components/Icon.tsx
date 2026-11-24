import type { CSSProperties } from "react";

export function Icon({
  name,
  size = 20,
  style,
}: {
  name: "wave" | "play" | "pause" | "reset" | "arrow" | "check" | "chevron";
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {name === "wave" && <path d="M2 14h4l3-8 5 14 3-10 2 4h3" />}
      {name === "play" && (
        <path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none" />
      )}
      {name === "pause" && (
        <>
          <path d="M8 5v14M16 5v14" strokeWidth="3" />
        </>
      )}
      {name === "reset" && (
        <>
          <path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" />
        </>
      )}
      {name === "arrow" && <path d="m5 16 12-10M7 6h10v10" />}
      {name === "check" && <path d="m5 12 4 4L19 6" />}
      {name === "chevron" && <path d="m9 5 7 7-7 7" />}
    </svg>
  );
}
