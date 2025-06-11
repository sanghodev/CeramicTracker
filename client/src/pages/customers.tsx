import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatPhoneNumber } from "@/lib/ocr";
import { formatWorkDate, formatDateForInput } from "@/lib/date-utils";
import type { Customer } from "@shared/schema";
import VirtualCustomerList from "@/components/virtual-customer-list";

export default function Customers() {
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

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/customers");
      return response.json();
    }
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
        title: "Customer Information Updated",
        description: "Customer information has been successfully updated.",
      });
    }
  });

  const downloadAllImages = async () => {
    try {
      const customersWithImages = customers.filter((customer: Customer) => 
        customer.customerImage || customer.workImage
      );

      if (customersWithImages.length === 0) {
        toast({
          title: "No Images Found",
          description: "No customers have uploaded images.",
          variant: "destructive"
        });
        return;
      }

      customersWithImages.forEach((customer: Customer, index: number) => {
        setTimeout(() => {
          // Download customer image
          if (customer.customerImage) {
            const link = document.createElement('a');
            link.href = customer.customerImage;
            link.download = `${customer.customerId}_customer_info.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }

          // Download work image
          if (customer.workImage) {
            const link = document.createElement('a');
            link.href = customer.workImage;
            link.download = `${customer.customerId}_artwork.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }, index * 500); // 500ms delay between downloads
      });

      toast({
        title: "Image Download Started",
        description: `Downloading ${customersWithImages.length} customer images.`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "An error occurred while downloading images.",
        variant: "destructive"
      });
    }
  };

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
        title: "CSV Export Complete",
        description: "Customer data has been successfully exported.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting data.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Studio Customer Management</h1>
          <p className="text-slate-600 mt-1">Performance optimized customer management system</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Export Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Data Export</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center space-x-4">
                <select
                  value={exportDateRange}
                  onChange={(e) => setExportDateRange(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Data</option>
                  <option value="today">Today</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                </select>
                <Button onClick={exportToCSV} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export to Excel
                </Button>
                <Button onClick={downloadAllImages} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download Images
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Optimized Customer List */}
        <Card>
          <CardHeader>
            <CardTitle>Customer List (Performance Optimized)</CardTitle>
          </CardHeader>
          <CardContent>
            <VirtualCustomerList onEdit={startEdit} />
          </CardContent>
        </Card>

        {/* Customer Edit Modal */}
        {editingCustomer && (
          <Card>
            <CardHeader>
              <CardTitle>Edit Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: formatPhoneNumber(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Work Date</label>
                  <input
                    type="date"
                    value={editForm.workDate}
                    onChange={(e) => setEditForm(prev => ({ ...prev, workDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="waiting">Waiting</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="picked_up">Picked Up</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Program Type</label>
                  <select
                    value={editForm.programType}
                    onChange={(e) => setEditForm(prev => ({ ...prev, programType: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="painting">Painting</option>
                    <option value="one_time_ceramic">One-time Ceramic</option>
                    <option value="advanced_ceramic">Advanced Ceramic</option>
                  </select>
                </div>
              </div>
              
              <div className="flex space-x-2 mt-6">
                <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}