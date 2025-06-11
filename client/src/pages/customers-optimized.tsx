import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatPhoneNumber } from "@/lib/ocr";
import { formatWorkDate, formatDateForInput } from "@/lib/date-utils";
import type { Customer } from "@shared/schema";
import VirtualCustomerList from "@/components/virtual-customer-list";

export default function CustomersOptimized() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [exportDateRange, setExportDateRange] = useState("all");
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    workDate: "",
    status: "",
    programType: "",
    contactStatus: "",
    storageLocation: "",
    pickupStatus: "",
    notes: ""
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/customers/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setEditingCustomer(null);
      setEditForm({ 
        name: "", 
        phone: "", 
        email: "", 
        workDate: "", 
        status: "", 
        programType: "",
        contactStatus: "",
        storageLocation: "",
        pickupStatus: "",
        notes: ""
      });
      toast({
        title: "고객 정보 업데이트됨",
        description: "고객 정보가 성공적으로 업데이트되었습니다.",
      });
    }
  });

  const startEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      workDate: formatDateForInput(customer.workDate),
      status: customer.status,
      programType: customer.programType,
      contactStatus: customer.contactStatus,
      storageLocation: customer.storageLocation || "",
      pickupStatus: customer.pickupStatus,
      notes: customer.notes || ""
    });
  };

  const handleSaveEdit = () => {
    if (!editingCustomer) return;
    
    updateMutation.mutate({
      id: editingCustomer.id,
      updates: {
        ...editForm,
        workDate: new Date(editForm.workDate)
      }
    });
  };

  const cancelEdit = () => {
    setEditingCustomer(null);
    setEditForm({ 
      name: "", 
      phone: "", 
      email: "", 
      workDate: "", 
      status: "", 
      programType: "",
      contactStatus: "",
      storageLocation: "",
      pickupStatus: "",
      notes: ""
    });
  };

  const exportToCSV = async () => {
    try {
      const response = await apiRequest("GET", `/api/customers/export?range=${exportDateRange}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `customers_${exportDateRange}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "CSV 내보내기 완료",
        description: "고객 데이터가 성공적으로 내보내졌습니다.",
      });
    } catch (error) {
      toast({
        title: "내보내기 실패",
        description: "데이터 내보내기 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Studio Customer Management</h1>
          <p className="text-slate-600 mt-1">성능 최적화된 고객 관리 시스템</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Export Controls */}
        <Card>
          <CardHeader>
            <CardTitle>데이터 내보내기</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center space-x-4">
                <select
                  value={exportDateRange}
                  onChange={(e) => setExportDateRange(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">모든 데이터</option>
                  <option value="today">오늘</option>
                  <option value="week">지난 주</option>
                  <option value="month">지난 달</option>
                </select>
                <Button onClick={exportToCSV} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Excel로 내보내기
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Optimized Customer List */}
        <Card>
          <CardHeader>
            <CardTitle>고객 목록 (성능 최적화)</CardTitle>
          </CardHeader>
          <CardContent>
            <VirtualCustomerList onEdit={startEdit} />
          </CardContent>
        </Card>

        {/* Customer Edit Modal */}
        {editingCustomer && (
          <Card>
            <CardHeader>
              <CardTitle>고객 정보 수정</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">이름</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="고객 이름"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">전화번호</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: formatPhoneNumber(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="전화번호"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">이메일</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="이메일 주소"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">작업 날짜</label>
                  <input
                    type="date"
                    value={editForm.workDate}
                    onChange={(e) => setEditForm(prev => ({ ...prev, workDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">상태</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="waiting">대기중</option>
                    <option value="in_progress">진행중</option>
                    <option value="completed">완료</option>
                    <option value="picked_up">수령완료</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">프로그램 유형</label>
                  <select
                    value={editForm.programType}
                    onChange={(e) => setEditForm(prev => ({ ...prev, programType: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="painting">페인팅</option>
                    <option value="one_time_ceramic">일회성 도자기</option>
                    <option value="advanced_ceramic">고급 도자기</option>
                  </select>
                </div>
              </div>
              
              <div className="flex space-x-2 mt-6">
                <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "저장 중..." : "변경사항 저장"}
                </Button>
                <Button variant="outline" onClick={cancelEdit}>
                  취소
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}