import React from 'react';

function Progress({
  value = 0,
  max = 100,
  className = '',
  showValue = false,
}) {
  const percentage = Math.min(
    100,
    Math.max(
      0,
      (Number(value) / Number(max)) * 100
    )
  );

  return (
    <div className={`w-full ${className}`}>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-teal-500 transition-all duration-500"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      {showValue && (
        <div className="mt-1 text-right text-xs text-slate-500">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
}

export default Progress;