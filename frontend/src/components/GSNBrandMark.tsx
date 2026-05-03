import React, { useId } from "react";

type GSNBrandMarkProps = {
  width?: number;
  height?: number;
};

export default function GSNBrandMark({
  width = 104,
  height = 126,
}: GSNBrandMarkProps) {
  const id = useId().replace(/:/g, "");
  const shieldFillId = `${id}-shield-fill`;
  const shieldBorderGlowId = `${id}-shield-border-glow`;
  const gsnCastFillId = `${id}-gsn-cast-fill`;
  const starReliefFillId = `${id}-star-relief-fill`;
  const starPulseGlowId = `${id}-star-pulse-glow`;
  const shieldSweepId = `${id}-shield-sweep`;
  const softGlowId = `${id}-soft-glow`;
  const gsnCastShadowId = `${id}-gsn-cast-shadow`;
  const starReliefShadowId = `${id}-star-relief-shadow`;
  const starInnerSparkId = `${id}-star-inner-spark`;

  return (
    <svg
      width={width}
      height={height}
      viewBox="250 140 400 960"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={shieldFillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#081E63" />
          <stop offset="38%" stopColor="#0B349B" />
          <stop offset="72%" stopColor="#0F5FC4" />
          <stop offset="100%" stopColor="#1282D2" />
        </linearGradient>
        <linearGradient id={shieldBorderGlowId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F6D47B" />
          <stop offset="52%" stopColor="#E8B24E" />
          <stop offset="100%" stopColor="#C8822A" />
        </linearGradient>
        <linearGradient id={gsnCastFillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="36%" stopColor="#F2F7FD" />
          <stop offset="68%" stopColor="#D6E4F3" />
          <stop offset="100%" stopColor="#ACC2DB" />
        </linearGradient>
        <linearGradient id={starReliefFillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF4C8" />
          <stop offset="48%" stopColor="#F2CB67" />
          <stop offset="100%" stopColor="#D99630" />
        </linearGradient>
        <radialGradient id={starPulseGlowId} cx="50%" cy="45%" r="62%">
          <stop offset="0%" stopColor="rgba(255,244,184,0.96)" />
          <stop offset="38%" stopColor="rgba(246,208,104,0.54)" />
          <stop offset="100%" stopColor="rgba(246,208,104,0)" />
        </radialGradient>
        <linearGradient id={shieldSweepId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <filter id={softGlowId} x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="10" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0.07 0 0 0 0 0.29 0 0 0 0 0.60 0 0 0 0.42 0"
            result="tint"
          />
          <feMerge>
            <feMergeNode in="tint" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={gsnCastShadowId} x="-120%" y="-120%" width="340%" height="340%">
          <feOffset dx="0" dy="8" result="offset" />
          <feGaussianBlur in="offset" stdDeviation="8" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0.02 0 0 0 0 0.07 0 0 0 0 0.18 0 0 0 0.75 0"
            result="shadow"
          />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={starReliefShadowId} x="-180%" y="-180%" width="420%" height="420%">
          <feOffset dx="0" dy="5" result="offset" />
          <feGaussianBlur in="offset" stdDeviation="4.5" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0.14 0 0 0 0 0.08 0 0 0 0 0.02 0 0 0 0.40 0"
            result="shadow"
          />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={starInnerSparkId} x="-180%" y="-180%" width="420%" height="420%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g transform="translate(0,10)">
        <path
          d="
            M450 170
            L612 255
            L612 626
            C612 814 556 954 450 1082
            C344 954 288 814 288 626
            L288 255
            Z
          "
          fill={`url(#${shieldFillId})`}
          stroke={`url(#${shieldBorderGlowId})`}
          strokeWidth="10"
          filter={`url(#${softGlowId})`}
        />

        <path
          d="
            M450 198
            L586 270
            L586 613
            C586 775 538 898 450 1008
            C362 898 314 775 314 613
            L314 270
            Z
          "
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="4"
        />
        <path
          d="
            M450 222
            L566 283
            L566 602
            C566 747 525 857 450 952
            C375 857 334 747 334 602
            L334 283
            Z
          "
          fill="none"
          stroke="rgba(228,240,255,0.20)"
          strokeWidth="2.5"
        />
        <path
          d="
            M450 242
            L548 294
            L548 590
            C548 724 511 827 450 907
            C389 827 352 724 352 590
            L352 294
            Z
          "
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="1.6"
        />
        <path
          d="
            M450 198
            L586 270
            L586 613
            C586 775 538 898 450 1008
            C362 898 314 775 314 613
            L314 270
            Z
          "
          fill={`url(#${shieldSweepId})`}
          opacity="0.72"
        >
          <animateTransform
            attributeName="transform"
            type="translate"
            values="-38 0;38 0;-38 0"
            dur="5.2s"
            repeatCount="indefinite"
          />
        </path>

        <g>
          <text
            x="452"
            y="336"
            textAnchor="middle"
            fill="rgba(6,22,56,0.72)"
            fontSize="48"
            fontWeight="900"
            letterSpacing="6"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            GSN
          </text>
          <text
            x="450"
            y="328"
            textAnchor="middle"
            fill={`url(#${gsnCastFillId})`}
            stroke="rgba(255,255,255,0.50)"
            strokeWidth="1.1"
            filter={`url(#${gsnCastShadowId})`}
            fontSize="48"
            fontWeight="900"
            letterSpacing="6"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            GSN
          </text>

          <g>
            <ellipse
              cx="450"
              cy="418"
              rx="56"
              ry="56"
              fill={`url(#${starPulseGlowId})`}
              opacity="0.72"
            >
              <animate
                attributeName="opacity"
                values="0.42;0.82;0.42"
                dur="2.8s"
                repeatCount="indefinite"
              />
            </ellipse>

            <polygon
              points="
                450,362
                464,404
                508,404
                472,430
                486,472
                450,446
                414,472
                428,430
                392,404
                436,404
              "
              fill={`url(#${starReliefFillId})`}
              stroke="rgba(255,247,217,0.76)"
              strokeWidth="1.2"
              filter={`url(#${starReliefShadowId})`}
            >
              <animateTransform
                attributeName="transform"
                type="scale"
                values="1 1;1.03 1.03;1 1"
                dur="2.8s"
                repeatCount="indefinite"
                additive="sum"
                origin="450 418"
              />
            </polygon>

            <polygon
              points="
                450,372
                461,402
                493,403
                467,421
                476,452
                450,434
                424,452
                433,421
                407,403
                439,402
              "
              fill="rgba(255,252,232,0.70)"
              opacity="0.82"
              filter={`url(#${starInnerSparkId})`}
            />
          </g>
        </g>
      </g>
    </svg>
  );
}
