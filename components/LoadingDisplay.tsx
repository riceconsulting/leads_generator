import React from 'react';
import { BotIcon } from './icons';

interface LoadingDisplayProps {
  status: string;
  progress: number;
  t: (key: string) => string;
}

const LoadingDisplay: React.FC<LoadingDisplayProps> = ({ status, progress, t }) => {
  const showDeterminate = progress > 0;

  return (
    <div id="loading-display-container" className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-lg flex flex-col items-center justify-center text-center mb-24">
      {/* Swapped bounce for pulse animation, which is more subtle and less distracting */}
      <BotIcon className="h-12 w-12 text-primary-light dark:text-primary-dark animate-pulse" />
      <h3 className="mt-4 text-lg font-heading font-semibold text-text-primary-light dark:text-text-primary-dark">
        {t('aiAtWork')}
      </h3>
      {/* 
        Removed the problematic Typewriter effect.
        Now using a simple paragraph with a key. The key forces a re-render when the status text changes,
        which re-triggers the 'animate-fade-in' animation for a smooth and reliable transition.
      */}
      <p 
        key={status}
        className="mt-1 text-sm text-text-secondary-light dark:text-text-secondary-dark min-h-[2.5rem] flex items-center justify-center animate-fade-in"
      >
        {status || t('initializing')}
      </p>

      {showDeterminate && (
        <p className="text-sm font-semibold text-primary-light dark:text-primary-dark mt-2 animate-fade-in">
            {Math.round(progress)}%
        </p>
      )}

      <div className="w-full bg-border-light dark:bg-border-dark rounded-full h-2.5 mt-4 overflow-hidden">
        {showDeterminate ? (
            <div 
                className="bg-primary-light dark:bg-primary-dark h-2.5 rounded-full transition-all duration-300 ease-linear"
                style={{ width: `${progress}%` }}
            ></div>
        ) : (
            <div 
                className="bg-primary-light dark:bg-primary-dark h-2.5 rounded-full" 
                style={{ 
                    width: '100%',
                    animation: 'progress-indeterminate 2s linear infinite'
                }}>
            </div>
        )}
      </div>
       {/* Cleaned up inline styles, as 'animate-pulse' and 'animate-fade-in' are handled by Tailwind config. */}
      <style>{`
        @keyframes progress-indeterminate {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default LoadingDisplay;
