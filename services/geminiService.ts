import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { BusinessLead, LeadGenerationParams } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Custom error for issues originating from the AI service itself,
 * such as server errors, resource exhaustion, or unavailability.
 */
class AIServiceError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AIServiceError';
    }
}


/**
 * A utility function to parse JSON from the model's text response,
 * cleaning markdown code fences if they exist and handling empty responses.
 * This version is more robust and can find JSON within a larger text block.
 */
const parseJsonResponse = (text: string): any => {
    if (!text) {
        console.error("AI returned an empty response, cannot parse JSON.");
        return {};
    }

    // Attempt to find a JSON code block first. This is the most reliable method.
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
        try {
            return JSON.parse(codeBlockMatch[1]);
        } catch (e) {
            console.error("Failed to parse JSON from code block:", codeBlockMatch[1]);
            // Fall through if parsing fails, in case there's other JSON in the text
        }
    }

    // If no code block or it failed to parse, look for the first '{' and last '}'
    // as a fallback. This is less reliable but can catch cases where the model
    // forgets the markdown fences.
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        const jsonText = text.substring(firstBrace, lastBrace + 1);
        try {
            return JSON.parse(jsonText);
        } catch (e) {
            console.error("Failed to parse extracted JSON object from text:", jsonText);
            // Fall through to final error
        }
    }
    
    // If all attempts fail, throw an error.
    console.error("Could not find or parse any JSON in the response:", text);
    throw new Error("The AI returned a response in an invalid format.");
};

/**
 * Wraps the generateContent call with a retry mechanism for transient errors.
 */
const generateContentWithRetry = async (
  request: any, // Using any as GenerateContentParameters is not exported
  retries = 3, 
  delay = 1000
): Promise<GenerateContentResponse> => {
    try {
        return await ai.models.generateContent(request);
    } catch (e: any) {
        const errorMessage = (e.message || '').toLowerCase();
        // Check for common server-side error messages and statuses
        const isServerError =
            errorMessage.includes('500') ||
            errorMessage.includes('internal') ||
            errorMessage.includes('resource exhausted') ||
            errorMessage.includes('server error') ||
            errorMessage.includes('backend error') ||
            e.status === 'UNKNOWN' ||
            e.code === 6;

        if (retries > 0 && isServerError) {
            console.warn(`Request failed with transient error, retrying in ${delay / 1000}s... (${retries} retries left)`);
            await new Promise(res => setTimeout(res, delay));
            return generateContentWithRetry(request, retries - 1, delay * 2); // Exponential backoff
        }
        
        if (isServerError) {
             throw new AIServiceError("There's a problem on our end. The AI service seems to be unavailable or overloaded. Please try again in a few moments.");
        }

        // For other errors (like 4xx client errors), throw immediately
        throw e;
    }
};

/**
 * PROMPT 1: Generates a prompt to find a list of company names.
 */
const createCompanyListPrompt = (params: LeadGenerationParams): string => {
    const { location, keywords, count, excludedBusinesses = [], companyGrowthStage } = params;
    
    const exclusionInstruction = excludedBusinesses.length > 0
        ? `\n- CRITICAL: Exclude these businesses: ${excludedBusinesses.join(', ')}`
        : '';
        
    const sizeFilteringInstruction = (companyGrowthStage && companyGrowthStage !== 'Any')
        ? `\n- Target Company Growth Stage: "${companyGrowthStage}"`
        : '';

    return `
        You are a business research assistant. Your task is to find a list of exactly ${count} company names that match the following criteria.
        - Location: "${location}"
        - Industry Keywords: "${keywords || 'any'}"
        ${sizeFilteringInstruction}
        ${exclusionInstruction}

        Use the Google Search tool to find them.
        Your entire response MUST be a single JSON object with one key, "companyNames", which is an array of strings. Do not include any other text.
        
        Example:
        {
            "companyNames": ["PT Example Corp", "Another Business Ltd", "Surabaya Tech Solutions"]
        }
    `;
};

/**
 * PROMPT 2: Generates a detailed prompt to research a single company.
 */
