import React from "react";

type GsnMicrophoneIconProps = {
  size?: number;
};

export default function GsnMicrophoneIcon({
  size = 22,
}: GsnMicrophoneIconProps) {
  const gradientId = React.useId();

  return (
    <svg
      aria-hidden="true"
      data-gsn-microphone-icon="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="7" y1="3" x2="17" y2="20">
          <stop stopColor="#FFF4BF" />
          <stop offset="0.45" stopColor="#D6AA45" />
          <stop offset="1" stopColor="#8A6519" />
        </linearGradient>
      </defs>
      <rect
        x="8.25"
        y="2.25"
        width="7.5"
        height="12.5"
        rx="3.75"
        fill={`url(#${gradientId})`}
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M5.75 11.25v.75a6.25 6.25 0 0 0 12.5 0v-.75M12 18.25v3M8.75 21.25h6.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
