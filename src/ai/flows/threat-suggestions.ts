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
    .enum(['STRIDE', 'LINDDUN', 'PASTA'])
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
      cvss: z.number().optional().describe('The CVSS 3.1 score of the threat, if available.'),
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

2.  **Apply the Methodology Rigorously:**
    *   **If the methodology is STRIDE:** For EACH component and EACH data flow, systematically analyze it for all six STRIDE categories:
        *   **S**poofing: Could an attacker impersonate a component or user?
        *   **T**ampering: Could an attacker modify data in transit or at rest?
        *   **R**epudiation: Could a user deny performing an action?
        *   **I**nformation Disclosure: Could an attacker access data they are not authorized to see?
        *   **D**enial of Service: Could an attacker make a component or the system unavailable?
        *   **E**levation of Privilege: Could an attacker gain rights they are not entitled to?
    *   **If the methodology is LINDDUN:** For EACH component and EACH data flow, focus on privacy threats. Systematically analyze for all seven LINDDUN categories:
        *   **L**inkability: Can an attacker link two pieces of information or actions?
        *   **I**dentifiability: Can an attacker identify a user from the data?
        *   **N**on-repudiation: How does the system prove a user's actions (this is a privacy concern when it's *too* strong)?
        *   **D**etectability: Can an attacker determine if an item of interest exists in the system?
        *   **D**ata Disclosure: Is personally identifiable information (PII) being exposed?
        *   **U**nawareness: Are users unaware of how their data is being collected and processed?
        *   **N**on-compliance: Does the system fail to comply with privacy regulations (like GDPR, CCPA)?
    *   **If the methodology is PASTA (Process for Attack Simulation and Threat Analysis):** Adopt a risk-centric, attacker-focused mindset. Identify realistic attack vectors. For each potential attack:
        *   Identify the business impact.
        *   Enumerate the steps an attacker would take (the attack tree).
        *   Identify the vulnerabilities that would be exploited.
        *   Map threats to these vulnerabilities.

3.  **Generate Specific and Actionable Threats:**
    *   For each threat you identify, you MUST associate it with the specific \`affectedComponentId\` from the input architecture. If a threat affects a data flow, assign it to the *target* component of that flow.
    *   **Threat Description:** Write a clear, concise description of the threat. Example: "An unauthenticated attacker could query the Product Microservice directly, bypassing the API Gateway, to access sensitive product pricing data."
    *   **Severity:** Assign a severity level (\`High\`, \`Medium\`, \`Low\`) based on potential impact.
    *   **Mitigation:** Provide a concrete, actionable mitigation strategy. Example: "Implement network policies (e.g., security groups) to ensure the Product Microservice only accepts traffic from the API Gateway. Implement mutual TLS (mTLS) for service-to-service authentication."
    *   **Vulnerability Identifiers (CRITICAL):** Where applicable, provide standard identifiers.
        *   **CVSS:** Estimate a CVSS 3.1 base score.
        *   **CWE:** Identify the relevant Common Weakness Enumeration (CWE) ID (e.g., CWE-89 for SQL Injection).
        *   **CVE:** If the threat relates to a known vulnerability in a technology type described (e.g., a specific version of a library, if mentioned), provide the CVE identifier. If not, omit this field.

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
