
import type { ThreatSuggestionsOutput } from '@/ai/flows/threat-suggestions';
import type { Component } from './dsl-parser';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


export function generateMarkdownReport(
  threatData: ThreatSuggestionsOutput,
  components: Component[],
  dsl: string,
  diagramSvg: string
): string {
  const componentMap = new Map(components.map((c) => [c.id, c.name]));
  let markdown = `# Threat Model Report\n\n`;

  markdown += `## Architecture Definition\n\n`;
  markdown += `\`\`\`yaml\n${dsl}\n\`\`\`\n\n`;

  if (diagramSvg) {
    markdown += `## Diagram\n\n`;
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
    
    markdown += `| ${threat.severity} | ${componentName} | ${cleanThreat} | ${cleanMitigation} | ${threat.cvss || 'N/A'} | ${threat.cwe || 'N/A'} | ${threat.cve || 'N/A'} |\n`;
  });

  return markdown;
}


export async function generatePdfReport(
  threatData: ThreatSuggestionsOutput,
  components: Component[],
  dsl: string,
  diagramSvg: string
) {
  const doc = new jsPDF({ orientation: 'l', unit: 'px', format: 'a4' });
  const componentMap = new Map(components.map((c) => [c.id, c.name]));

  const margin = 40;
  const docWidth = doc.internal.pageSize.getWidth();
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
  doc.text(dslLines, margin, currentY);
  currentY += dslLines.length * 9 + 20;

  // Diagram
  if (diagramSvg) {
    if (currentY > doc.internal.pageSize.getHeight() - 200) { // Check if there's enough space for diagram
        doc.addPage();
        currentY = margin;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(16);
    doc.text('Diagram', margin, currentY);
    currentY += 20;
    
    // jsPDF's addImage supports SVG content directly
    doc.addImage(diagramSvg, 'SVG', margin, currentY, contentWidth, contentWidth / 2);
    currentY += (contentWidth / 2) + 20;
  }
  
  // Threats Table
  doc.setFont('helvetica', 'normal');

  const tableBody = threatData.threats.map(threat => ([
    threat.severity,
    componentMap.get(threat.affectedComponentId) || threat.affectedComponentId,
    threat.threat,
    threat.mitigation,
    threat.cvss?.toString() || 'N/A',
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
      2: { cellWidth: 'auto' }, // Threat
      3: { cellWidth: 'auto' }, // Mitigation
    }
  });

  doc.save('ThreatVisor-Report.pdf');
}
