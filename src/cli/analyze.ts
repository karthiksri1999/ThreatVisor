
import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { parseDsl } from '@/lib/dsl-parser';
import { suggestThreatsAndMitigations, ThreatSuggestionsInput } from '@/ai/flows/threat-suggestions';
import { generateJsonReport, generateMarkdownReport } from '@/lib/exporter';

type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
const SEVERITY_LEVELS: Record<Severity, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

/**
 * Parses command line arguments into a structured object.
 * Example: node analyze.ts ./model.yml --methodology STRIDE
 */
function parseArgs(args: string[]): { [key: string]: string } {
  const parsedArgs: { [key: string]: string } = {};
  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        parsedArgs[key] = value;
        i++; // Skip next element
      } else {
        parsedArgs[key] = 'true'; // Handle boolean flags
      }
    } else if (!parsedArgs.filePath) {
      // The first non-flag argument is the file path
      parsedArgs.filePath = arg;
    }
  }
  return parsedArgs;
}

function printHelp() {
  console.log(`
ThreatVisor CLI - Automated Threat Analysis for CI/CD

Usage:
  npm run analyze -- <filePath> [options]
  tsx src/cli/analyze.ts <filePath> [options]

Arguments:
  filePath              Path to the architecture definition file (YAML or JSON).

Options:
  --methodology         The threat modeling methodology to use.
                        (e.g., STRIDE, LINDDUN, OWASP Top 10). Default: STRIDE.
  --fail-on-severity    Fail the process if threats of this level or higher are found.
                        (e.g., Critical, High, Medium, Low). Default: High.
  --output-path         Path to save the report artifact.
  --output-format       Format for the report artifact.
                        (e.g., md, json). Default: json.
  --help                Show this help message.
`);
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help || !args.filePath) {
    printHelp();
    process.exit(0);
  }

  const {
    filePath,
    methodology = 'STRIDE',
    failOnSeverity = 'High',
    outputPath,
    outputFormat = 'json'
  } = args;

  console.log(`Analyzing threat model: ${filePath}`);
  console.log(`Methodology: ${methodology}, Failing on: ${failOnSeverity}`);

  try {
    const fullPath = path.resolve(process.cwd(), filePath);
    const dslContent = await fs.readFile(fullPath, 'utf-8');

    // 1. Parse and Validate DSL
    const parsedDsl = parseDsl(dslContent);
    console.log('✅ Architecture definition parsed successfully.');

    // 2. Run Threat Analysis
    const analysisInput: ThreatSuggestionsInput = {
      architectureDescription: dslContent,
      threatModelingMethodology: methodology as any,
    };
    const results = await suggestThreatsAndMitigations(analysisInput);

    if (!results || !results.threats) {
      throw new Error('Analysis returned no threats.');
    }
    console.log(`✅ Analysis complete. Found ${results.threats.length} potential threats.`);
    
    // 3. Export Report
    if (outputPath) {
        let reportContent = '';
        const components = parsedDsl.components;
        if (outputFormat === 'md') {
            reportContent = generateMarkdownReport(results, components, dslContent, null);
        } else {
            reportContent = generateJsonReport(results, components, dslContent);
        }
        
        const reportPath = path.resolve(process.cwd(), outputPath);
        await fs.writeFile(reportPath, reportContent);
        console.log(`✅ Report saved to ${reportPath}`);
    }


    // 4. Check for Failure Conditions
    const failLevel = SEVERITY_LEVELS[failOnSeverity as Severity];
    if (!failLevel) {
      throw new Error(`Invalid severity level for --fail-on-severity: ${failOnSeverity}`);
    }

    const criticalThreats = results.threats.filter(
      (threat) => SEVERITY_LEVELS[threat.severity as Severity] >= failLevel
    );

    if (criticalThreats.length > 0) {
      console.error('\n--------------------------------------------------');
      console.error(`❌ FAILURE: Found ${criticalThreats.length} threats at or above "${failOnSeverity}" severity.`);
      criticalThreats.forEach(t => {
        console.error(`  - [${t.severity}] ${t.threat} (Component: ${t.affectedComponentId})`);
      });
      console.error('--------------------------------------------------');
      process.exit(1);
    } else {
      console.log('\n✅ SUCCESS: No threats found at or above the specified failure severity.');
      process.exit(0);
    }
  } catch (error: any) {
    console.error('\n--------------------------------------------------');
    console.error('❌ An error occurred during analysis:');
    console.error(error.message || error);
    console.error('--------------------------------------------------');
    process.exit(1);
  }
}

main();
