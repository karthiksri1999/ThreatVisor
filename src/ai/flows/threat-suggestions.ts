// src/ai/flows/threat-suggestions.ts
'use server';

/**
 * @fileOverview Automatically suggests threats and mitigations based on the selected threat modeling methodology and the defined architecture.
 *
 * - suggestThreatsAndMitigations - A function that suggests threats and mitigations.
 * - ThreatSuggestionsInput - The input type for the suggestThreatsAndMitigations function.
 * - ThreatSuggestionsOutput - The return type for the suggestThreatsAndMitigations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ThreatSuggestionsInputSchema = z.object({
  architectureDescription: z
    .string()
    .describe(
      'A detailed description of the application architecture, including components, data flows, and trust boundaries.'
    ),
  threatModelingMethodology: z
    .enum(['STRIDE', 'LINDDUN', 'PASTA', 'OWASP Top 10', 'OWASP API Top 10', 'MITRE ATT&CK', 'OCTAVE'])
    .describe('The threat modeling methodology to use for threat identification.'),
});

export type ThreatSuggestionsInput = z.infer<typeof ThreatSuggestionsInputSchema>;

const ThreatSuggestionsOutputSchema = z.object({
  threats: z.array(
    z.object({
      threat: z.string().describe('A description of the potential threat.'),
      affectedComponentId: z.string().describe('The ID of the component affected by the threat.'),
      severity: z.enum(['Critical', 'High', 'Medium', 'Low']).describe('The severity level of the threat.'),
      mitigation: z.string().describe('Suggested mitigation strategies for the threat.'),
      cvss: z.number().describe('The CVSS 3.1 score of the threat.'),
      cve: z.string().optional().describe('The CVE identifier, if applicable (e.g., CVE-2021-44228).'),
      cwe: z.string().optional().describe('The CWE identifier, if applicable (e.g., CWE-79).'),
    })
  ).describe('A list of potential threats and their corresponding mitigations.'),
});


export type ThreatSuggestionsOutput = z.infer<typeof ThreatSuggestionsOutputSchema>;

export async function suggestThreatsAndMitigations(
  input: ThreatSuggestionsInput
): Promise<ThreatSuggestionsOutput> {
  return suggestThreatsAndMitigationsFlow(input);
}

const PROMPT_TEXT = `You are a world-class security architect and threat modeling expert. Your task is to conduct a thorough, highly contextualized threat analysis of a given application architecture. You must be meticulous, accurate, and provide actionable insights that are **specifically tailored to the technologies and data described**. Avoid generic advice.

You will be given an architecture description in a structured format (YAML/JSON), and a specific threat modeling methodology to use.

**Architecture Description:**
{{{architectureDescription}}}

**Threat Modeling Methodology:**
{{{threatModelingMethodology}}}

**Your Analysis Process:**

1.  **Deconstruct the Architecture with Deep Context:** Do not just look at component names. Pay extremely close attention to the specific metadata provided for each component and data flow. This is the key to providing non-generic threats.
    *   **Technology (\`technology\`):** Use this to identify technology-specific vulnerabilities. For example, if a component uses 'PostgreSQL', consider SQL injection variants specific to it. If it uses 'NGINX', consider common misconfigurations.
    *   **Data Processed/Classification (\`data_processed\`, \`data_classification\`):** Use this to determine the *impact* of a threat. A data exposure threat is far more critical if the data is classified as 'pii' or 'pci' than if it's 'public'. The mitigations should reflect this high-stakes context. For example, for 'credentials', suggest hashing, salting, and secure storage mechanisms.
    *   **Component Role (\`classification\`):** Use this to understand the component's context. A component classified as 'edge' is exposed to more external threats than one classified as 'internal'. A 'monitoring' service has different threat vectors than a 'payment' service.
    *   **Trust Boundaries:** Use these to identify threats related to privilege escalation or unauthorized cross-boundary communication. Data flows that cross from a low-trust to a high-trust boundary are critical points of inspection.

2.  **Apply the Methodology Rigorously:** Based on the selected \`threatModelingMethodology\`, perform the analysis, but filter and prioritize threats through the lens of the deep context you gathered in step 1.
    *   **If STRIDE:** For EACH component, tailor the STRIDE category to its context. For a 'PostgreSQL' datastore handling 'pii', *Information Disclosure* is a critical threat. For an 'auth_service', *Spoofing* and *Elevation of Privilege* are paramount.
    *   **If LINDDUN:** Focus on privacy threats related to the specific \`data_classification\` mentioned.
    *   **If OWASP Top 10 / API Top 10:** Cross-reference the specified \`technology\` (e.g., 'Node.js', 'React', 'NGINX') against common vulnerabilities for that stack.
    *   **If PASTA:** Use the data classifications to infer business impact and prioritize threats that affect high-value assets.
    *   **If MITRE ATT&CK:** Map potential adversary techniques to the specific technologies in the architecture.
    *   **If OCTAVE:** Focus on the risk to critical assets, which can be identified by their \`classification\` and \`data_classification\`.

3.  **Generate Specific and Actionable Threats:**
    *   For each threat you identify, you MUST associate it with the specific \`affectedComponentId\` from the input architecture.
    *   **Threat Description:** Write a clear, concise description that **references the specific technology or data type**. Instead of "Service is vulnerable to injection," write "The 'Product Service' using Go could be vulnerable to NoSQL injection against its 'MongoDB' product database."
    *   **Mitigation:** Provide concrete, actionable mitigation strategies relevant to the technology stack. Instead of "Validate user input," suggest "Use a parameterized query library for Go like the official MongoDB driver's \`bson.D\` to prevent NoSQL injection. Implement schema validation at the application layer."
    *   **Severity:** Base the severity on the combination of the vulnerability and the **data classification**. An injection vulnerability on a service handling 'pci' data is 'Critical'.
    *   **Vulnerability Identifiers (CRITICAL):** Where applicable, you MUST provide standard identifiers.
        *   **CVSS (MANDATORY):** You MUST provide an estimated CVSS 3.1 base score for every single threat, ranging from 0.0 to 10.0. This field is required.
        *   **CWE (MANDATORY):** You MUST identify the relevant Common Weakness Enumeration (CWE) ID (e.g., CWE-89 for SQL Injection).
        *   **CVE (MANDATORY - MAKE BEST EFFORT):** You MUST make a very strong effort to find a relevant, representative CVE identifier for the class of vulnerability described. For example, for a threat like 'SQL Injection' against a 'SQL Database' component, you could cite a well-known, illustrative CVE for that class of vulnerability (e.g., a famous SQLi CVE). This helps contextualize the threat's real-world impact even if a specific software version isn't provided in the architecture. It is critical that you provide a CVE where one is applicable. If a threat is truly too generic or conceptual to have a direct CVE analog, you may omit this field, but only as a last resort.

You must output a list of threats in the specified JSON format. Be comprehensive. The quality, accuracy, and **context-specificity** of your output are paramount.
`;

const safetySettings = [
  {
    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    threshold: 'BLOCK_ONLY_HIGH',
  },
  {
    category: 'HARM_CATEGORY_HATE_SPEECH',
    threshold: 'BLOCK_ONLY_HIGH',
  },
  {
    category: 'HARM_CATEGORY_HARASSMENT',
    threshold: 'BLOCK_ONLY_HIGH',
  },
  {
    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    threshold: 'BLOCK_ONLY_HIGH',
  },
];

const primaryPrompt = ai.definePrompt({
  name: 'threatSuggestionsPrompt',
  input: {schema: ThreatSuggestionsInputSchema},
  output: {schema: ThreatSuggestionsOutputSchema},
  prompt: PROMPT_TEXT,
  // This will use the default model configured in genkit.ts ('gemini-2.0-flash')
  config: {
    safetySettings,
  },
});

const fallbackPrompt = ai.definePrompt({
  name: 'threatSuggestionsFallbackPrompt',
  model: 'googleai/gemini-1.5-flash', // Use a different, reliable model as a fallback
  input: {schema: ThreatSuggestionsInputSchema},
  output: {schema: ThreatSuggestionsOutputSchema},
  prompt: PROMPT_TEXT,
  config: {
    safetySettings,
  },
});

const suggestThreatsAndMitigationsFlow = ai.defineFlow(
  {
    name: 'suggestThreatsAndMitigationsFlow',
    inputSchema: ThreatSuggestionsInputSchema,
    outputSchema: ThreatSuggestionsOutputSchema,
  },
  async input => {
    try {
        console.log("Attempting analysis with primary model...");
        const {output} = await primaryPrompt(input);
        return output!;
    } catch (e: any) {
        // If the primary model is overloaded, automatically try the fallback model.
        if (e.message && (e.message.includes('503') || e.message.toLowerCase().includes('overloaded'))) {
            console.warn("Primary model failed due to overload. Attempting fallback model...");
            try {
                const {output} = await fallbackPrompt(input);
                console.log("Fallback model succeeded.");
                return output!;
            } catch (fallbackError: any) {
                console.error("Fallback model also failed:", fallbackError);
                // Throw a more generic, but still informative error if the fallback also fails.
                throw new Error("The analysis service is currently experiencing high demand and both primary and fallback services were unavailable. Please try again in a few minutes.");
            }
        }
        // Re-throw any other type of error.
        throw e;
    }
  }
);
