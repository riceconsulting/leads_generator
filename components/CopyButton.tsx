
import React, { useState } from 'react';
import { ClipboardIcon, CheckIcon } from './icons';

interface CopyButtonProps {
  textToCopy: string;
  t: (key: string) => string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy, t }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    }).catch(err => {
        console.error("Failed to copy text: ", err);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center transition-colors duration-200 ${
        copied
          ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200'
          : 'bg-border-light text-text-secondary-light hover:brightness-95 dark:bg-border-dark dark:text-text-secondary-dark dark:hover:brightness-110'
      }`}
    >
      {copied ? (
        <>
          <CheckIcon className="h-4 w-4 mr-1.5" />
          {t('copied')}
        </>
      ) : (
        <>
          <ClipboardIcon className="h-4 w-4 mr-1.5" />
          {t('copy')}
        </>
      )}
    </button>
  );
};

export default CopyButton;
