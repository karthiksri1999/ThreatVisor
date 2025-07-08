
import type { ThreatSuggestionsOutput } from '@/ai/flows/threat-suggestions';
import type { Component } from './dsl-parser';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


// Helper function to convert SVG to PNG data URL for PDF embedding
async function svgToPngDataUrl(svg: string, width: number, height: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      
      // Use a scaling factor for better resolution in the PDF
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
  
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }
      
      ctx.scale(scale, scale);
  
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        const pngDataUrl = canvas.toDataURL('image/png');
        resolve(pngDataUrl);
      };
  
      img.onerror = () => {
        reject(new Error('Failed to load SVG into image. This may be due to external resources like fonts in the SVG that cannot be loaded for security reasons.'));
      };
  
      // Ensure SVG has xmlns attribute which is sometimes required for data URI loading
      const svgWithXmlns = svg.startsWith('<svg') 
        ? svg.replace(/<svg/, '<svg xmlns="http://www.w3.org/2000/svg"') 
        : `<?xml version="1.0" standalone="no"?>\r\n${svg}`;

      // Use a Base64 data URI to load the SVG into the image.
      // This helps avoid cross-origin security restrictions that can occur with blob URLs.
      // The btoa-encodeURIComponent trick is to handle UTF-8 characters correctly.
      const dataUri = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgWithXmlns)));
      img.src = dataUri;
    });
}


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
    
    const diagramWidth = contentWidth;
    const diagramHeight = contentWidth / 2;

    try {
        const pngDataUrl = await svgToPngDataUrl(diagramSvg, diagramWidth, diagramHeight);
        doc.addImage(pngDataUrl, 'PNG', margin, currentY, diagramWidth, diagramHeight);
        currentY += diagramHeight + 20;
    } catch(e) {
        console.error("Failed to convert SVG to PNG for PDF export:", e);
        doc.setFontSize(10);
        doc.setTextColor(255, 0, 0); // Red
        doc.text("Could not render diagram due to a processing error.", margin, currentY);
        doc.setTextColor(0, 0, 0); // Reset to black
        currentY += 20;
    }
  }
  
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
