import React from 'react';
import PDFExportButton from '../inspections/PDFExportButton';

// Example component showing different PDF export methods
function PDFExportExample() {
  // Sample data for table export
  const tableData = {
    headers: ['Name', 'Age', 'City'],
    rows: [
      ['John Doe', '30', 'New York'],
      ['Jane Smith', '25', 'Los Angeles'],
      ['Bob Johnson', '35', 'Chicago']
    ]
  };

  // Sample text data
  const textData = {
    title: 'Sample Document',
    content: `This is a sample document that will be exported to PDF.
    
    It contains multiple lines of text and demonstrates the text export functionality.
    
    The content can be quite long and will be automatically wrapped to fit the PDF format.`
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">PDF Export Examples</h1>
      
      {/* Content to be exported */}
      <div id="content-to-export" className="bg-white p-6 border rounded-lg shadow-sm mb-6">
        <h2 className="text-xl font-semibold mb-4">Sample Report Content</h2>
        <p className="mb-4">This content will be exported to PDF using HTML conversion methods.</p>
        
        <table className="w-full border-collapse border border-gray-300 mb-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">Column 1</th>
              <th className="border border-gray-300 p-2 text-left">Column 2</th>
              <th className="border border-gray-300 p-2 text-left">Column 3</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-2">Data 1</td>
              <td className="border border-gray-300 p-2">Data 2</td>
              <td className="border border-gray-300 p-2">Data 3</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-2">Data 4</td>
              <td className="border border-gray-300 p-2">Data 5</td>
              <td className="border border-gray-300 p-2">Data 6</td>
            </tr>
          </tbody>
        </table>
        
        <div className="bg-blue-50 p-4 rounded">
          <h3 className="font-semibold mb-2">Important Note</h3>
          <p>This styled content will be preserved in the PDF export.</p>
        </div>
      </div>

      {/* Export buttons with different methods */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border p-4 rounded">
          <h3 className="font-semibold mb-2">HTML to PDF (html2pdf.js)</h3>
          <p className="text-sm text-gray-600 mb-3">Best for complex HTML with styling</p>
          <PDFExportButton 
            contentId="content-to-export"
            filename="html2pdf-export.pdf"
            method="html2pdf"
          />
        </div>
        
        <div className="border p-4 rounded">
          <h3 className="font-semibold mb-2">HTML Canvas Export</h3>
          <p className="text-sm text-gray-600 mb-3">Good for visual content</p>
          <PDFExportButton 
            contentId="content-to-export"
            filename="canvas-export.pdf"
            method="html2canvas"
          />
        </div>
        
        <div className="border p-4 rounded">
          <h3 className="font-semibold mb-2">Text Export</h3>
          <p className="text-sm text-gray-600 mb-3">Simple text-only PDF</p>
          <PDFExportButton 
            method="text"
            filename="text-export.pdf"
            data={textData}
          />
        </div>
        
        <div className="border p-4 rounded">
          <h3 className="font-semibold mb-2">Table Export</h3>
          <p className="text-sm text-gray-600 mb-3">Structured data tables</p>
          <PDFExportButton 
            method="table"
            filename="table-export.pdf"
            data={tableData}
          />
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-semibold mb-2">Installation Requirements</h3>
        <p className="text-sm">To use this functionality, install the required packages:</p>
        <code className="block mt-2 p-2 bg-gray-100 rounded text-sm">
          npm install jspdf html2canvas html2pdf.js@0.9.3 --save
        </code>
      </div>
    </div>
  );
}

export default PDFExportExample;