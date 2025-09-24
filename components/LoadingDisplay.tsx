import React, { useState, useEffect } from 'react';
import { BotIcon } from './icons';

interface LoadingDisplayProps {
  status: string;
  progress: number;
}

const Typewriter: React.FC<{ text: string }> = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText(''); // Reset when text changes
    let i = 0;
    const intervalId = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(prev => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(intervalId);
      }
    }, 25); // Adjust speed of typing here

    return () => clearInterval(intervalId);
  }, [text]);

  return <span>{displayedText}</span>;
};

const LoadingDisplay: React.FC<LoadingDisplayProps> = ({ status, progress }) => {
  const showDeterminate = progress > 0;

  return (
    <div id="loading-display-container" className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-lg flex flex-col items-center justify-center text-center mb-24">
      <BotIcon className="h-12 w-12 text-primary-light dark:text-primary-dark animate-bounce" />
      <h3 className="mt-4 text-lg font-medium text-text-primary-light dark:text-text-primary-dark">
        AI is at work...
      </h3>
      <p className="mt-1 text-sm text-text-secondary-light dark:text-text-secondary-dark h-10 flex items-center justify-center">
        <Typewriter text={status || 'Initializing process...'} />
      </p>

      {showDeterminate && (
        <p className="text-sm font-semibold text-primary-light dark:text-primary-dark mt-2">
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
      <style>{`
        @keyframes progress-indeterminate {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        @keyframes bounce {
            0%, 100% {
                transform: translateY(-15%);
                animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
            }
            50% {
                transform: translateY(0);
                animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
            }
        }
        .animate-bounce {
            animation: bounce 1s infinite;
        }
      `}</style>
    </div>
  );
};

export default LoadingDisplay;