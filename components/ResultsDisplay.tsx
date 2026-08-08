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
                title="Sample Output: 5 Leads Generated"
                description="Here's an example of the leads the generator can create for you."
            >
                <div className="space-y-4">
                    {[
                        {
                            name: 'Warung Makan Padang Sederhana',
                            type: 'Restaurant',
                            location: 'Jakarta Selatan',
                            phone: '+62 21 756-4321',
                            rating: '4.6/5 (256 reviews)',
                            swot: { s: 'Famous Padang cuisine', w: 'No delivery app', o: 'GoFood/GrabFood potential', t: 'Many competitors' },
                            outreach: 'Hi Ibu Sari, Warung Sederhana punya reputasi luar biasa dengan 256 review! Banyak warung Padang serupa sudah meningkat order 50% lewat GoFood. Mau coba?'
                        },
                        {
                            name: 'Bengkel Motor Jaya Abadi',
                            type: 'Automotive',
                            location: 'Surabaya',
                            phone: '+62 31 555-7890',
                            rating: '4.3/5 (89 reviews)',
                            swot: { s: 'Trusted since 1998', w: 'No online booking', o: 'Digital service booking', t: 'Authorized dealers nearby' },
                            outreach: 'Pak Budi, bengkel Jaya Abadi sudah dipercaya sejak 1998! Tapi belum ada booking online. Workshop sejenis di Bandung naik 35% setelah ada sistem booking digital.'
                        },
                        {
                            name: 'Toko Elektronik Maju Mandiri',
                            type: 'Retail',
                            location: 'Bandung',
                            phone: '+62 22 444-5678',
                            rating: '4.4/5 (167 reviews)',
                            swot: { s: 'Wide product range', w: 'No e-commerce', o: 'Shopee/Tokopedia expansion', t: 'Online-first retailers' },
                            outreach: 'Halo Pak Andi, Toko Maju Mandiri punya produk lengkap tapi belum online. Toko elektronik di Semarang menambah revenue 40% setelah masuk Shopee.'
                        },
                        {
                            name: 'Klinik Sehat Bersama',
                            type: 'Healthcare',
                            location: 'Yogyakarta',
                            phone: '+62 274 333-1234',
                            rating: '4.7/5 (312 reviews)',
                            swot: { s: 'Excellent patient reviews', w: 'Manual appointment', o: 'Online booking system', t: 'Hospital chains expanding' },
                            outreach: 'Dr. Retno, Klinik Sehat Bersama punya rating 4.7 dari 312 pasien! tapi appointment masih manual. Klinik di Malang naik 30% pasien setelah ada booking online.'
                        },
                        {
                            name: 'Laundry Express Kilat',
                            type: 'Services',
                            location: 'Malang',
                            phone: '+62 341 222-9876',
                            rating: '4.2/5 (78 reviews)',
                            swot: { s: 'Fast turnaround', w: 'No delivery pickup', o: 'On-demand laundry app', t: 'Franchise laundry chains' },
                            outreach: 'Mas Rendi, Laundry Express bisa selesai dalam 3 jam! Tapi belum ada jemput antar. Laundry sejenis di Bali naik 45% order lewat aplikasi on-demand.'
                        }
                    ].map((lead, i) => (
                        <div key={i} className="bg-background-light dark:bg-background-dark rounded-lg p-4 border border-border-light dark:border-border-dark">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded">{lead.type}</span>
                                <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">{lead.location}</span>
                            </div>
                            <h4 className="font-semibold text-sm text-text-primary-light dark:text-text-primary-dark">{lead.name}</h4>
                            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                                <div><span className="text-text-secondary-light dark:text-text-secondary-dark">Phone:</span> {lead.phone}</div>
                                <div><span className="text-text-secondary-light dark:text-text-secondary-dark">Rating:</span> ⭐ {lead.rating}</div>
                            </div>
                            <div className="mt-2 p-2 bg-surface-light dark:bg-surface-dark rounded border border-border-light dark:border-border-dark">
                                <div className="grid grid-cols-2 gap-1 text-xs">
                                    <div><span className="text-green-600 dark:text-green-400">S:</span> {lead.swot.s}</div>
                                    <div><span className="text-red-600 dark:text-red-400">W:</span> {lead.swot.w}</div>
                                    <div><span className="text-blue-600 dark:text-blue-400">O:</span> {lead.swot.o}</div>
                                    <div><span className="text-amber-600 dark:text-amber-400">T:</span> {lead.swot.t}</div>
                                </div>
                            </div>
                            <p className="mt-2 text-xs text-text-secondary-light dark:text-text-secondary-dark italic">{lead.outreach}</p>
                        </div>
                    ))}
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