import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { exportInspectionReport, createExampleReport } from "../utils/pdfExporter";
import EnhancedPDFExportButton from "../inspections/EnhancedPDFExportButton";
import { toast } from "sonner";

function PDFExportTest() {
  const [isTestingBasic, setIsTestingBasic] = useState(false);
  const [isTestingCustom, setIsTestingCustom] = useState(false);
  const [customData, setCustomData] = useState({
    title: 'Custom Inspection Report',
    inspector: 'Test Inspector',
    location: 'Test Location',
    clientName: 'Test Client'
  });

  const handleBasicTest = async () => {
    setIsTestingBasic(true);
    try {
      console.log('Testing basic PDF export...');
      const reportData = createExampleReport();
      await exportInspectionReport(reportData, 'sample-inspection-report.pdf');
      toast.success('Sample PDF generated successfully!');
    } catch (error) {
      toast.error('Error: ' + error.message);
      console.error(error);
    } finally {
      setIsTestingBasic(false);
    }
  };

  const handleCustomTest = async () => {
    setIsTestingCustom(true);
    try {
      const reportData = {
        ...customData,
        date: new Date().toLocaleDateString(),
        sections: [
          {
            title: 'Test Section',
            content: 'This is a test section with some content.',
            findings: [
              { point: 'Test Point 1', status: 'Pass', comments: 'Everything looks good' },
              { point: 'Test Point 2', status: 'Warning', comments: 'Needs attention' }
            ],
            status: 'Warning'
          }
        ],
        summary: 'This is a test summary for the custom report.',
        recommendations: ['Test recommendation 1', 'Test recommendation 2']
      };
      
      await exportInspectionReport(reportData, 'custom-test-report.pdf');
      toast.success('Custom PDF generated successfully!');
    } catch (error) {
      toast.error('Error: ' + error.message);
      console.error(error);
    } finally {
      setIsTestingCustom(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Enhanced PDF Export System</h1>
        <p className="text-gray-600">Test the new PDF export functionality with different report types</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📋 Sample Report Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Test with a pre-configured sample report that includes images, sections, and recommendations.
            </p>
            <Button 
              onClick={handleBasicTest}
              disabled={isTestingBasic}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isTestingBasic ? 'Generating...' : 'Generate Sample PDF'}
            </Button>
          </CardContent>
        </Card>

        {/* Custom Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⚙️ Custom Report Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="title">Report Title</Label>
                <Input
                  id="title"
                  value={customData.title}
                  onChange={(e) => setCustomData({...customData, title: e.target.value})}
                  placeholder="Enter report title"
                />
              </div>
              <div>
                <Label htmlFor="inspector">Inspector</Label>
                <Input
                  id="inspector"
                  value={customData.inspector}
                  onChange={(e) => setCustomData({...customData, inspector: e.target.value})}
                  placeholder="Inspector name"
                />
              </div>
              <div>
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  value={customData.clientName}
                  onChange={(e) => setCustomData({...customData, clientName: e.target.value})}
                  placeholder="Client name"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={customData.location}
                  onChange={(e) => setCustomData({...customData, location: e.target.value})}
                  placeholder="Property location"
                />
              </div>
            </div>
            <Button 
              onClick={handleCustomTest}
              disabled={isTestingCustom}
              className="w-full"
            >
              {isTestingCustom ? 'Generating...' : 'Generate Custom PDF'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Button Component Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔧 Enhanced Component Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Test the EnhancedPDFExportButton component with custom data:
          </p>
          <div className="flex gap-4 flex-wrap">
            <EnhancedPDFExportButton
              customData={createExampleReport()}
              filename="enhanced-component-test.pdf"
            />
            <EnhancedPDFExportButton
              customData={{
                title: 'Quick Test Report',
                inspector: 'Component Tester',
                location: 'Test Location',
                clientName: 'Test Client',
                summary: 'This is a quick test of the enhanced component.',
                recommendations: ['Test recommendation']
              }}
              filename="quick-component-test.pdf"
            />
          </div>
        </CardContent>
      </Card>

      {/* Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle>📖 Usage Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Basic Usage:</h4>
            <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
{`const reportData = {
  title: 'Building Inspection',
  inspector: 'John Doe',
  location: 'Main Building',
  clientName: 'Sarah Johnson',
  sections: [{ 
    title: 'Safety', 
    content: 'All systems operational', 
    status: 'pass' 
  }],
  summary: 'Building is in good condition',
  recommendations: ['Regular maintenance schedule']
};

await exportInspectionReport(reportData, 'building-inspection.pdf');`}
            </pre>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">With Component:</h4>
            <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
{`<EnhancedPDFExportButton
  inspection={inspectionData}
  client={clientData}
  property={propertyData}
  filename="custom-report.pdf"
/>`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Installation Instructions */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-800">📦 Installation Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-yellow-700 mb-3">
            This enhanced PDF export system loads libraries dynamically from CDN, but for optimal performance, install them locally:
          </p>
          <pre className="bg-yellow-100 p-3 rounded text-sm text-yellow-800 overflow-x-auto">
            npm install jspdf html2canvas --save
          </pre>
          <p className="text-yellow-700 text-sm mt-2">
            The system will fall back to CDN loading if local packages are not available.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default PDFExportTest;