const createLeadDetailPrompt = (params: LeadGenerationParams, companyName: string): string => {
    const { 
        language, customResearch, senderName, senderTitle, itCompanyName,
        itCompanyWebsite, itCompanyPhone, itCompanyEmail,
        emailTemplate, whatsappTemplate
    } = params;
    
    // If sender/company details are not provided, use placeholders.
    // This ensures the generated messages have a complete-looking signature or template,
    // which the user can then easily identify and fill in.
    const finalSenderName = senderName || '[Your Name]';
    const finalSenderTitle = senderTitle || '[Your Title]';
    const finalItCompanyName = itCompanyName || '[Your Company Name]';
    const finalItCompanyWebsite = itCompanyWebsite || '[yourwebsite.com]';
    const finalItCompanyPhone = itCompanyPhone || '[Your Phone Number]';
    const finalItCompanyEmail = itCompanyEmail || '[your.email@example.com]';

    // --- All of your original, detailed instructions are now fully integrated here ---
    const customResearchInstruction = customResearch
        ? `
**CUSTOM DEEP DIVE RESEARCH**:
In addition to standard information, you MUST perform a deep dive based on the following user request. The findings from this research are critical and should be integrated directly into the 'keyStrengthsIT' or 'keyWeaknessesIT' fields as appropriate. Also provide a summary of the findings in the 'customResearchResults' field.
- Deep Dive Request: "${customResearch}"
` : '';

    const companySizeInstruction = `
**COMPANY SIZE ASSESSMENT LOGIC**:
You must assess the company size and categorize it into one of the following: "Small", "Medium", "Large", or "Enterprise". Use the estimated employee count as the primary factor for your assessment:
- **Small**: 1-50 employees.
- **Medium**: 51-500 employees.
- **Large**: 501-5000 employees.
- **Enterprise**: 5001+ employees.
You must use your best judgment to apply these labels. If the user specified a target growth stage, you MUST only find companies that fit that stage.
`;

    const emailTemplateInstruction = emailTemplate
        ? `
* **Email Generation (User Template)**:
    * You MUST use the user-provided template below.
    * Replace placeholders like {{businessName}}, {{contactPerson.name}}, and {{keyWeaknessesIT[0]}} (use the first weakness). If a placeholder value isn't found, use a generic alternative (e.g., "your company" for {{businessName}}).
    * The email body must end with the full sender signature.
    * **Template**: "${emailTemplate}"
`
        : `
* **Email Generation (Default)**:
    * Address the email to the \\\`contactPerson\\\` if found. Otherwise, use a general greeting.
    * **CRITICAL LOGIC**: First, check the 'keyWeaknessesIT' list. If you found one or more weaknesses, your email MUST reference the most significant weakness as a talking point to demonstrate your research.
    * **If AND ONLY IF the 'keyWeaknessesIT' list is empty**, then generate a more general but still personalized introduction. Mention the company by name, introduce our services briefly, and offer a 'free, no-obligation IT assessment' to explore potential areas for improvement.
    * The email body must end with the full sender signature.
`;

    const whatsappTemplateInstruction = whatsappTemplate
        ? `
* **WhatsApp Message Generation (User Template)**:
    * You MUST use the user-provided template below. It must be very short and conversational.
    * Replace placeholders like {{businessName}}, {{contactPerson.name}}, and {{keyWeaknessesIT[0]}}.
    * Do NOT use a formal signature.
    * **Template**: "${whatsappTemplate}"
`
        : `
* **WhatsApp Message Generation (Default)**:
    * **CRITICAL**: The WhatsApp message MUST be very short, conversational, and friendly. Do NOT use a formal email structure or signature block.
    * **Template**: \\\`[Greeting] [Contact Name], saya [Sender Name] dari [IT Company Name]. Saya lihat [mention a specific IT weakness found]. Tertarik untuk diskusi singkat tentang ini? Terima kasih.\\\`
    * **Example (Bahasa)**: \\\`Halo Pak Budi, saya Harris dari RICE AI Consulting. Saya lihat website Toko ABC sepertinya bisa lebih cepat. Tertarik untuk ngobrol santai soal ini? Thanks.\\\`
    * **Example (English)**: \\\`Hi John, this is Harris from RICE AI. Noticed your site could use a mobile performance boost. Open to a quick chat about it? Thanks.\\\`
    * The goal is to start a conversation. Keep it under 3 sentences.
`;
    // --- End of detailed instructions ---

    return `
        You are a world-class AI assistant for an IT consulting company. Your goal is to perform a deep-dive investigation on a single company, "${companyName}", using Google Search, and generate a personalized outreach message.

        Follow this multi-phase process FOR THE COMPANY: "${companyName}".

        **Phase 1: Deep Dive Research (Using Google Search Tool)**
        1.  Use multiple, targeted queries ('${companyName} official website', '${companyName} contact', etc.) to find the following information. All text output must be in the target language: **${language}**.
            * officialWebsite, contactEmail, contactPhone, contactWhatsApp, companyDescription, estimatedEmployeeCount, keyStrengthsIT, keyWeaknessesIT, inferredPrimaryLanguage.
            * ${customResearchInstruction}

        **Phase 2: Key Contact Person Research**
        1.  Find a key decision-maker (Owner, CEO, IT Manager) for "${companyName}".
        2.  Extract their full 'name' and 'title'.

        **Phase 3: Company Profiling & Size Assessment**
        1.  ${companySizeInstruction}

        **Phase 4: Personalized Outreach Generation in ${language}**
        1.  Based on your research, generate a draft email and WhatsApp message.
        2.  Sender Details: ${finalSenderName}, ${finalSenderTitle}, ${finalItCompanyName}, ${finalItCompanyWebsite}, ${finalItCompanyPhone}, ${finalItCompanyEmail}.
        3.  ${emailTemplateInstruction}
        4.  ${whatsappTemplateInstruction}

        **Phase 5: Structured JSON Output**
        Compile all information into a single JSON object. Your entire response MUST be only this JSON object. The root must be a "leads" key containing an array with a SINGLE business lead object.

        **Phase 6: Final Data Cleaning (MANDATORY)**
        - CRITICAL: REMOVE ALL CITATION MARKERS (e.g., [1], [2]).

        **Example JSON Structure:**
        \`\`\`json
        {
          "leads": [
            {
              "businessName": "string",
              "officialWebsite": "string (URL or 'Not Found')",
              "contactPerson": {
                "name": "string (e.g., 'Budi Santoso' or 'Not Found')",
                "title": "string (e.g., 'Owner' or '')"
              },
              "contactEmail": ["string (email)", "string (another_email)"],
              "contactPhone": ["string (phone number)"],
              "contactWhatsApp": "string (e.g., '+628123456789' or 'Not Found')",
              "companyDescription": "string",
              "estimatedEmployeeCount": "string",
              "inferredPrimaryLanguage": "string",
              "companySizeCategory": "string (This MUST be one of 'Small', 'Medium', 'Large', or 'Enterprise')",
              "keyStrengthsIT": ["string"],
              "keyWeaknessesIT": ["string"],
              "customResearchResults": "string (Answer to the custom query, or 'Not Found')",
              "draftEmail": {
                "language": "string",
                "tone": "string",
                "subject": "string",
                "body": "string"
              },
              "draftWhatsApp": {
                "language": "string",
                "tone": "string ('conversational', 'brief')",
                "body": "string (A very short message)"
              }
            }
          ]
        }
        \`\`\`
    `;
};


