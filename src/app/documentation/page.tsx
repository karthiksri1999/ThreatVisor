import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function DocumentationPage() {
  const exampleDsl = `components:
  - id: user
    name: End User
    type: actor
  - id: web_app
    name: Web Application
    type: service
  - id: database
    name: App Database
    type: datastore

data_flows:
  - from: user
    to: web_app
    label: "HTTPS Request"
  - from: web_app
    to: database
    label: "SQL Query"

trust_boundaries:
  - id: public
    label: "Public Internet"
    components: [user]
  - id: private_network
    label: "Private VPC"
    components: [web_app, database]`;

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-8">
      <h1 className="text-4xl font-bold tracking-tight mb-4 text-primary">ThreatVisor Documentation</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Welcome to ThreatVisor, a tool for modeling application architectures and automatically identifying security threats.
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-semibold tracking-tight mb-4 border-b pb-2">Getting Started</h2>
        <p className="mb-4">Using ThreatVisor is a simple three-step process:</p>
        <ol className="list-decimal list-inside space-y-3 bg-secondary/30 p-6 rounded-lg">
          <li>
            <strong className="font-semibold">Define Your Architecture:</strong> Use our simple YAML or JSON-based DSL to describe your system's components, data flows, and trust boundaries in the editor on the main page. You can start with one of the pre-built templates.
          </li>
          <li>
            <strong className="font-semibold">Select a Methodology:</strong> Choose a standard threat modeling methodology like STRIDE, OWASP Top 10, or others from the dropdown menu. This guides the analysis.
          </li>
          <li>
            <strong className="font-semibold">Analyze & Review:</strong> Click "Analyze Threats" and let the system perform a comprehensive security analysis. Review the results in the "Threats" and "Diagram" tabs.
          </li>
        </ol>
      </section>
      
      <section className="mb-12">
        <h2 className="text-3xl font-semibold tracking-tight mb-4 border-b pb-2">Architecture Definition (DSL)</h2>
        <p className="mb-4">
          The core of ThreatVisor is its Domain-Specific Language (DSL) for defining architectures. You can use either YAML (recommended for readability) or JSON. The structure consists of three main keys: <Badge variant="secondary">components</Badge>, <Badge variant="secondary">data_flows</Badge>, and an optional <Badge variant="secondary">trust_boundaries</Badge>.
        </p>

        <Card>
            <CardHeader>
                <CardTitle>Full DSL Example</CardTitle>
            </CardHeader>
            <CardContent>
                <pre className="bg-muted p-4 rounded-md overflow-x-auto font-code text-sm text-card-foreground">
                    {exampleDsl}
                </pre>
            </CardContent>
        </Card>
      </section>
      
      <section className="mb-12">
        <h3 className="text-2xl font-semibold tracking-tight mt-8 mb-4">Components</h3>
        <p className="mb-4">Components are the fundamental building blocks of your system, like users, services, or databases.</p>
        <Table className="mb-4 border rounded-lg">
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-mono">id</TableCell>
              <TableCell>string</TableCell>
              <TableCell>Yes</TableCell>
              <TableCell>A unique identifier for the component. Used in data flows and trust boundaries.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono">name</TableCell>
              <TableCell>string</TableCell>
              <TableCell>Yes</TableCell>
              <TableCell>A human-readable name for the component.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono">type</TableCell>
              <TableCell>string</TableCell>
              <TableCell>Yes</TableCell>
              <TableCell>The type of component. Supported types for specific icons are <Badge variant="outline">actor</Badge>, <Badge variant="outline">service</Badge>, and <Badge variant="outline">datastore</Badge>.</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      <section className="mb-12">
        <h3 className="text-2xl font-semibold tracking-tight mt-8 mb-4">Data Flows</h3>
        <p className="mb-4">Data flows represent the connections and interactions between your components.</p>
         <Table className="mb-4 border rounded-lg">
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-mono">from</TableCell>
              <TableCell>string</TableCell>
              <TableCell>Yes</TableCell>
              <TableCell>The <code className="font-mono text-sm bg-muted p-1 rounded">id</code> of the component where the flow originates.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono">to</TableCell>
              <TableCell>string</TableCell>
              <TableCell>Yes</TableCell>
              <TableCell>The <code className="font-mono text-sm bg-muted p-1 rounded">id</code> of the component where the flow terminates.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono">label</TableCell>
              <TableCell>string</TableCell>
              <TableCell>Yes</TableCell>
              <TableCell>A description of the data or interaction. This will be shown on the diagram.</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      <section className="mb-12">
        <h3 className="text-2xl font-semibold tracking-tight mt-8 mb-4">Trust Boundaries</h3>
        <p className="mb-4">Trust boundaries are optional logical perimeters that group components with the same level of trust.</p>
         <Table className="mb-4 border rounded-lg">
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-mono">id</TableCell>
              <TableCell>string</TableCell>
              <TableCell>Yes</TableCell>
              <TableCell>A unique identifier for the boundary.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono">label</TableCell>
              <TableCell>string</TableCell>
              <TableCell>Yes</TableCell>
              <TableCell>A human-readable name for the boundary (e.g., "Private VPC", "Public Internet").</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono">components</TableCell>
              <TableCell>array of strings</TableCell>
              <TableCell>Yes</TableCell>
              <TableCell>A list of component <code className="font-mono text-sm bg-muted p-1 rounded">id</code>s that belong inside this boundary.</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-semibold tracking-tight mb-4 border-b pb-2">Threat Modeling Methodologies</h2>
        <p className="mb-4">
          ThreatVisor supports several industry-standard methodologies. The analysis will be framed by the one you choose.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>STRIDE</CardTitle></CardHeader>
            <CardContent>Focuses on Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of Privilege.</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>LINDDUN</CardTitle></CardHeader>
            <CardContent>A privacy-focused methodology analyzing Linkability, Identifiability, Non-repudiation, Detectability, and more.</CardContent>
          </Card>
           <Card>
            <CardHeader><CardTitle>OWASP Top 10</CardTitle></CardHeader>
            <CardContent>Analyzes the architecture against the most common web application security risks.</CardContent>
          </Card>
           <Card>
            <CardHeader><CardTitle>PASTA</CardTitle></CardHeader>
            <CardContent>A risk-centric methodology that aligns business objectives with technical security requirements.</CardContent>
          </Card>
        </div>
      </section>
      
      <section>
        <h2 className="text-3xl font-semibold tracking-tight mb-4 border-b pb-2">Exporting Reports</h2>
        <p className="mb-4">
        Once an analysis is complete, you can export a comprehensive report in multiple formats using the buttons in the configuration panel.
        </p>
        <ul className="list-disc list-inside space-y-2">
              <li><strong>PDF:</strong> Generates a professional, multi-page PDF document containing the architecture definition, diagram, and a detailed table of all identified threats.</li>
              <li><strong>Markdown:</strong> Generates a clean Markdown file with the same information, perfect for version control, wikis, or other documentation systems.</li>
        </ul>
      </section>
    </div>
  );
}
