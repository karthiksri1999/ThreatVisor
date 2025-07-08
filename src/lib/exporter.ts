
import type { ThreatSuggestionsOutput } from '@/ai/flows/threat-suggestions';
import type { Component } from './dsl-parser';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


export function generateMarkdownReport(
  threatData: ThreatSuggestionsOutput,
  components: Component[],
  dsl: string,
  diagramSvg?: string | null
): string {
  const componentMap = new Map(components.map((c) => [c.id, c.name]));
  let markdown = `# Threat Model Report\n\n`;

  markdown += `## Architecture Definition\n\n`;
  markdown += `\`\`\`yaml\n${dsl}\n\`\`\`\n\n`;

  if (diagramSvg) {
    markdown += `## Diagram\n\n`;
    // Embed SVG directly in Markdown
    markdown += `${diagramSvg}\n\n`;
  }

  markdown += `## Identified Threats\n\n`;
  markdown += `| Severity | Affected Component | Threat Description | Mitigation | CVSS | CVE | CWE |\n`;
  markdown += `|----------|--------------------|--------------------|------------|------|-----|-----|\n`;

  threatData.threats.forEach((threat) => {
    const componentName = componentMap.get(threat.affectedComponentId) || threat.affectedComponentId;
    // Escape pipe characters in the content to avoid breaking the table
    const cleanThreat = threat.threat.replace(/\|/g, '\\|').replace(/\n/g, '<br />');
    const cleanMitigation = threat.mitigation.replace(/\|/g, '\\|').replace(/\n/g, '<br />');
    
    // CVE and CWE were swapped in a previous version, ensuring they are correct now.
    markdown += `| ${threat.severity} | ${componentName} | ${cleanThreat} | ${cleanMitigation} | ${threat.cvss?.toFixed(1) || 'N/A'} | ${threat.cve || 'N/A'} | ${threat.cwe || 'N/A'} |\n`;
  });

  return markdown;
}


export function generateJsonReport(
  threatData: ThreatSuggestionsOutput,
  components: Component[],
  dsl: string
): string {
  const componentMap = new Map(components.map((c) => [c.id, c.name]));
  const report = {
    metadata: {
      generatedAt: new Date().toISOString(),
      componentCount: components.length,
      threatCount: threatData.threats.length,
    },
    dsl,
    threats: threatData.threats.map(threat => ({
        ...threat,
        affectedComponentName: componentMap.get(threat.affectedComponentId) || threat.affectedComponentId,
    })),
  };
  return JSON.stringify(report, null, 2);
}


export async function generatePdfReport(
  threatData: ThreatSuggestionsOutput,
  components: Component[],
  dsl: string
) {
  const doc = new jsPDF({ orientation: 'l', unit: 'px', format: 'a4' });
  const componentMap = new Map(components.map((c) => [c.id, c.name]));

  const margin = 40;
  const docWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = docWidth - margin * 2;
  
  // Title
  doc.setFontSize(24);
  doc.text('Threat Model Report', margin, margin + 10);

  let currentY = margin + 40;

  // Architecture Definition
  doc.setFontSize(16);
  doc.text('Architecture Definition', margin, currentY);
  currentY += 20;

  doc.setFontSize(9);
  doc.setFont('courier');
  
  const dslLines = doc.splitTextToSize(dsl, contentWidth);
  const lineHeight = doc.getLineHeight();

  dslLines.forEach((line: string) => {
    if (currentY + lineHeight > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
    }
    doc.text(line, margin, currentY);
    currentY += lineHeight;
  });

  // Add some space after the DSL block
  currentY += 20;

  // Threats Table
  doc.setFont('helvetica', 'normal');

  const tableBody = threatData.threats.map(threat => ([
    threat.severity,
    componentMap.get(threat.affectedComponentId) || threat.affectedComponentId,
    threat.threat,
    threat.mitigation,
    threat.cvss?.toFixed(1) || 'N/A',
    threat.cve || 'N/A',
    threat.cwe || 'N/A'
  ]));

  autoTable(doc, {
    startY: currentY,
    head: [['Severity', 'Component', 'Threat', 'Mitigation', 'CVSS', 'CVE', 'CWE']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [63, 81, 181] }, // Primary color: #3F51B5
    styles: {
      cellPadding: 3,
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 80 },
      2: { cellWidth: 'auto' }, // Threat
      3: { cellWidth: 'auto' }, // Mitigation
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 70 },
      6: { cellWidth: 60 }
    }
  });

  doc.save('ThreatVisor-Report.pdf');
}
