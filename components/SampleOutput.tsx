import React, { useState } from 'react';

interface SampleOutputProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const SampleOutput: React.FC<SampleOutputProps> = ({ title, description, children }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-surface-light dark:bg-surface-dark/50 rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-accent-light/10 dark:bg-accent-dark/10 hover:bg-accent-light/20 dark:hover:bg-accent-dark/20 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <span className="text-accent-light dark:text-accent-dark text-lg">✨</span>
          <span className="font-medium text-text-primary-light dark:text-text-primary-dark">
            {title}
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-text-secondary-light dark:text-text-secondary-dark transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="p-4 border-t border-border-light dark:border-border-dark">
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
            {description}
          </p>
          
          {children}
          
          <p className="mt-4 text-xs text-text-secondary-light dark:text-text-secondary-dark italic">
            This is a sample output. Try the generator above to create your own!
          </p>
        </div>
      )}
    </div>
  );
};

export default SampleOutput;
