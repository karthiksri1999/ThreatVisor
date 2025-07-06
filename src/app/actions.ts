'use server';

import { suggestThreatsAndMitigations, ThreatSuggestionsOutput } from '@/ai/flows/threat-suggestions';
import { parseDsl } from '@/lib/dsl-parser';

interface FormState {
  threats: ThreatSuggestionsOutput | null;
  error: string | null;
}

export async function analyzeThreatsAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const dsl = formData.get('dsl') as string;
  const methodology = formData.get('methodology') as 'STRIDE' | 'LINDDUN' | 'PASTA' | 'OWASP Top 10' | 'OWASP API Top 10' | 'MITRE ATT&CK' | 'OCTAVE';

  if (!dsl || !methodology) {
    return {
      threats: null,
      error: 'Missing architecture definition or methodology.',
    };
  }

  try {
    // Validate the DSL syntax before proceeding
    parseDsl(dsl);

    const threats = await suggestThreatsAndMitigations({
      architectureDescription: dsl,
      threatModelingMethodology: methodology,
    });
    
    if (!threats || !threats.threats) {
        return {
            threats: null,
            error: 'The AI returned an empty or invalid response. Please try again or adjust your input.'
        }
    }

    return { threats, error: null };
  } catch (e: any) {
    return {
      threats: null,
      error: e.message || 'An unexpected error occurred.',
    };
  }
}
