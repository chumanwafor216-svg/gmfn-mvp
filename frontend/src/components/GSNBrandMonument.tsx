import React, { useId } from "react";

type GSNBrandMonumentProps = {
  width?: number;
  height?: number;
};

export default function GSNBrandMonument({
  width = 260,
  height = 430,
}: GSNBrandMonumentProps) {
  const id = useId().replace(/:/g, "");
  const shieldFillId = `${id}-shield-fill`;
  const shieldBorderGlowId = `${id}-shield-border-glow`;
  const gsnCastFillId = `${id}-gsn-cast-fill`;
  const starReliefFillId = `${id}-star-relief-fill`;
  const starPulseGlowId = `${id}-star-pulse-glow`;
  const shieldSweepId = `${id}-shield-sweep`;
  const diamondLiftFillId = `${id}-diamond-lift-fill`;
  const softGlowId = `${id}-soft-glow`;
  const gsnCastShadowId = `${id}-gsn-cast-shadow`;
  const starReliefShadowId = `${id}-star-relief-shadow`;
  const starInnerSparkId = `${id}-star-inner-spark`;
  const diamondLiftShadowId = `${id}-diamond-lift-shadow`;

  return (
    <svg
      width={width}
      height={height}
      viewBox="100 150 700 1160"
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
        <linearGradient id={diamondLiftFillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#F5FBFF" />
          <stop offset="100%" stopColor="#DDEBFA" />
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
        <filter id={diamondLiftShadowId} x="-160%" y="-220%" width="420%" height="520%">
          <feOffset dx="0" dy="6" result="offset" />
          <feGaussianBlur in="offset" stdDeviation="6" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0.02 0 0 0 0 0.08 0 0 0 0 0.16 0 0 0 0.34 0"
            result="shadow"
          />
          <feMerge>
            <feMergeNode in="shadow" />
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
        <path
          d="
            M450 268
            L545 785
            L450 948
            L355 785
            Z
          "
          fill="rgba(14,43,118,0.18)"
        />

        <g stroke="#F7FBFF" strokeWidth="6" fill="none" strokeLinecap="round">
          <path d="M450 425 L565 565" />
          <path d="M450 425 L360 632" />
          <path d="M450 425 L450 724" />
          <path d="M360 632 L384 815" />
          <path d="M384 815 L542 796" />
          <path d="M542 796 L565 565" />
          <path d="M450 724 L565 565" />
          <path d="M450 724 L542 796" />
          <path d="M450 724 L384 815" />
          <path d="M360 632 L565 565" />
        </g>

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

          <circle cx="565" cy="565" r="15" fill="#F4F7FA" />
          <circle cx="360" cy="632" r="15" fill="#F4F7FA" />
          <circle cx="384" cy="815" r="15" fill="#F4F7FA" />
          <circle cx="542" cy="796" r="15" fill="#F4F7FA" />
        </g>
      </g>

      <g transform="translate(120,1048)">
        <path
          d="
            M214 18
            L252 -8
            H408
            L446 18
            Z
          "
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(228,240,255,0.10)"
          strokeWidth="1.2"
        />
        <rect
          x="0"
          y="0"
          width="660"
          height="246"
          rx="32"
          fill="rgba(5,19,45,0.54)"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="2"
        />
        <rect
          x="24"
          y="22"
          width="612"
          height="202"
          rx="24"
          fill="rgba(255,255,255,0.03)"
          stroke="rgba(244,199,90,0.18)"
          strokeWidth="1.5"
        />
        <rect
          x="40"
          y="36"
          width="580"
          height="174"
          rx="18"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
          strokeDasharray="2 8"
        />
        <rect
          x="52"
          y="40"
          width="556"
          height="3"
          rx="1.5"
          fill={`url(#${shieldBorderGlowId})`}
        />
        <text
          x="330"
          y="82"
          textAnchor="middle"
          fill="#F3D06A"
          fontSize="22"
          fontWeight="800"
          letterSpacing="5.2"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          TRUST INFRASTRUCTURE PROTOCOL
        </text>
        <text
          x="330"
          y="136"
          textAnchor="middle"
          fill="#F6F8FC"
          fontSize="36"
          fontWeight="700"
          letterSpacing="1.6"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          Global Support Network
        </text>
        <text
          x="330"
          y="180"
          textAnchor="middle"
          fill="#DCEBFF"
          fontSize="24"
          fontWeight="500"
          letterSpacing="0.4"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          Trust made visible for stronger communities.
        </text>
        <text
          x="330"
          y="206"
          textAnchor="middle"
          fill="rgba(233,241,252,0.56)"
          fontSize="14"
          fontWeight="700"
          letterSpacing="3.6"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          TRUSTED COMMUNITY ENTRY
        </text>
        <path
          d="
            M286 -6
            L330 -52
            L374 -6
            L330 38
            Z
          "
          fill={`url(#${diamondLiftFillId})`}
          stroke="rgba(236,245,255,0.98)"
          strokeWidth="1.8"
          filter={`url(#${diamondLiftShadowId})`}
        />
      </g>
    </svg>
  );
}
