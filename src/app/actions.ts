'use server';

import { suggestThreatsAndMitigations, ThreatSuggestionsOutput } from '@/ai/flows/threat-suggestions';
import { parseDsl, Component } from '@/lib/dsl-parser';

interface FormState {
  threats: ThreatSuggestionsOutput | null;
  error: string | null;
  components: Component[] | null;
  analyzedDsl: string | null;
  analyzedMethodology: string | null;
}

export async function analyzeThreatsAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const dsl = formData.get('dsl') as string;
  // If the methodology is in the form data, use it. Otherwise, use the one from the previous state (for re-analysis).
  const methodology = (formData.get('methodology') as string) || prevState.analyzedMethodology;

  if (!dsl || !methodology) {
    return {
      threats: null,
      error: 'Missing architecture definition or methodology.',
      components: null,
      analyzedDsl: dsl,
      analyzedMethodology: prevState.analyzedMethodology,
    };
  }

  try {
    // Validate the DSL syntax before proceeding
    const parsedDsl = parseDsl(dsl);

    const threats = await suggestThreatsAndMitigations({
      architectureDescription: dsl,
      threatModelingMethodology: methodology as any,
    });
    
    if (!threats || !threats.threats) {
        return {
            threats: null,
            error: 'The analysis returned an empty or invalid response. Please try again or adjust your input.',
            components: null,
            analyzedDsl: dsl,
            analyzedMethodology: methodology,
        }
    }

    return { threats, error: null, components: parsedDsl.components, analyzedDsl: dsl, analyzedMethodology: methodology };
  } catch (e: any) {
    console.error("An error occurred during threat analysis:", e);
    let errorMessage = "An unexpected error occurred during analysis.";

    if (e && typeof e.message === 'string') {
      // Check for specific, user-friendly error messages.
      if (e.message.includes('API key not valid')) {
        errorMessage = 'Your Google AI API key is missing or invalid. Please add a valid GOOGLE_API_KEY to your .env file and restart the server. Refer to the README.md for instructions.';
      } else if (e.message.includes('503') || e.message.toLowerCase().includes('model is overloaded')) {
          errorMessage = "The analysis service is temporarily busy and could not process the request. This can happen during peak hours. Please try again in a few moments.";
      } else {
        errorMessage = e.message;
      }
    } else if (typeof e === 'string') {
      errorMessage = e;
    }
    
    return {
      threats: null,
      error: errorMessage,
      components: null,
      analyzedDsl: dsl,
      analyzedMethodology: methodology,
    };
  }
}
