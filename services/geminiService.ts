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
        // Throw an error to make the failure explicit, which will be caught by the retry logic.
        throw new Error("AI returned an empty response.");
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
 * Wraps the generateContent call with a retry mechanism for transient errors
 * and adds explicit checks for content blocking.
 */
const generateContentWithRetry = async (
  request: any, // Using any as GenerateContentParameters is not exported
  retries = 3, 
  delay = 1000
): Promise<GenerateContentResponse> => {
    try {
        const response = await ai.models.generateContent(request);

        // Explicitly check for content blocking due to safety settings or other reasons.
        // This provides clearer error messages to the user than a generic empty response.
        if (response?.promptFeedback?.blockReason) {
            console.error("Prompt was blocked. Reason:", response.promptFeedback.blockReason, "Details:", response.promptFeedback.safetyRatings);
            throw new AIServiceError(`Your request was blocked. Reason: ${response.promptFeedback.blockReason}. Please revise your inputs and try again.`);
        }
        
        if (response?.candidates?.[0]?.finishReason === 'SAFETY') {
            console.error("Response was blocked due to safety settings:", response.candidates[0].safetyRatings);
            throw new AIServiceError(`The generated response was blocked for safety reasons. This can happen with sensitive topics. Please adjust your request.`);
        }

        // A non-blocking response might still be empty. The calling function will handle this.
        if (!response.text) {
             console.warn("AI returned a response with no text content. This will trigger a retry. Full response:", JSON.stringify(response, null, 2));
        }

        return response;
    } catch (e: any) {
        const errorMessage = (e.message || '').toLowerCase();
        
        // An AIServiceError from our checks above should not be retried.
        if (e instanceof AIServiceError) {
            throw e;
        }

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
 * A robust wrapper that combines content generation and JSON parsing with a retry mechanism for both.
 */
const generateAndParseWithRetry = async (
    request: any, // Using any as GenerateContentParameters is not exported
    onProgressUpdate: ((update: { status: string; progress: number }) => void) | null = null,
    retries = 3
): Promise<any> => {
    let lastError: Error | null = null;
    for (let i = 0; i < retries; i++) {
        try {
            // This inner call handles transient server errors
            const response = await generateContentWithRetry(request, 2); 
            const parsed = parseJsonResponse(response.text);

            // A simple validation to trigger a retry if the AI returns a valid but empty JSON object.
            // This can happen if the AI returns "{}"
            if (parsed && Object.keys(parsed).length === 0) {
                 throw new Error("AI returned a valid but empty JSON object.");
            }
            
            // Check for company list format specifically
            if (request.contents && typeof request.contents === 'string' && request.contents.includes('"companyNames"')) {
                if (!parsed.companyNames || !Array.isArray(parsed.companyNames)) {
                    throw new Error("Parsed JSON for company list is invalid. Missing 'companyNames' array.");
                }
            }

            return parsed; // Success!
        } catch (e: any) {
            lastError = e;
            console.warn(`Attempt ${i + 1}/${retries} failed. Reason: ${e.message}`);
            
            if (i < retries - 1) {
                if (onProgressUpdate) {
                    onProgressUpdate({
                        status: `AI response was unclear, retrying... (Attempt ${i + 2}/${retries}). This may take longer.`,
                        progress: 5 // Keep progress low as we're stuck on an early step
                    });
                }
                const delay = 1000 * Math.pow(2, i); // Exponential backoff: 1s, 2s, 4s...
                console.log(`Retrying in ${delay / 1000}s...`);
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }

    console.error("All retry attempts failed.", lastError);
    if (lastError instanceof AIServiceError) {
        throw lastError;
    }
    // Throw a more specific error for format issues
    if (lastError && (lastError.message.includes("invalid format") || lastError.message.includes("empty JSON") || lastError.message.includes("empty response"))) {
        throw new Error("The AI is having trouble formatting its response. This can be a temporary issue. Please try again.");
    }
    throw lastError || new Error("An unknown error occurred after multiple retries.");
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
        itCompanyWebsite, itCompanyPhone, itCompanyEmail, serviceDescription,
        emailTemplate, whatsappTemplate
    } = params;
    
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

    const ourOfferingInstruction = `
**OUR OFFERING**:
The service/product we are offering to the target company is: "${serviceDescription}". This is the core value proposition you must weave into the outreach messages.
`;

    const emailTemplateInstruction = emailTemplate
        ? `
* **Email Generation (User Template)**:
    * You MUST use the user-provided template below.
    * **CRITICAL CONTEXT**: You must adapt the template to connect OUR OFFERING ("${serviceDescription}") with the specific 'keyWeaknessesIT' you discovered for the company.
    * Replace placeholders like {{businessName}}, {{contactPerson.name}}, and {{keyWeaknessesIT[0]}} (use the first weakness). If a placeholder value isn't found, use a generic alternative (e.g., "your company" for {{businessName}}).
    * The email body must end with the full sender signature, constructed according to the SENDER SIGNATURE RULE.
    * **Template**: "${emailTemplate}"
`
        : `
* **Email Generation (Default)**:
    * Address the email to the 'contactPerson' if found. Otherwise, use a general greeting.
    * **CRITICAL LOGIC**: First, check the 'keyWeaknessesIT' list. If you found one or more weaknesses, your email MUST reference the most significant weakness and persuasively position OUR OFFERING ("${serviceDescription}") as the direct solution to that specific problem.
    * **If AND ONLY IF the 'keyWeaknessesIT' list is empty**, then generate a more general but still personalized introduction. Mention the company by name, introduce OUR OFFERING ("${serviceDescription}") in a compelling way, and offer a relevant call-to-action (e.g., a 'free consultation' or 'demo').
    * The email body must end with the full sender signature, constructed according to the SENDER SIGNATURE RULE.
`;

    const whatsappTemplateInstruction = whatsappTemplate
        ? `
* **WhatsApp Message Generation (User Template)**:
    * You MUST use the user-provided template below. It must be very short and conversational.
    * **CRITICAL CONTEXT**: Adapt the template to connect OUR OFFERING ("${serviceDescription}") to a 'keyWeaknessesIT' you discovered.
    * Replace placeholders like {{businessName}}, {{contactPerson.name}}, and {{keyWeaknessesIT[0]}}.
    * Do NOT use a formal signature.
    * **Template**: "${whatsappTemplate}"
`
        : `
* **WhatsApp Message Generation (Default)**:
    * **CRITICAL**: The WhatsApp message MUST be very short, conversational, and friendly. Do NOT use a formal email structure or signature block.
    * **Template**: \`[Greeting] [Contact Name], saya [Sender Name] dari [IT Company Name]. Saya lihat [mention a specific IT weakness found] dan kami bisa membantu dengan [briefly mention OUR OFFERING: "${serviceDescription}"]. Tertarik untuk diskusi singkat tentang ini? Terima kasih.\`
    * **Example (Bahasa)**: \`Halo Pak Budi, saya Harris dari RICE AI. Saya lihat website Toko ABC sepertinya bisa lebih cepat. Kami spesialis di optimasi web. Tertarik untuk ngobrol santai soal ini? Thanks.\`
    * **Example (English)**: \`Hi John, this is Harris from RICE AI. Noticed your site could use a mobile performance boost. We specialize in exactly that. Open to a quick chat about it? Thanks.\`
    * The goal is to start a conversation. Keep it under 3 sentences.
`;

    // Dynamically construct the sender signature details to ensure empty fields are omitted from the prompt.
    const signatureParts = [];
    if (senderName) signatureParts.push(`*   Sender Name: ${senderName}`);
    if (senderTitle) signatureParts.push(`*   Sender Title: ${senderTitle}`);
    if (itCompanyName) signatureParts.push(`*   Company: ${itCompanyName}`);
    if (itCompanyWebsite) signatureParts.push(`*   Website: ${itCompanyWebsite}`);
    if (itCompanyPhone) signatureParts.push(`*   Phone: ${itCompanyPhone}`);
    if (itCompanyEmail) signatureParts.push(`*   Email: ${itCompanyEmail}`);

    const senderSignatureRule = signatureParts.length > 0
        ? `The email signature MUST be constructed using ONLY the details provided below. If a detail is missing from this list, you MUST omit that line from the signature. **DO NOT replace blank details with placeholders or fictional information.**
            ${signatureParts.join('\n            ')}`
        : 'No sender details have been provided. Therefore, you MUST NOT generate any signature block in the email body.';

    return `
        You are a world-class AI Business Intelligence Analyst. Your mission is to conduct a meticulous, in-depth investigation of a single company, "${companyName}", using Google Search. Your primary objective is to uncover **accurate contact information for a key decision-maker** and to generate a comprehensive, high-quality business profile. Accuracy, verification, and lead quality are paramount.

        **Follow this multi-phase process FOR THE COMPANY: "${companyName}".**

        **Phase 1: Foundational Research & Website Identification**
        1.  **Identify Official Website**: This is the most critical first step. Use search queries like \`"${companyName}" official website\`.
        2.  **Verify Legitimacy**: The website must belong to an operational business. You MUST disregard directories (e.g., Yellow Pages), social media profiles, news articles, and B2B marketplaces as the official website. The official website is the primary source for the next steps. All text output must be in the target language: **${language}**.
        3.  **Find Instagram Handle**: Search for the company's official Instagram page using queries like \`"${companyName}" instagram\`. You must extract only the handle (e.g., @companyhandle).

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

        ${ourOfferingInstruction}

        **Phase 4: Personalized Outreach Generation in ${language}**
        1.  **SENDER SIGNATURE RULE**: ${senderSignatureRule}
        2.  ${emailTemplateInstruction}
        3.  ${whatsappTemplateInstruction}

        **Phase 5: Structured JSON Output & Data Sanitization**
        1.  Compile ALL information into a single JSON object. Your entire response MUST be only this JSON object.
        2.  **CRITICAL DATA HYGIENE**:
            *   **DO NOT** include citation markers (e.g., [1], [2]).
            *   Ensure all URLs are complete, valid, and are not tracking links.
            *   If, after extensive searching, a piece of information cannot be found, the value for that field MUST be "Not Found" or an empty array [] for lists.
            *   **DO NOT INVENT or GUESS information**, especially contact details like emails and phone numbers.

        **Example JSON Structure with Guidelines:**
        \`\`\`json
        {
          "leads": [
            {
              "businessName": "string // The official company name.",
              "officialWebsite": "string // The full, correct URL. 'Not Found' if undiscoverable.",
              "instagramHandle": "string // The official Instagram handle (e.g., @handle), or 'Not Found'.",
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
 * PROMPT 3: Generates a prompt to validate a company's entire contact profile.
 */
const createValidationPrompt = (lead: BusinessLead): string => {
    const { businessName, officialWebsite, contactEmail, contactPhone, contactWhatsApp, instagramHandle } = lead;

    const emailsString = (Array.isArray(contactEmail) ? contactEmail : []).join(', ');
    const phonesString = (Array.isArray(contactPhone) ? contactPhone : []).join(', ');

    return `
        You are a meticulous data validation AI. Your task is to rigorously verify the entire contact profile for a company based on the initial information provided. Your goal is absolute accuracy. Do not invent or hallucinate information.

        **Company Profile to Verify:**
        - **Name:** "${businessName}"
        - **Proposed Website:** "${officialWebsite}"
        - **Proposed Emails:** "${emailsString || 'None'}"
        - **Proposed Phones:** "${phonesString || 'None'}"
        - **Proposed WhatsApp:** "${contactWhatsApp || 'None'}"
        - **Proposed Instagram:** "${instagramHandle || 'None'}"

        **Verification & Correction Protocol:**

        **Step 1: Website Verification (Highest Priority)**
        - First, determine if the "Proposed Website" is the correct, official, operational website.
        - Use Google Search like \`"${businessName}" official site\` to triangulate.
        - The correct website is the single source of truth for the next steps. It CANNOT be a directory, social media page, or marketplace.
        - **If the website is incorrect, you MUST find the correct one before proceeding.**

        **Step 2: Contact Information Audit (Using the Verified Website)**
        - Scour the *verified* official website (from Step 1) for all contact details.
        - **Emails**: Does the website list the "Proposed Emails"? If not, find the primary contact emails listed on the site (e.g., on the 'Contact Us' page). Prioritize emails like info@, contact@, sales@.
        - **Phones**: Does the website list the "Proposed Phones"? If not, find the primary phone numbers on the site.
        - **WhatsApp**: Is there a number on the website explicitly marked for WhatsApp? If so, use that.
        - **Instagram**: Is there a link to an official Instagram page on the website? The handle must match. If there is a link, use the handle it points to.

        **Output Requirement:**
        Your entire response MUST be a single JSON object. Do not add any other text.
        - You must return a corrected version of the verified information.
        - **CRITICAL RULE**: If you cannot find a high-confidence correction for a specific field, you MUST return the original value for that field. If the original value was empty or 'Not Found', and you cannot find a correct one, return an empty array [] for emails/phones or "Not Found" for strings.
        - **ABSOLUTELY DO NOT INVENT OR HALLUCINATE data.** If it's not on the official website or a highly reliable source linked directly from it, it is not verified.

        **JSON Structure:**
        \`\`\`json
        {
          "correctedWebsite": "string",
          "correctedEmails": ["string"],
          "correctedPhones": ["string"],
          "correctedWhatsApp": "string",
          "correctedInstagram": "string"
        }
        \`\`\`
    `;
};


/**
 * A helper function to validate a single lead's profile.
 */
const validateLead = async (lead: BusinessLead): Promise<BusinessLead> => {
    // Only validate if there's a website to use as a source of truth.
    if (!lead.officialWebsite || lead.officialWebsite.toLowerCase() === 'not found') {
        console.log(`Skipping validation for "${lead.businessName}" due to no website.`);
        return lead;
    }

    try {
        const validationPrompt = createValidationPrompt(lead);
        const validationData = await generateAndParseWithRetry({
            model: 'gemini-2.5-flash',
            contents: validationPrompt,
            config: {
                tools: [{ googleSearch: {} }]
            },
        }, null, 2); // 2 retries, no progress update

        const updatedLead = { ...lead };

        if (validationData.correctedWebsite && validationData.correctedWebsite.toLowerCase() !== 'not found') {
            updatedLead.officialWebsite = validationData.correctedWebsite;
        }
        if (Array.isArray(validationData.correctedEmails)) {
            updatedLead.contactEmail = validationData.correctedEmails;
        }
        if (Array.isArray(validationData.correctedPhones)) {
            updatedLead.contactPhone = validationData.correctedPhones;
        }
        if (typeof validationData.correctedWhatsApp === 'string') {
            updatedLead.contactWhatsApp = validationData.correctedWhatsApp;
        }
        if (typeof validationData.correctedInstagram === 'string') {
            updatedLead.instagramHandle = validationData.correctedInstagram;
        }
        
        console.log(`Lead validation complete for "${lead.businessName}".`);
        return updatedLead;

    } catch (e) {
        console.error(`Could not validate profile for "${lead.businessName}", returning original data. Error:`, e);
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
    let companyData;
    try {
        companyData = await generateAndParseWithRetry(
            {
                model: 'gemini-2.5-flash',
                contents: companyListPrompt,
                config: { tools: [{ googleSearch: {} }] },
            },
            onProgressUpdate // Pass callback for retry feedback
        );
    } catch(e) {
        console.error("Error finding companies after multiple retries:", e);
        if (e instanceof AIServiceError) {
            throw e; // Re-throw our custom error with a user-friendly message
        }
        throw new Error("Failed to find businesses after multiple attempts. The AI may be experiencing high demand. Please try again later.");
    }
    
    const companyNames: string[] = companyData.companyNames || [];

    if (companyNames.length === 0) {
        throw new Error("No businesses found matching your criteria. Try broadening your search.");
    }

    onProgressUpdate({
      status: `Found ${companyNames.length} potential leads. The deep dive begins...`,
      progress: 10,
    });
    
    // 2 & 3. Research and Validate each company in parallel for maximum efficiency
    const progressStart = 10;
    const progressTotal = 85; // Research & Validation phase is from 10% to 95%
    const progressPerLead = progressTotal / companyNames.length;
    let leadsProcessed = 0;
    
    const leadProcessingPromises = companyNames.map((companyName, i) => (
        // Add a staggered delay to avoid hitting rate limits too hard.
        new Promise<BusinessLead | null>(resolve => setTimeout(resolve, i * 250))
            .then(async () => {
                let currentLead: BusinessLead | null = null;
                try {
                    // --- Research Step ---
                    onProgressUpdate({
                        status: `Researching "${companyName}"... (${leadsProcessed + 1}/${companyNames.length})`,
                        progress: progressStart + (leadsProcessed * progressPerLead),
                    });

                    const leadDetailPrompt = createLeadDetailPrompt(params, companyName);
                    const leadData = await generateAndParseWithRetry({
                        model: 'gemini-2.5-flash',
                        contents: leadDetailPrompt,
                        config: { tools: [{ googleSearch: {} }] },
                    }, null, 2); // Use fewer retries here to fail faster on a single bad lead
                    
                    if (!leadData.leads || leadData.leads.length === 0) {
                        console.warn(`No lead data returned for "${companyName}".`);
                        return null; // AI returned empty leads array
                    }
                    currentLead = leadData.leads[0] as BusinessLead;
                    
                    // --- Validation Step (interleaved for efficiency) ---
                    onProgressUpdate({
                        status: `Verifying data for "${companyName}"...`,
                        // Set progress to the halfway point for this lead's slice of progress
                        progress: progressStart + (leadsProcessed * progressPerLead) + (progressPerLead / 2),
                    });

                    const validatedLead = await validateLead(currentLead);
                    return validatedLead;

                } catch (e) {
                    console.error(`Error researching or validating "${companyName}" after retries:`, e);
                    return null; // Mark as failed
                } finally {
                    // This block will run whether the try succeeds or fails.
                    leadsProcessed++;
                    onProgressUpdate({
                        status: `Processed ${leadsProcessed}/${companyNames.length} leads.`,
                        progress: progressStart + (leadsProcessed * progressPerLead),
                    });
                }
            })
    ));

    const results = await Promise.all(leadProcessingPromises);
    const finalLeads = results.filter((lead): lead is BusinessLead => lead !== null);
    
    if (companyNames.length > 0 && finalLeads.length === 0) {
        throw new Error("There was a problem on our end researching the businesses. The AI service may be temporarily unavailable. Please try again later.");
    }
    
    onProgressUpdate({ status: 'Compiling your personalized lead reports...', progress: 100 });
    await new Promise(resolve => setTimeout(resolve, 500)); // Short pause for UX

    return finalLeads;
};