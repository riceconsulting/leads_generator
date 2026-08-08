import React from 'react';
import { BusinessLead } from '../types';
import LeadCard from './LeadCard';
import { AlertTriangleIcon, InfoIcon, SaveIcon } from './icons';
import LoadingDisplay from './LoadingDisplay';
import SampleOutput from './SampleOutput';

interface ResultsDisplayProps {
  isLoading: boolean;
  error: string | null;
  leads: BusinessLead[];
  savedLeadIds: string[];
  generationStatus: string;
  generationProgress: number;
  t: (key: string) => string;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ 
    isLoading, 
    error, 
    leads, 
    savedLeadIds, 
    generationStatus,
    generationProgress,
    t
}) => {
  if (isLoading) {
    return <LoadingDisplay status={generationStatus} progress={generationProgress} t={t} />;
  }

  if (error) {
    return (
      <div className="bg-error-light dark:bg-error-dark border border-error-light dark:border-error-dark text-error-light dark:text-error-dark px-4 py-3 rounded-lg relative mb-24" role="alert">
        <strong className="font-bold flex items-center">
            <AlertTriangleIcon className="h-5 w-5 mr-2" />
            {t('error')}
        </strong>
        <span className="block sm:inline ml-7">{error}</span>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center py-10 px-6 bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg mb-24 gap-6">
            <div className="text-center">
                <InfoIcon className="mx-auto h-12 w-12 text-text-secondary-dark" />
                <h3 className="mt-2 text-lg font-medium text-text-primary-light dark:text-text-primary-dark">{t('readyToStart')}</h3>
                <p className="mt-1 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                    {t('readyToStartDescription')}
                </p>
            </div>
            <SampleOutput
                title="Sample Output: Lead Generation"
                description="Here's an example of the leads the generator can create for you."
            >
                <div className="bg-background-light dark:bg-background-dark rounded-lg p-4 border border-border-light dark:border-border-dark">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded">Restaurant</span>
                        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Jakarta, Indonesia</span>
                    </div>
                    <h4 className="font-semibold text-text-primary-light dark:text-text-primary-dark">Warung Makan Berkah</h4>
                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">Jl. Sudirman No. 123, Jakarta Pusat</p>
                    
                    <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                        <div>
                            <p className="text-text-secondary-light dark:text-text-secondary-dark text-xs">Phone</p>
                            <p className="text-text-primary-light dark:text-text-primary-dark">+62 21 555-0123</p>
                        </div>
                        <div>
                            <p className="text-text-secondary-light dark:text-text-secondary-dark text-xs">Rating</p>
                            <p className="text-text-primary-light dark:text-text-primary-dark">⭐ 4.5/5 (128 reviews)</p>
                        </div>
                    </div>
                    
                    <div className="mt-3 p-2 bg-surface-light dark:bg-surface-dark rounded border border-border-light dark:border-border-dark">
                        <p className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">SWOT Analysis</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-green-600 dark:text-green-400">S:</span> Strong local reputation</div>
                            <div><span className="text-red-600 dark:text-red-400">W:</span> Limited online ordering</div>
                            <div><span className="text-blue-600 dark:text-blue-400">O:</span> Growing delivery demand</div>
                            <div><span className="text-amber-600 dark:text-amber-400">T:</span> Increasing competition</div>
                        </div>
                    </div>
                    
                    <div className="mt-3 p-2 bg-primary-light/10 dark:bg-primary-dark/10 rounded border border-primary-light/20 dark:border-primary-dark/20">
                        <p className="text-xs font-medium text-primary-light dark:text-primary-dark mb-1">✉️ Outreach Message</p>
                        <p className="text-xs text-text-primary-light dark:text-text-primary-dark">Hi [Owner Name], I noticed Warung Berkah has excellent reviews but limited online presence. Many similar restaurants have increased orders by 40% through delivery platform integration. Would you be open to a quick chat?</p>
                    </div>
                </div>
            </SampleOutput>
        </div>
    );
  }

  return (
    <div className="space-y-6 mb-24">
      <div id="results-display-container" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark">{t('generatedLeads')}</h3>
      </div>
      {leads.map((lead) => {
        const leadId = lead.id || `${lead.businessName}-${lead.officialWebsite}`;
        return (
          <LeadCard 
            key={leadId} 
            lead={lead} 
            isSaved={savedLeadIds.includes(leadId)}
            t={t}
          />
        )
      })}
    </div>
  );
};

export default ResultsDisplay;