import type { ThreatSuggestionsOutput } from '@/ai/flows/threat-suggestions';
import type { Component } from './dsl-parser';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Add declaration for autoTable plugin
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export function generateMarkdownReport(
  threatData: ThreatSuggestionsOutput,
  components: Component[],
  dsl: string
): string {
  const componentMap = new Map(components.map((c) => [c.id, c.name]));
  let markdown = `# Threat Model Report\n\n`;

  markdown += `## Architecture Definition\n\n`;
  markdown += `\`\`\`yaml\n${dsl}\n\`\`\`\n\n`;

  markdown += `## Identified Threats\n\n`;
  markdown += `| Severity | Affected Component | Threat Description | Mitigation | CVSS | CVE | CWE |\n`;
  markdown += `|----------|--------------------|--------------------|------------|------|-----|-----|\n`;

  threatData.threats.forEach((threat) => {
    const componentName = componentMap.get(threat.affectedComponentId) || threat.affectedComponentId;
    // Escape pipe characters in the content to avoid breaking the table
    const cleanThreat = threat.threat.replace(/\|/g, '\\|').replace(/\n/g, '<br />');
    const cleanMitigation = threat.mitigation.replace(/\|/g, '\\|').replace(/\n/g, '<br />');
    
    markdown += `| ${threat.severity} | ${componentName} | ${cleanThreat} | ${cleanMitigation} | ${threat.cvss || 'N/A'} | ${threat.cve || 'N/A'} | ${threat.cwe || 'N/A'} |\n`;
  });

  return markdown;
}


export function generatePdfReport(
  threatData: ThreatSuggestionsOutput,
  components: Component[],
  dsl: string
) {
  const doc = new jsPDF();
  const componentMap = new Map(components.map((c) => [c.id, c.name]));

  // Title
  doc.setFontSize(18);
  doc.text('Threat Model Report', 14, 22);

  // Architecture Definition
  doc.setFontSize(12);
  doc.text('Architecture Definition', 14, 32);
  doc.setFontSize(8);
  doc.setFont('courier');
  
  const dslLines = doc.splitTextToSize(dsl, 180);
  doc.text(dslLines, 14, 40);
  const dslHeight = dslLines.length * 3.5; // Estimate height of the DSL block
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);

  const tableBody = threatData.threats.map(threat => ([
    threat.severity,
    componentMap.get(threat.affectedComponentId) || threat.affectedComponentId,
    threat.threat,
    threat.mitigation,
    threat.cvss?.toString() || 'N/A',
    threat.cve || 'N/A',
    threat.cwe || 'N/A'
  ]));

  doc.autoTable({
    startY: 40 + dslHeight,
    head: [['Severity', 'Component', 'Threat', 'Mitigation', 'CVSS', 'CVE', 'CWE']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [63, 81, 181] }, // Primary color: #3F51B5
    didDrawPage: (data) => {
        // Reset header on new pages
        doc.setFontSize(18);
        doc.text('Threat Model Report', 14, 22);
    }
  });

  doc.save('ThreatVisor-Report.pdf');
}
