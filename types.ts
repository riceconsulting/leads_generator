
export interface AuditLogEntry extends LeadGenerationParams {
  id: number;
  timestamp: string;
  generatedLeadsCount: number;
}

export interface LeadGenerationParams {
  location: string;
  keywords: string;
  count: number;
  excludedBusinesses?: string[];
  companyGrowthStage?: string;
  language: string;
  customResearch?: string;
  customResearchFocus?: string;
  senderName: string;
  senderTitle: string;
  itCompanyName: string;
  itCompanyWebsite: string;
  itCompanyPhone: string;
  itCompanyEmail: string;
  emailTemplate?: string;
  whatsappTemplate?: string;
}

export interface DraftMessage {
  language: string;
  tone: string;
  subject?: string; // Optional for WhatsApp
  body: string;
}

export interface ContactPerson {
  name: string;
  title: string;
}

export interface BusinessLead {
  id?: string; // Unique identifier for DB
  businessName: string;
  officialWebsite: string;
  contactEmail: string[];
  contactPhone: string[];
  contactWhatsApp?: string;
  contactPerson?: ContactPerson;
  companyDescription: string;
  estimatedEmployeeCount: string;
  inferredPrimaryLanguage: string;
  companySizeCategory: string; // Simplified for AI flexibility
  keyStrengthsIT: string[];
  keyWeaknessesIT: string[];
  customResearchResults?: string;
  customResearchFocus?: string;
  draftEmail: DraftMessage;
  draftWhatsApp: DraftMessage;
}

export interface LeadCardProps {
  lead: BusinessLead;
  onSave: (lead: BusinessLead) => void;
  isSaved: boolean;
}