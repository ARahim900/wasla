
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Inspection, Property, Client } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { createPageUrl } from "@/utils";

// ReportTemplate component with enhanced A4 formatting
function ReportTemplate({ inspection, client, property }) {
  const clientName = inspection?.client_name || client?.name || "N/A";
  const inspectorName = inspection?.inspector_name || "Professional Inspector";
  const inspectionDate = inspection?.inspection_date
    ? new Date(inspection.inspection_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "N/A";

  return (
    <div className="bg-white">
      {/* Cover Page 1 */}
      <div className="report-page">
        <div className="text-center mb-12">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/fcd6de133_IMG_5412.png"
            alt="Wasla Logo"
            className="w-40 h-auto mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-wide">PROPERTY INSPECTION REPORT</h1>
        </div>

        <div className="grid grid-cols-2 gap-12 text-base leading-relaxed">
          <div>
            <h2 className="font-bold text-xl mb-6 text-slate-800 border-b-2 border-slate-200 pb-2">OVERVIEW</h2>
            <p className="mb-6"><strong>Dear Mr. {clientName},</strong></p>
            <p className="mb-6">Thank you for choosing Wasla Real Estate Solutions as your home inspector. Your prospective home is basically in grade () as per our inspection and classifications. However, a number of rather typical inspection issues were identified.</p>
            <p className="mb-6">Please review the annexed report carefully before making your decision. If you need further explanation regarding this property conditions, please don't hesitate to call or email us from 9:00 am to 5:00 PM at:</p>
            <p className="mb-3"><strong>Email:</strong> wasla.solution@gmail.com</p>
            <p className="mb-6"><strong>Mobile:</strong> +968 90699799</p>
          </div>

          <div style={{ direction: "rtl", textAlign: "right" }}>
            <h2 className="font-bold text-xl mb-6 text-slate-800 border-b-2 border-slate-200 pb-2">نظرة عامة</h2>
            <p className="mb-6"><strong>الأفاضل/ {clientName} المحترمون،</strong></p>
            <p className="mb-6">نشكر لكم اختياركم "وصلة للحلول العقارية" للقيام بفحص العقار الخاص بكم. وفقًا للفحص والتصنيف المعتمد لدينا، فإن العقار الذي ترغبون في شرائه يقع ضمن الدرجة ()، مع وجود بعض الملاحظات التي تُعد شائعة في عمليات الفحص العقاري.</p>
            <p className="mb-6">يرجى مراجعة التقرير المرفق بعناية قبل اتخاذ قراركم النهائي، وإذا كنتم بحاجة إلى توضيحات إضافية حول حالة العقار، فلا تترددوا بالتواصل معنا عبر الهاتف أو البريد الإلكتروني من الساعة 9 صباحًا حتى 5 مساءً على وسائل التواصل التالية:</p>
            <p className="mb-3"><strong>البريد الإلكتروني:</strong> wasla.solution@gmail.com</p>
            <p className="mb-6"><strong>الهاتف:</strong> +968 90699799</p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-12 text-base leading-relaxed">
          <div>
            <h3 className="font-bold mb-4 text-lg">No property is perfect.</h3>
            <p className="mb-6">Every building has imperfections or items that are ready for maintenance. It's the inspector's task to discover and report these so you can make informed decisions. This report should not be used as a tool to demean property, but rather as a way to illuminate the realities of the property.</p>

            <h3 className="font-bold mb-4 text-lg">This report is not an appraisal.</h3>
            <p className="mb-6">When an appraiser determines worth, only the most obvious conditions of a property are taken into account to establish a safe loan amount. In effect, the appraiser is representing the interests of the lender. Home inspectors focus more on the interests of the prospective buyer; and, although inspectors must be careful not to make any statements relating to property value, their findings can help buyers more completely understand the true costs of ownership.</p>
          </div>

          <div style={{ direction: "rtl", textAlign: "right" }}>
            <h3 className="font-bold mb-4 text-lg">لا يوجد عقار مثالي</h3>
            <p className="mb-6">كل عقار يحتوي على بعض العيوب أو الأجزاء التي تحتاج إلى صيانة. دور المفتش هو تحديد هذه النقاط وتقديمها بوضوح لمساعدتكم في اتخاذ قرارات مستنيرة. هذا التقرير لا يُقصد به التقليل من قيمة العقار، وإنما يهدف إلى توضيح الحالة الواقعية له.</p>

            <h3 className="font-bold mb-4 text-lg">هذا التقرير ليس تقييمًا سعريًا</h3>
            <p className="mb-6">عند قيام المثمن بتحديد قيمة العقار، فإنه يأخذ بعين الاعتبار فقط العيوب الظاهرة لتقدير مبلغ قرض آمن. بمعنى آخر، فإن المثمن يُمثل مصلحة الجهة المُقرضة. أما فاحص العقار، فيركز على مصلحة المشتري المحتمل. ورغم أن المفتش لا يحدد قيمة العقار، إلا أن نتائج الفحص تساعد المشتري في فهم التكاليف الحقيقية لامتلاك العقار.</p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-12 text-base leading-relaxed">
          <div>
            <h3 className="font-bold mb-4 text-lg">Maintenance costs are normal.</h3>
            <p className="mb-8">Homeowners should plan to spend around 1% of the total value of a property in maintenance costs, annually. (Annual costs of rental property maintenance are often 2%, or more.) If considerably less than this percentage has been invested during several years preceding an inspection, the property will usually show the obvious signs of neglect; and the new property owners may be required to invest significant time and money to address accumulated maintenance needs.</p>

            <h3 className="font-bold mb-4 text-lg">SCOPE OF THE INSPECTION:</h3>
            <p>This report details the outcome of a visual survey of the property detailed in the annexed</p>
          </div>
          <div style={{ direction: "rtl", textAlign: "right" }}>
            <h3 className="font-bold mb-4 text-lg">تكاليف الصيانة أمر طبيعي</h3>
            <p className="mb-8">ينبغي على مالكي العقارات تخصيص ما يُعادل 1% من قيمة العقار سنويًا لأعمال الصيانة الدورية. أما العقارات المؤجرة فقد تصل النسبة إلى 2% أو أكثر. وإذا لم يتم استثمار هذه النسبة على مدى عدة سنوات، فستظهر مؤشرات واضحة على الإهمال، مما يُحتم على المالك الجديد دفع تكاليف كبيرة لاحقًا لمعالجة هذه الإهمالات.</p>

            <h3 className="font-bold mb-4 text-lg">نطاق الفحص:</h3>
            <p>يوضح هذا التقرير نتيجة الفحص البصري للعقار كما هو مفصل في قائمة الفحص المرفقة، بهدف تقييم جودة التنفيذ مقارنة بالمعايير المعتمدة.</p>
          </div>
        </div>
      </div>

      {/* Cover Page 2 */}
      <div className="report-page">
        <div className="grid grid-cols-2 gap-12 text-base leading-relaxed mb-8">
          <div>
            <p className="mb-6">inspection checklist in order to check the quality of workmanship against applicable standards. It covers both the interior and the exterior of the property as well as garden, driveway and garage if relevant. Areas not inspected, for whatever reason, cannot guarantee that these areas are free from defects.</p>
            <p className="mb-6">This report was formed as per the client request as a supportive opinion to enable him to have better understanding about property conditions. Our opinion does not study the property value or the engineering of the structure rather it studies the functionality of the property. This report will be listing the property defects supported by images and videos, by showing full study of the standards of property status and functionality including other relevant elements of the property as stated in the checklist.</p>
          </div>
          <div style={{ direction: "rtl", textAlign: "right" }}>
            <p className="mb-6">يشمل الفحص المناطق الداخلية والخارجية، بالإضافة إلى الحديقة، والممر، والجراج (إن وُجد). كما لا يمكن ضمان خلو المناطق غير المفحوصة من العيوب لأي سببٍ كان.</p>
            <p className="mb-6">وقد تم إعداد هذا التقرير بناءً على طلب العميل لتقديم رأي داعم يساعده على فهم حالة العقار بشكل أفضل. رأينا الفني لا يشمل تقييم القيمة السوقية أو التحليل الإنشائي، بل يركز على حالة العقار ووظائفه العامة. كما سيتم سرد العيوب المرصودة بناءً على دراسة كاملة لمعايير الحالة والأداء الوظيفي للعقار مشمولة بالصور والفيديوهات، إلى جانب العناصر الأخرى ذات الصلة كما هو موضح في قائمة الفحص.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 text-base leading-relaxed mb-16">
          <div>
            <h3 className="font-bold mb-6 text-xl border-b-2 border-slate-200 pb-2">CONFIDENTIALITY OF THE REPORT:</h3>
            <p>The inspection report is to be prepared for the Client for the purpose of informing of the major deficiencies in the condition of the subject property and is solely and exclusively for Client's own information and may not be relied upon by any other person. Client may distribute copies of the inspection report to the seller and the real estate agents directly involved in this transaction, but Client and Inspector do not in any way intend to benefit said seller or the real estate agents directly or indirectly through this Agreement or the inspection report. In the event that the inspection report has been prepared for the SELLER of the subject property, an authorized representative of Wasla Real Estate Solutions will return to the property, for a fee, to meet with the BUYER for a consultation to provide a better understanding of the reported conditions and answer.</p>
          </div>

          <div style={{ direction: "rtl", textAlign: "right" }}>
            <h3 className="font-bold mb-6 text-xl border-b-2 border-slate-200 pb-2">سرية التقرير:</h3>
            <p>تم إعداد تقرير الفحص هذا خصيصًا للعميل بغرض إعلامه بالنواقص الجوهرية في حالة العقار محل الفحص، وهو للاستخدام الشخصي فقط ولا يجوز الاعتماد عليه من قبل أي طرف آخر. يجوز للعميل مشاركة نسخة من التقرير مع البائع أو وكلاء العقارات المعنيين بهذه الصفقة، إلا أن كل من العميل والفاحص لا يقصدان من خلال هذا التقرير تحقيق أي منفعة مباشرة أو غير مباشرة لهؤلاء الأطراف. وفي حال تم إعداد هذا التقرير بطلب من البائع، فإن ممثلًا معتمدًا من شركة وصلة لحلول العقار سيعود إلى العقار – مقابل رسوم – لعقد جلسة استشارية مع المشتري بهدف توضيح الملاحظات الواردة في التقرير والإجابة عن استفساراته.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 text-base mb-16">
          <div>
            <div className="space-y-6">
              <div className="flex justify-between border-b border-slate-300 pb-3">
                <span><strong>Client Name:</strong></span>
                <span className="font-medium">{clientName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-300 pb-3">
                <span><strong>Signature:</strong></span>
                <span>_________________________</span>
              </div>
              <div className="flex justify-between border-b border-slate-300 pb-3">
                <span><strong>Prepared by:</strong></span>
                <span className="font-medium">{inspectorName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-300 pb-3">
                <span><strong>Stamp:</strong></span>
                <span>_________________________</span>
              </div>
              <div className="flex justify-between border-b border-slate-300 pb-3">
                <span><strong>Date:</strong></span>
                <span className="font-medium">{inspectionDate}</span>
              </div>
            </div>
          </div>
          <div style={{ direction: "rtl", textAlign: "right" }}>
            <div className="space-y-6">
              <div className="flex justify-between border-b border-slate-300 pb-3">
                <span className="font-medium">{clientName}</span>
                <span><strong>اسم العميل:</strong></span>
              </div>
              <div className="flex justify-between border-b border-slate-300 pb-3">
                <span>_________________________</span>
                <span><strong>التوقيع:</strong></span>
              </div>
              <div className="flex justify-between border-b border-slate-300 pb-3">
                <span className="font-medium">{inspectorName}</span>
                <span><strong>أعد التقرير بواسطة:</strong></span>
              </div>
              <div className="flex justify-between border-b border-slate-300 pb-3">
                <span>_________________________</span>
                <span><strong>الختم:</strong></span>
              </div>
              <div className="flex justify-between border-b border-slate-300 pb-3">
                <span className="font-medium">{inspectionDate}</span>
                <span><strong>التاريخ:</strong></span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center font-bold mb-12 text-lg">Property Inspection report is annexed | مرفق تقرير الفحص</p>

        <table className="w-full border-collapse text-center text-base mx-auto max-w-4xl">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-400 p-4 font-bold">Grade</th>
              <th className="border border-slate-400 p-4 font-bold">AAA</th>
              <th className="border border-slate-400 p-4 font-bold">AA</th>
              <th className="border border-slate-400 p-4 font-bold">A</th>
              <th className="border border-slate-400 p-4 font-bold">B</th>
              <th className="border border-slate-400 p-4 font-bold">C</th>
              <th className="border border-slate-400 p-4 font-bold">D</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-400 p-4 font-bold bg-slate-50">Description</td>
              <td className="border border-slate-400 p-4">Excellent</td>
              <td className="border border-slate-400 p-4">Very Good</td>
              <td className="border border-slate-400 p-4">Good</td>
              <td className="border border-slate-400 p-4">Meeting the standards</td>
              <td className="border border-slate-400 p-4">Acceptable</td>
              <td className="border border-slate-400 p-4">Require maintenance</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Main Report Content */}
      <div id="report-content" className="report-page">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-center mb-8 text-slate-900">INSPECTION DETAILS</h1>
          <div className="grid grid-cols-2 gap-6 mb-8 text-base">
            <div><strong>Client:</strong> {inspection?.client_name}</div>
            <div><strong>Inspector:</strong> {inspection?.inspector_name}</div>
            <div><strong>Date:</strong> {inspection?.inspection_date ? new Date(inspection.inspection_date).toISOString().split("T")[0] : "-"}</div>
            <div><strong>Property Type:</strong> {inspection?.property_type}</div>
          </div>
        </div>
        {inspection?.areas?.map((area) => (
          <div key={area.id} className="mb-12">
            <h2 className="text-2xl font-bold bg-primary/10 text-primary p-4 rounded mb-6">{area.name}</h2>
            {area.items?.map((item) => (
              <div key={item.id} className="border border-slate-300 rounded p-6 mb-6 bg-slate-50">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-lg">{item.point}</h3>
                  <span className={`px-3 py-1 rounded font-bold ${
                    item.status === 'Pass' ? 'bg-green-100 text-green-800' :
                    item.status === 'Fail' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <div className="text-base text-gray-600 mb-4">
                  <strong>Location:</strong> {item.location || 'N/A'}
                </div>
                <div className="text-base mb-4">
                  <strong>Comments:</strong> {item.comments || 'No comments'}
                </div>
                {item.photos?.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    {item.photos.map((photo, idx) => (
                      <img key={idx} src={photo.url} alt={photo.name} className="w-full h-48 object-cover rounded border" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InspectionReport() {
  const navigate = useNavigate();
  const [inspection, setInspection] = useState(null);
  const [property, setProperty] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // Load inspection, property, client
      const res = await Inspection.filter({ id });
      const ins = res?.[0];
      if (!ins) {
        setLoading(false);
        return;
      }
      setInspection(ins);
      const [propRes, cliRes] = await Promise.all([
        ins.property_id ? Property.filter({ id: ins.property_id }) : Promise.resolve([null]),
        ins.client_id ? Client.filter({ id: ins.client_id }) : Promise.resolve([null])
      ]);
      setProperty(propRes?.[0] || null);
      setClient(cliRes?.[0] || null);
      setLoading(false);
    };
    if (id) load();
    else setLoading(false);
  }, [id]);

  const handlePrint = () => {
    // Use browser's print to save to PDF, avoids external libs and is reliable
    window.print();
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin inline-block mr-2 text-primary" />
        Loading report...
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="p-8 text-center">
        Report not found.
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate(createPageUrl("Inspections"))}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <Button variant="outline" onClick={() => navigate(createPageUrl("Inspections"))}><ArrowLeft className="w-4 h-4 mr-2" />Back to Inspections</Button>
        <Button onClick={handlePrint}><Download className="w-4 h-4 mr-2" />Export PDF</Button>
      </div>

      {/* Render the entire report content via ReportTemplate */}
      <div id="full-report-container">
        <ReportTemplate inspection={inspection} client={client} property={property} />
      </div>

      <style>{`
        .report-page {
          width: 210mm;
          min-height: 297mm;
          padding: 25mm;
          margin: 0 auto 2rem auto;
          box-sizing: border-box;
          background-color: white;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          page-break-after: always;
        }
        
        .report-page:last-child {
          page-break-after: auto;
        }

        @media print {
          body { 
            -webkit-print-color-adjust: exact !important; 
            color-adjust: exact !important; 
            print-color-adjust: exact !important;
          }
          .print\\:hidden, button, nav { 
            display: none !important; 
          }
          .report-page {
            margin: 0;
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto;
            padding: 20mm;
            page-break-after: always;
            page-break-inside: avoid;
          }
          
          .report-page:last-child {
            page-break-after: auto;
          }

          /* Prevent breaking of content blocks */
          .grid, .space-y-6, .mb-12, .mb-16 {
            page-break-inside: avoid;
          }
          
          /* Ensure table fits properly */
          table {
            page-break-inside: avoid;
          }
        }
        
        @page {
          size: A4;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
