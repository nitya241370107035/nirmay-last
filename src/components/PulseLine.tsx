import React from 'react';

interface PulseLineProps {
  className?: string;
  width?: number | string;
  color?: string;
  animated?: boolean;
}

export const PulseLine: React.FC<PulseLineProps> = ({
  className = '',
  width = 120,
  color = '#2E7D73',
  animated = true,
}) => {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg
        width={width}
        height="20"
        viewBox="0 0 120 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <path
          d="M0 10 L40 10 L46 3 L52 17 L58 4 L64 14 L70 10 L120 10"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animated ? 'animate-pulse-line' : ''}
        />
      </svg>
    </div>
  );
};
