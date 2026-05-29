import React from 'react';

interface BiofarmLogoProps {
  className?: string;
  variant?: 'full' | 'badge' | 'light';
  height?: number;
}

export const BiofarmLogo: React.FC<BiofarmLogoProps> = ({
  className = '',
  variant = 'full',
  height = 40,
}) => {
  const primaryColor = variant === 'light' ? '#FFFFFF' : '#002654';

  // Core Vector Paths for the bespoke "BIOFARM" typographic character system
  // Conforms exactly to the design assets with geometric 45-degree top-left chamfers and integrated B-F monogram.
  const pathB = "M 0,24 L 24,0 H 55 C 76,0 82,10 82,24 C 82,36 74,46 55,48 C 74,50 82,60 82,76 C 82,90 76,100 45,100 H 28 V 62 H 46 V 50 H 28 V 37 H 55 V 25 H 14 V 100 H 0 Z";
  const pathI = "M 0,20 L 20,0 H 20 V 100 H 0 Z";
  const pathO_outer = "M 42,0 C 65,0 84,22 84,50 C 84,78 65,100 42,100 C 19,100 0,78 0,50 C 0,22 19,0 42,0 Z";
  const pathO_inner = "M 42,21 C 29,21 21,34 21,50 C 21,66 29,79 42,79 C 55,79 63,66 63,50 C 63,34 55,21 42,21 Z";
  const pathF = "M 0,24 L 24,0 H 76 V 12 H 16 V 50 H 60 V 62 H 16 V 100 H 16 L 0,84 Z";
  const pathA_outer = "M 16,100 L 0,84 L 38,0 H 54 L 84,100 H 68 L 58,60 H 26 L 16,100 Z";
  const pathA_inner = "M 30,48 H 54 L 42,16 Z";
  const pathR_outer = "M 0,24 L 24,0 H 50 C 72,0 78,10 78,24 C 78,38 70,48 48,48 L 74,100 H 58 L 36,48 H 16 V 100 H 0 Z";
  const pathR_inner = "M 16,12 H 44 C 52,12 54,16 54,24 C 54,32 52,36 44,36 H 16 Z";
  const pathM = "M 0,24 L 24,0 H 32 L 46,55 L 60,16 L 76,0 H 92 V 100 H 76 V 32 L 46,75 L 16,32 V 100 H 0 Z";

  if (variant === 'badge') {
    return (
      <svg
        viewBox="0 0 120 120"
        style={{ height: `${height}px`, width: `${height}px` }}
        className={`inline-block select-none ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Irregular heptagon container matched exactly to the brand's unique vector geometry */}
        <polygon
          points="45,12 88,8 114,48 98,92 60,114 18,95 10,48"
          fill="#002654"
          stroke="#002654"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        
        {/* Centered B-F monogram inside badge */}
        <g transform="translate(37, 26) scale(0.61)" fill="#FFFFFF" fillRule="evenodd">
          <path d={pathB} />
        </g>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 920 120"
      style={{ height: `${height}px`, aspectRatio: '920/120' }}
      className={`inline-block select-none max-w-full h-auto ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 1. Shield Symbol Badge */}
      <g>
        <polygon
          points="45,12 88,8 114,48 98,92 60,114 18,95 10,48"
          fill={variant === 'light' ? 'rgba(255, 255, 255, 0.12)' : '#002654'}
          stroke={variant === 'light' ? '#ffffff' : '#002654'}
          strokeWidth="6"
          strokeLinejoin="round"
        />
        
        {/* Symmetrical B-F monogram inside badge of full logo */}
        <g transform="translate(37, 26) scale(0.61)" fill="#FFFFFF" fillRule="evenodd">
          <path d={pathB} />
        </g>
      </g>

      {/* 2. Brand Wordmark letters: B I O F A R M with generous spacing (tracking) and extreme fidelity */}
      <g transform="translate(135, 12) scale(0.92)" fill={primaryColor} fillRule="evenodd">
        {/* B */}
        <g transform="translate(0, 0)">
          <path d={pathB} />
        </g>

        {/* I */}
        <g transform="translate(112, 0)">
          <path d={pathI} />
        </g>

        {/* O */}
        <g transform="translate(156, 0)">
          <path d={pathO_outer} />
          <path d={pathO_inner} />
        </g>

        {/* F */}
        <g transform="translate(268, 0)">
          <path d={pathF} />
        </g>

        {/* A */}
        <g transform="translate(372, 0)">
          <path d={pathA_outer} />
          <path d={pathA_inner} />
        </g>

        {/* R */}
        <g transform="translate(488, 0)">
          <path d={pathR_outer} />
          <path d={pathR_inner} />
        </g>

        {/* M */}
        <g transform="translate(598, 0)">
          <path d={pathM} />
        </g>
      </g>
    </svg>
  );
};
