import { useState } from "react";
import { FileText, X, User, Calendar, MessageSquare, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { generateCustomerSummary, generateQuickSummary, type ProfileSummary } from "@/lib/profile-summary";
import type { Customer } from "@shared/schema";

interface ProfileSummaryProps {
  customer: Customer;
}

export function ProfileSummaryButton({ customer }: ProfileSummaryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState<ProfileSummary | null>(null);

  const handleGenerateSummary = () => {
    const generatedSummary = generateCustomerSummary(customer);
    setSummary(generatedSummary);
    setIsOpen(true);
  };

  const quickSummary = generateQuickSummary(customer);

  return (
    <>
      <Button
        onClick={handleGenerateSummary}
        variant="outline"
        size="sm"
        className="flex-shrink-0"
        title="프로필 요약 생성"
      >
        <FileText className="h-4 w-4 mr-1 sm:mr-2" />
        <span className="hidden sm:inline">요약</span>
      </Button>

      {/* Modal */}
      {isOpen && summary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl">
            <div className="flex justify-between items-center p-4 border-b bg-slate-50">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">{customer.name} 프로필 요약</h2>
                <p className="text-sm text-slate-600">{quickSummary}</p>
              </div>
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="sm"
                className="flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-4 space-y-4 max-h-[calc(90vh-120px)] overflow-y-auto">
              {/* Basic Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4 text-blue-500" />
                    기본 정보
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700">{summary.basicInfo}</p>
                </CardContent>
              </Card>

              {/* Work History */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-4 w-4 text-green-500" />
                    작업 정보
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700">{summary.workHistory}</p>
                </CardContent>
              </Card>

              {/* Preferences */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="h-4 w-4 text-purple-500" />
                    선호도 및 특이사항
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700">{summary.preferences}</p>
                </CardContent>
              </Card>

              {/* Notes */}
              {summary.notes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MessageSquare className="h-4 w-4 text-orange-500" />
                      참고사항
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-700">{summary.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {summary.recommendations.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      추천 사항
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {summary.recommendations.map((recommendation, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <Badge variant="outline" className="text-xs px-2 py-1 flex-shrink-0">
                            {index + 1}
                          </Badge>
                          <p className="text-sm text-slate-700">{recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="p-4 border-t bg-slate-50">
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setIsOpen(false)}
                  variant="outline"
                >
                  닫기
                </Button>
                <Button
                  onClick={() => {
                    // Helper function to safely escape HTML
                    const escapeHtml = (text: string) => {
                      const div = document.createElement('div');
                      div.textContent = text;
                      return div.innerHTML;
                    };

                    const printContent = document.createElement('div');
                    
                    // Create elements safely using DOM methods instead of innerHTML
                    const h1 = document.createElement('h1');
                    h1.textContent = `${customer.name} 프로필 요약`;
                    printContent.appendChild(h1);

                    const basicInfo = document.createElement('p');
                    basicInfo.innerHTML = `<strong>기본 정보:</strong> ${escapeHtml(summary.basicInfo)}`;
                    printContent.appendChild(basicInfo);

                    const workInfo = document.createElement('p');
                    workInfo.innerHTML = `<strong>작업 정보:</strong> ${escapeHtml(summary.workHistory)}`;
                    printContent.appendChild(workInfo);

                    const preferences = document.createElement('p');
                    preferences.innerHTML = `<strong>선호도:</strong> ${escapeHtml(summary.preferences)}`;
                    printContent.appendChild(preferences);

                    if (summary.notes) {
                      const notes = document.createElement('p');
                      notes.innerHTML = `<strong>참고사항:</strong> ${escapeHtml(summary.notes)}`;
                      printContent.appendChild(notes);
                    }

                    const recTitle = document.createElement('p');
                    recTitle.innerHTML = '<strong>추천 사항:</strong>';
                    printContent.appendChild(recTitle);

                    const ul = document.createElement('ul');
                    summary.recommendations.forEach(r => {
                      const li = document.createElement('li');
                      li.textContent = r;
                      ul.appendChild(li);
                    });
                    printContent.appendChild(ul);

                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(printContent.innerHTML);
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }}
                >
                  인쇄
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function QuickSummaryBadge({ customer }: ProfileSummaryProps) {
  const quickSummary = generateQuickSummary(customer);
  
  return (
    <Badge variant="secondary" className="text-xs">
      {quickSummary}
    </Badge>
  );
}