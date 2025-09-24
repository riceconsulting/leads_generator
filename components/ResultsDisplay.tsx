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
  onSaveLead: (lead: BusinessLead) => void;
  onSaveAllLeads: (leads: BusinessLead[]) => void;
  isTutorialActive?: boolean;
  isTutorialLoading?: boolean;
  generationStatus: string;
  generationProgress: number;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ 
    isLoading, 
    error, 
    leads, 
    onSaveLead, 
    savedLeadIds, 
    onSaveAllLeads, 
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

  const unsavedLeads = leads.filter(lead => {
    const leadId = lead.id || `${lead.businessName}-${lead.officialWebsite}`;
    return !savedLeadIds.includes(leadId);
  });
  const unsavedLeadsCount = unsavedLeads.length;

  return (
    <div className="space-y-6 mb-24">
      <div id="results-display-container" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">Generated Leads</h3>
        {/* Hide Save All button during tutorial */}
        {!isTutorialActive && leads.length > 0 && (
            <button
                // The duplicate ID has been removed from here
                onClick={() => onSaveAllLeads(unsavedLeads)}
                disabled={unsavedLeadsCount === 0}
                className="px-4 py-2 text-sm font-medium rounded-md flex items-center transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 bg-primary-light hover:brightness-95 dark:bg-primary-dark dark:hover:brightness-95 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light dark:focus:ring-offset-surface-dark dark:focus:ring-primary-dark"
            >
                <SaveIcon className="h-4 w-4 mr-2" />
                {unsavedLeadsCount > 0 ? `Save All (${unsavedLeadsCount})` : 'All Saved'}
            </button>
        )}
      </div>
      {leads.map((lead, index) => {
        const leadId = lead.id || `${lead.businessName}-${lead.officialWebsite}`;
        return (
          <LeadCard 
            key={leadId} 
            lead={lead} 
            onSave={onSaveLead}
            isSaved={savedLeadIds.includes(leadId)}
            isTutorialCard={isTutorialActive} // Pass the flag down to LeadCard
          />
        )
      })}
    </div>
  );
};

export default ResultsDisplay;