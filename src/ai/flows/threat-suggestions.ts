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
      affectedComponent: z.string().describe('The component affected by the threat.'),
      severity: z.enum(['High', 'Medium', 'Low']).describe('The severity level of the threat.'),
      mitigation: z.string().describe('Suggested mitigation strategies for the threat.'),
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

Consider the following:
- Potential vulnerabilities in each component.
- Data flows and potential interception or modification points.
- Trust boundaries and potential for privilege escalation.
- Compliance requirements and potential violations.

Provide a list of threats, including a description of the threat, the affected component, the severity level (High, Medium, Low), and suggested mitigation strategies.

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
