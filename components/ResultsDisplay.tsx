import React from 'react';
import { BusinessLead } from '../types';
import LeadCard from './LeadCard';
import { AlertTriangleIcon, InfoIcon, SaveIcon } from './icons';
import LoadingDisplay from './LoadingDisplay';

interface ResultsDisplayProps {
  isLoading: boolean;
  error: string | null;
  leads: BusinessLead[];
  savedLeadIds: string[];
  isTutorialActive?: boolean;
  isTutorialLoading?: boolean;
  generationStatus: string;
  generationProgress: number;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ 
    isLoading, 
    error, 
    leads, 
    savedLeadIds, 
    isTutorialActive, 
    isTutorialLoading,
    generationStatus,
    generationProgress
}) => {
  if (isLoading || isTutorialLoading) {
    const status = isTutorialLoading ? 'Generating a sample lead...' : generationStatus;
    const progress = isTutorialLoading ? 0 : generationProgress;
    return <LoadingDisplay status={status} progress={progress} />;
  }

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-24" role="alert">
        <strong className="font-bold flex items-center">
            <AlertTriangleIcon className="h-5 w-5 mr-2" />
            Error
        </strong>
        <span className="block sm:inline ml-7">{error}</span>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
        <div className="text-center py-10 px-6 bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg mb-24">
            <InfoIcon className="mx-auto h-12 w-12 text-text-secondary-dark" />
            <h3 className="mt-2 text-lg font-medium text-text-primary-light dark:text-text-primary-dark">Ready to Start</h3>
            <p className="mt-1 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                Fill out the form above to generate your first set of leads.
            </p>
        </div>
    );
  }

  return (
    <div className="space-y-6 mb-24">
      <div id="results-display-container" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark">Generated Leads</h3>
      </div>
      {leads.map((lead) => {
        const leadId = lead.id || `${lead.businessName}-${lead.officialWebsite}`;
        return (
          <LeadCard 
            key={leadId} 
            lead={lead} 
            isSaved={savedLeadIds.includes(leadId)}
            isTutorialCard={isTutorialActive} // Pass the flag down to LeadCard
          />
        )
      })}
    </div>
  );
};

export default ResultsDisplay;