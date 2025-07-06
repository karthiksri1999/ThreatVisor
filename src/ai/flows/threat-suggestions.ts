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
      severity: z.enum(['High', 'Medium', 'Low']).describe('The severity level of the threat.'),
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

const prompt = ai.definePrompt({
  name: 'threatSuggestionsPrompt',
  input: {schema: ThreatSuggestionsInputSchema},
  output: {schema: ThreatSuggestionsOutputSchema},
  prompt: `You are a world-class security architect and threat modeling expert. Your task is to conduct a thorough threat analysis of a given application architecture. You must be meticulous, accurate, and provide actionable insights.

You will be given an architecture description in a structured format, and a specific threat modeling methodology to use.

**Architecture Description:**
{{{architectureDescription}}}

**Threat Modeling Methodology:**
{{{threatModelingMethodology}}}

**Your Analysis Process:**

1.  **Deconstruct the Architecture:** Carefully examine every component (actors, services, datastores), every data flow (the connections between components), and every trust boundary. Understand the role of each element.

2.  **Apply the Methodology Rigorously:** Based on the selected \`threatModelingMethodology\`, perform the following analysis:
    *   **If STRIDE:** For EACH component and EACH data flow, systematically analyze it for all six STRIDE categories: Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege.
    *   **If LINDDUN:** For EACH component and EACH data flow, focus on privacy threats. Systematically analyze for all seven LINDDUN categories: Linkability, Identifiability, Non-repudiation, Detectability, Data Disclosure, Unawareness, Non-compliance.
    *   **If PASTA (Process for Attack Simulation and Threat Analysis):** Adopt a risk-centric, attacker-focused mindset. Define business objectives, decompose the application, and conduct attack simulations to identify threats.
    *   **If OWASP Top 10:** Analyze the architecture against the most recent OWASP Top 10 for Web Applications. For each relevant component (e.g., web frontends, APIs), identify vulnerabilities like Injection, Broken Authentication, Sensitive Data Exposure, etc.
    *   **If OWASP API Top 10:** Specifically focus on the APIs (e.g., components like 'api_gateway', 'auth_service'). Analyze for vulnerabilities like Broken Object Level Authorization, Broken User Authentication, Excessive Data Exposure, etc.
    *   **If MITRE ATT&CK:** Map the components and data flows to the ATT&CK framework. Identify potential adversary tactics and techniques that could be used to compromise the system, such as Initial Access, Execution, Persistence, etc.
    *   **If OCTAVE (Operationally Critical Threat, Asset, and Vulnerability Evaluation):** Focus on organizational risk. Identify critical assets and the threats to them. This is a broader, risk-management view.

3.  **Generate Specific and Actionable Threats:**
    *   For each threat you identify, you MUST associate it with the specific \`affectedComponentId\` from the input architecture. If a threat affects a data flow, assign it to the *target* component of that flow.
    *   **Threat Description:** Write a clear, concise description of the threat. Example: "An unauthenticated attacker could query the Product Microservice directly, bypassing the API Gateway, to access sensitive product pricing data."
    *   **Severity:** Assign a severity level (\`High\`, \`Medium\`, \`Low\`) based on potential impact.
    *   **Mitigation:** Provide a concrete, actionable mitigation strategy. Example: "Implement network policies (e.g., security groups) to ensure the Product Microservice only accepts traffic from the API Gateway. Implement mutual TLS (mTLS) for service-to-service authentication."
    *   **Vulnerability Identifiers (CRITICAL):** Where applicable, you MUST provide standard identifiers.
        *   **CVSS (MANDATORY):** You MUST provide an estimated CVSS 3.1 base score for every single threat, ranging from 0.0 to 10.0. This field is required.
        *   **CWE (MANDATORY):** You MUST identify the relevant Common Weakness Enumeration (CWE) ID (e.g., CWE-89 for SQL Injection).
        *   **CVE (MANDATORY - MAKE BEST EFFORT):** You MUST make a very strong effort to find a relevant, representative CVE identifier for the class of vulnerability described. For example, for a threat like 'SQL Injection' against a 'SQL Database' component, you could cite a well-known, illustrative CVE for that class of vulnerability (e.g., a famous SQLi CVE). This helps contextualize the threat's real-world impact even if a specific software version isn't provided in the architecture. It is critical that you provide a CVE where one is applicable. If a threat is truly too generic or conceptual to have a direct CVE analog, you may omit this field, but only as a last resort.

You must output a list of threats in the specified JSON format. Be comprehensive. The quality and accuracy of your output are paramount.
`,
});

const suggestThreatsAndMitigationsFlow = ai.defineFlow(
  {
    name: 'suggestThreatsAndMitigationsFlow',
    inputSchema: ThreatSuggestionsInputSchema,
    outputSchema: ThreatSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
