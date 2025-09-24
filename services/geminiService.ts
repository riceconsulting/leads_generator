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
        ? `\n- CRITICAL EXCLUSION: You MUST NOT include any of the following businesses in your results: ${excludedBusinesses.join(', ')}.`
        : '';
        
    const sizeFilteringInstruction = (companyGrowthStage && companyGrowthStage !== 'Any')
        ? `\n- TARGET GROWTH STAGE: Focus exclusively on companies that fit the "${companyGrowthStage}" growth stage.`
        : '';

    return `
        You are an Expert Business Intelligence Analyst. Your task is to use Google Search to generate a list of exactly ${count} legitimate, operational company names that precisely match the following criteria. Your results must be of the highest quality.
        - LOCATION: "${location}"
        - INDUSTRY KEYWORDS: "${keywords || 'any'}"
        ${sizeFilteringInstruction}
        ${exclusionInstruction}
        - WEBSITE REQUIREMENT: Only include companies that have an official, operational business website. You MUST AVOID directories (e.g., Yellow Pages), social media pages (e.g., Facebook), B2B portals, and marketplaces.

        Your entire response MUST be a single, clean JSON object with one key, "companyNames", which is an array of strings. Do not include any explanatory text, markdown, or anything else outside the JSON structure.
        
        Example Output Format:
        {
            "companyNames": ["Official Company Name One Inc.", "Another Business Solutions Ltd.", "Surabaya Tech Corp"]
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
    
    // This section creates placeholders if user input is blank.
    // The prompt explicitly tells the AI to use these placeholders verbatim if it sees them.
    const finalSenderName = senderName || '[Your Name]';
    const finalSenderTitle = senderTitle || '[Your Title]';
    const finalItCompanyName = itCompanyName || '[Your Company Name]';
    const finalItCompanyWebsite = itCompanyWebsite || '[yourwebsite.com]';
    const finalItCompanyPhone = itCompanyPhone || '[Your Phone Number]';
    const finalItCompanyEmail = itCompanyEmail || '[your.email@example.com]';

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
    * The email body must end with the full sender signature, constructed according to the SENDER SIGNATURE RULE.
    * **Template**: "${emailTemplate}"
`
        : `
* **Email Generation (Default)**:
    * Address the email to the 'contactPerson' if found. Otherwise, use a general greeting.
    * **CRITICAL LOGIC**: First, check the 'keyWeaknessesIT' list. If you found one or more weaknesses, your email MUST reference the most significant weakness as a talking point to demonstrate your research.
    * **If AND ONLY IF the 'keyWeaknessesIT' list is empty**, then generate a more general but still personalized introduction. Mention the company by name, introduce our services briefly, and offer a 'free, no-obligation IT assessment' to explore potential areas for improvement.
    * The email body must end with the full sender signature, constructed according to the SENDER SIGNATURE RULE.
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
    * **Template**: \`[Greeting] [Contact Name], saya [Sender Name] dari [IT Company Name]. Saya lihat [mention a specific IT weakness found]. Tertarik untuk diskusi singkat tentang ini? Terima kasih.\`
    * **Example (Bahasa)**: \`Halo Pak Budi, saya Harris dari RICE AI Consulting. Saya lihat website Toko ABC sepertinya bisa lebih cepat. Tertarik untuk ngobrol santai soal ini? Thanks.\`
    * **Example (English)**: \`Hi John, this is Harris from RICE AI. Noticed your site could use a mobile performance boost. Open to a quick chat about it? Thanks.\`
    * The goal is to start a conversation. Keep it under 3 sentences.
`;

    return `
        You are a world-class AI Business Intelligence Analyst. Your mission is to conduct a meticulous, in-depth investigation of a single company, "${companyName}", using Google Search. Your primary objective is to uncover **accurate contact information for a key decision-maker** and to generate a comprehensive, high-quality business profile. Accuracy, verification, and lead quality are paramount.

        **Follow this multi-phase process FOR THE COMPANY: "${companyName}".**

        **Phase 1: Foundational Research & Website Identification**
        1.  **Identify Official Website**: This is the most critical first step. Use search queries like \`"${companyName}" official website\`.
        2.  **Verify Legitimacy**: The website must belong to an operational business. You MUST disregard directories (e.g., Yellow Pages), social media profiles, news articles, and B2B marketplaces as the official website. The official website is the primary source for the next steps. All text output must be in the target language: **${language}**.

        **Phase 2: Meticulous Contact Discovery Protocol**
        1.  **Target Decision-Maker**: Your primary goal is to find a key decision-maker (e.g., Owner, CEO, CTO, IT Manager, Head of Technology, Marketing Director). Use advanced Google searches like \`site:linkedin.com/in "${companyName}" "CEO"\` to find profiles and identify the correct person and their exact 'title'. The 'name' MUST be a person's full name, not the company name.
        2.  **Direct Email Triangulation**: Finding a direct, individual email is a critical success metric. Generic emails (info@, contact@) are a last resort.
            *   Scour the official website's "Contact Us", "About Us", "Team", and "Leadership" pages.
            *   If you find the decision-maker's name but no email, search relentlessly using queries like \`"Jane Doe" "${companyName}" email address\`.
            *   Look for email patterns (e.g., \`firstname.lastname@company.com\`) on the site and apply it to the decision-maker's name.
            *   Collect all valid, non-generic emails you find into the list.
        3.  **Phone Number Verification**: Find the main business phone number. Verify it on the contact page. Note if a number is specifically designated for WhatsApp. Format the number clearly.

        **Phase 3: Comprehensive Company Profiling**
        1.  From the website and search results, gather: \`companyDescription\`, \`estimatedEmployeeCount\`, \`keyStrengthsIT\`, \`keyWeaknessesIT\`.
        2.  Infer the \`inferredPrimaryLanguage\` based on the website's content.
        3.  ${companySizeInstruction}
        4.  ${customResearchInstruction}

        **Phase 4: Personalized Outreach Generation in ${language}**
        1.  **SENDER SIGNATURE RULE**: The email signature MUST be constructed using the details below. If a detail is a placeholder (e.g., '[Your Name]'), you MUST use that exact placeholder in the output. **DO NOT replace placeholders with fictional information.**
            *   Sender Name: ${finalSenderName}
            *   Sender Title: ${finalSenderTitle}
            *   Company: ${finalItCompanyName}
            *   Website: ${finalItCompanyWebsite}
            *   Phone: ${finalItCompanyPhone}
            *   Email: ${finalItCompanyEmail}
        2.  ${emailTemplateInstruction}
        3.  ${whatsappTemplateInstruction}

        **Phase 5: Structured JSON Output & Data Sanitization**
        1.  Compile ALL information into a single JSON object. Your entire response MUST be only this JSON object.
        2.  **CRITICAL DATA HYGIENE**:
            *   **DO NOT** include citation markers (e.g., [1], [2]).
            *   Ensure all URLs are complete, valid, and are not tracking links.
            *   If, after extensive searching, a piece of information cannot be found, the value for that field MUST be "Not Found".
            *   **DO NOT INVENT or GUESS information**, especially contact details like emails and phone numbers.

        **Example JSON Structure with Guidelines:**
        \`\`\`json
        {
          "leads": [
            {
              "businessName": "string // The official company name.",
              "officialWebsite": "string // The full, correct URL. 'Not Found' if undiscoverable.",
              "contactPerson": {
                "name": "string // Full name of a decision-maker. 'Not Found' if none.",
                "title": "string // Their job title."
              },
              "contactEmail": ["string // List of all found emails. Prioritize direct, individual emails."],
              "contactPhone": ["string // List of all found phone numbers."],
              "contactWhatsApp": "string // A number confirmed or likely to be WhatsApp.",
              "companyDescription": "string // A concise description of the business.",
              "estimatedEmployeeCount": "string",
              "inferredPrimaryLanguage": "string",
              "companySizeCategory": "string // MUST be one of 'Small', 'Medium', 'Large', or 'Enterprise'.",
              "keyStrengthsIT": ["string"],
              "keyWeaknessesIT": ["string"],
              "customResearchResults": "string // Answer to the custom query, or 'Not Found'.",
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
        You are a meticulous data validation AI. Your task is to rigorously verify if a given website URL is the correct, official website for a specific company.

        **Company to Verify:** "${businessName}"
        **Proposed Website:** "${officialWebsite}"
        **Known Contact Emails:** "${emailsString || 'None'}"
        **Known Contact Phones:** "${phonesString || 'None'}"

        **Verification Protocol:**
        1.  **Initial Scan**: Access the proposed website and look for the company name in the title, footer, or "About Us" page. A direct match is a strong indicator.
        2.  **Contact Info Cross-Reference**:
            *   **Email Domain Match**: This is a CRITICAL check. Does the domain of any known contact emails (@domain.com) match the domain of the proposed website? This is the strongest evidence.
            *   **Phone Number Match**: Are any of the known contact phone numbers listed on the website?
        3.  **Search Engine Triangulation**: Use Google Search with queries like \`"${businessName}" official site\`. Compare the top results with the proposed website.
        4.  **Negative Indicators**: The website is likely INCORRECT if it is a social media profile (Facebook, Instagram), a general business directory (e.g., Yellow Pages), a news article, or a blog post.
        5.  **Correction**: If the proposed website is incorrect, you MUST perform a new search to find the correct official website.
        
        **Output Requirement:**
        Your entire response MUST be a single JSON object with two keys. Do not add any other text.
        1.  \`isCorrect\`: A boolean value (\`true\` or \`false\`).
        2.  \`correctedWebsite\`: A string.
            *   If \`isCorrect\` is \`true\`, this field MUST contain the original, validated website URL.
            *   If \`isCorrect\` is \`false\`, this field MUST contain the URL of the correct official website you found.
            *   If you cannot find the correct website after a thorough search, return "Not Found" in this field.

        **Example Response 1 (Correct):**
        {
            "isCorrect": true,
            "correctedWebsite": "https://www.the-original-site.com"
        }

        **Example Response 2 (Incorrect and Corrected):**
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