/**
 * PROMPT 3: Generates a prompt to validate a company's website.
 */
const createValidationPrompt = (lead: BusinessLead): string => {
    const { businessName, officialWebsite, contactEmail, contactPhone } = lead;

    const emailsString = (Array.isArray(contactEmail) ? contactEmail : []).join(', ');
    const phonesString = (Array.isArray(contactPhone) ? contactPhone : []).join(', ');

    return `
        You are a meticulous data validation specialist. Your task is to verify if a given website URL is the correct, official website for a specific company, using its contact information as primary evidence.

        **Company to Verify:** "${businessName}"
        **Proposed Website:** "${officialWebsite}"
        **Known Contact Emails:** "${emailsString || 'None'}"
        **Known Contact Phones:** "${phonesString || 'None'}"

        **Verification Process:**
        1.  Use Google Search to investigate the company.
        2.  **CRITICAL:** Cross-reference the domain from the contact emails with the proposed website's domain. A match is a very strong positive signal.
        3.  Check if the contact phone numbers are listed on the proposed website.
        4.  If the proposed website is incorrect (e.g., it's a directory, a social media page, or belongs to a different company), find the correct official website.
        5.  Determine if the proposed website is correct.

        **Output Requirement:**
        Your entire response MUST be a single JSON object with two keys:
        1.  \`isCorrect\`: A boolean value (\`true\` or \`false\`).
        2.  \`correctedWebsite\`: A string. If \`isCorrect\` is \`true\`, this should be the original website URL. If \`isCorrect\` is \`false\`, this must be the URL of the correct official website you found. If you cannot find the correct website, return "Not Found".

        **Example Response 1 (Correct):**
        {
            "isCorrect": true,
            "correctedWebsite": "https://www.the-original-site.com"
        }

        **Example Response 2 (Incorrect):**
        {
            "isCorrect": false,
            "correctedWebsite": "https://www.the-actual-official-site.com"
        }
    `;
};

/**
 * A helper function to validate a single lead's website.
 */
