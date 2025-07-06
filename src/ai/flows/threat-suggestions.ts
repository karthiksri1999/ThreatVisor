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
  prompt: `You are an expert security engineer specializing in threat modeling.

Based on the provided application architecture description and the selected threat modeling methodology, identify potential threats and suggest appropriate mitigations.

Architecture Description: {{{architectureDescription}}}
Threat Modeling Methodology: {{{threatModelingMethodology}}}

For each threat, provide the following details:
- A description of the threat.
- The ID of the affected component ('affectedComponentId').
- The severity level (High, Medium, Low).
- Suggested mitigation strategies.
- If available, include the CVSS 3.1 score, and any relevant CVE or CWE identifiers.

Consider the following:
- Potential vulnerabilities in each component.
- Data flows and potential interception or modification points.
- Trust boundaries and potential for privilege escalation.
- Compliance requirements and potential violations.

Ensure that the identified threats are relevant to the selected threat modeling methodology and the described architecture.

Output in JSON format:
{{output}}
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
