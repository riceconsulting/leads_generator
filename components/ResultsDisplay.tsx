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
                sampleData={[
                    {
                        label: 'Generated Lead: Warung Makan Berkah',
                        content: `🏢 **Business Information**\n• Company Name: Warung Makan Berkah\n• Address: Jl. Sudirman No. 123, Jakarta Pusat\n• Phone: +62 21 555-0123\n• Website: www.warungberkah.com\n• Email: info@warungberkah.com\n\n📊 **Business Profile**\n• Industry: Restaurant & Food Service\n• Company Size: Small (1-10 employees)\n• Founded: 2018\n• Specialty: Traditional Indonesian cuisine\n\n⭐ **Online Presence**\n• Google Maps Rating: 4.5/5 (128 reviews)\n• Instagram: @warungberkah (2.3K followers)\n\n🎯 **SWOT Analysis**\nStrengths: Strong local reputation, prime location\nWeaknesses: Limited online ordering, minimal digital presence\nOpportunities: Growing delivery demand, social media potential\nThreats: Increasing competition, rising costs\n\n✉️ **Personalized Outreach**\nSubject: Help Warung Berkah Reach More Customers\n\nHi [Owner Name],\n\nI noticed Warung Berkah has excellent reviews on Google Maps (4.5 stars!) but limited online presence. Many similar restaurants in Jakarta have increased their orders by 40% through delivery platform integration.\n\nWould you be open to a quick chat?`
                    }
                ]}
            />
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