const validateLead = async (lead: BusinessLead): Promise<BusinessLead> => {
    const hasWebsite = lead.officialWebsite && lead.officialWebsite.toLowerCase() !== 'not found';
    const hasContactInfo = (lead.contactEmail && lead.contactEmail.length > 0) || (lead.contactPhone && lead.contactPhone.length > 0);

    if (!hasWebsite || !hasContactInfo) {
        return lead; // Skip validation if there's no website or contact info to cross-reference
    }

    try {
        const validationPrompt = createValidationPrompt(lead);
        const validationResponse = await generateContentWithRetry({
            model: 'gemini-2.5-flash',
            contents: validationPrompt,
            config: {
                tools: [{ googleSearch: {} }]
            },
        });

        const validationData = parseJsonResponse(validationResponse.text);

        if (typeof validationData.isCorrect === 'boolean' && !validationData.isCorrect && validationData.correctedWebsite && validationData.correctedWebsite.toLowerCase() !== 'not found') {
            console.log(`Website validation: Correcting URL for "${lead.businessName}" from ${lead.officialWebsite} to ${validationData.correctedWebsite}`);
            return { ...lead, officialWebsite: validationData.correctedWebsite };
        }
        
        console.log(`Website validation: URL "${lead.officialWebsite}" confirmed for "${lead.businessName}".`);
        return lead;
    } catch (e) {
        console.error(`Could not validate website for "${lead.businessName}", returning original data. Error:`, e);
        return lead; // On error, just return the original lead without modification
    }
};

/**
 * Main function to generate leads using the multi-step process.
 */
export const generateLeads = async (
  params: LeadGenerationParams,
  onProgressUpdate: (update: { status: string; progress: number }) => void
): Promise<BusinessLead[]> => {
    // 1. Find a list of company names
    onProgressUpdate({ status: 'Scanning for businesses that match your criteria...', progress: 5 });
    const companyListPrompt = createCompanyListPrompt(params);
    let companyResponse;
    try {
        companyResponse = await generateContentWithRetry({
            model: 'gemini-2.5-flash',
            contents: companyListPrompt,
            config: {
                tools: [{ googleSearch: {} }]
            },
        });
    } catch(e) {
        console.error("Error finding companies:", e);
        if (e instanceof AIServiceError) {
            throw e; // Re-throw our custom error as it has a user-friendly message
        }
        throw new Error("Failed to find businesses. The AI may be experiencing high demand. Please try again later.");
    }
    
    const companyData = parseJsonResponse(companyResponse.text);
    const companyNames: string[] = companyData.companyNames || [];

    if (companyNames.length === 0) {
        throw new Error("No businesses found matching your criteria. Try broadening your search.");
    }

    onProgressUpdate({
      status: `Found ${companyNames.length} potential leads. The deep dive begins...`,
      progress: 10,
    });
    
    let simulationCancelled = false;
    const simulationTimeouts: ReturnType<typeof setTimeout>[] = [];
    
    const simulateProgress = async () => {
        for (let i = 0; i < companyNames.length; i++) {
            await new Promise(resolve => {
                const timeout = setTimeout(() => {
                    if (simulationCancelled) {
                        resolve(null);
                        return;
                    }
                    const companyName = companyNames[i];
                    // Research phase takes us from 10% to 85%
                    const researchProgress = ((i + 1) / companyNames.length) * 75;
                    const currentProgress = 10 + researchProgress;
                    onProgressUpdate({
                        status: `Researching "${companyName}" (${i + 1}/${companyNames.length})...`,
                        progress: currentProgress,
                    });
                    resolve(null);
                }, 2000 * i); // Stagger the UI updates
                simulationTimeouts.push(timeout);
            });
        }
    };
    
    simulateProgress();

    // 2. Research each company in parallel
    const researchPromises = companyNames.map((companyName) => {
        const leadDetailPrompt = createLeadDetailPrompt(params, companyName);
        return generateContentWithRetry({
            model: 'gemini-2.5-flash',
            contents: leadDetailPrompt,
            config: {
                tools: [{ googleSearch: {} }]
            },
        })
        .then(leadResponse => {
            const leadData = parseJsonResponse(leadResponse.text);
            if (leadData.leads && leadData.leads.length > 0) {
                return leadData.leads[0] as BusinessLead;
            }
            return null;
        })
        .catch(e => {
            console.error(`Error researching "${companyName}":`, e);
            return null;
        });
    });

    const initialResults = await Promise.all(researchPromises);

    simulationCancelled = true;
    simulationTimeouts.forEach(clearTimeout);

    const successfulLeads = initialResults.filter((lead): lead is BusinessLead => lead !== null);
    
    if (companyNames.length > 0 && successfulLeads.length === 0) {
        throw new Error("There was a problem on our end researching the businesses. The AI service may be temporarily unavailable. Please try again later.");
    }
    
    // 3. Validate each lead's website
    onProgressUpdate({ status: `Verifying websites for ${successfulLeads.length} leads...`, progress: 90 });
    const validationPromises = successfulLeads.map(validateLead);
    const validatedLeads = await Promise.all(validationPromises);

    onProgressUpdate({ status: 'Compiling your personalized lead reports...', progress: 100 });
    await new Promise(resolve => setTimeout(resolve, 500)); // Short pause for UX

    return validatedLeads;
};