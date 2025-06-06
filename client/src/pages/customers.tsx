import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Edit2, Save, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatPhoneNumber, isValidEmail, getSuggestedDates } from "@/lib/ocr";
import type { Customer } from "@shared/schema";

export default function Customers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    workDate: "",
    status: ""
  });

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/customers");
      return response.json();
    }
  });

  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["/api/customers/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const response = await apiRequest("GET", `/api/customers/search?q=${encodeURIComponent(searchQuery)}`);
      return response.json();
    },
    enabled: searchQuery.trim().length > 0
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/customers/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setEditingCustomer(null);
      toast({
        title: "Customer Information Updated",
        description: "Customer information has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "An error occurred while updating customer information.",
        variant: "destructive",
      });
    }
  });

  const displayedCustomers = searchQuery.trim() ? searchResults : customers;

  const startEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      workDate: typeof customer.workDate === 'string' ? customer.workDate : customer.workDate.toISOString().split('T')[0],
      status: customer.status
    });
  };

  const cancelEdit = () => {
    setEditingCustomer(null);
    setEditForm({ name: "", phone: "", email: "", workDate: "", status: "" });
  };

  const saveEdit = () => {
    if (!editingCustomer) return;
    
    updateMutation.mutate({
      id: editingCustomer.id,
      updates: {
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email || null,
        status: editForm.status
      }
    });
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setEditForm(prev => ({ ...prev, phone: formatted }));
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "waiting": "outline",
      "In Progress": "secondary", 
      "ready": "default",
      "completed": "destructive"
    };
    return variants[status] || "outline";
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      "waiting": "Waiting",
      "In Progress": "In Progress",
      "ready": "Ready",
      "completed": "Completed"
    };
    return statusMap[status] || status;
  };

  const suggestedDates = getSuggestedDates();

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="text-primary" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Customer Management</h1>
          <p className="text-slate-600">Search and edit customer information</p>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Customer Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Customer List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {searchQuery ? `Search Results (${displayedCustomers.length})` : `All Customers (${customers.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || isSearching ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-slate-600">Loading...</p>
              </div>
            ) : displayedCustomers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600">
                  {searchQuery ? "No search results found." : "No customers registered yet."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedCustomers.map((customer: Customer) => (
                  <div
                    key={customer.id}
                    className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    {editingCustomer?.id === customer.id ? (
                      // Edit Mode
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                            <Input
                              value={editForm.name}
                              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Customer name"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                            <Input
                              value={editForm.phone}
                              onChange={(e) => handlePhoneChange(e.target.value)}
                              placeholder="(555) 123-4567"
                              maxLength={14}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <Input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="customer@example.com"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Work Date</label>
                            <div className="flex gap-1 mb-2">
                              {suggestedDates.map((suggestion) => (
                                <Button
                                  key={suggestion.value}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditForm(prev => ({ ...prev, workDate: suggestion.value }))}
                                  className="text-xs"
                                >
                                  {suggestion.label}
                                </Button>
                              ))}
                            </div>
                            <Input
                              type="date"
                              value={editForm.workDate}
                              onChange={(e) => setEditForm(prev => ({ ...prev, workDate: e.target.value }))}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full p-2 border border-slate-300 rounded-md"
                          >
                            <option value="waiting">Waiting</option>
                            <option value="In Progress">In Progress</option>
                            <option value="ready">Ready</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={saveEdit}
                            disabled={updateMutation.isPending}
                            className="flex-1"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {updateMutation.isPending ? "Saving..." : "Save"}
                          </Button>
                          <Button
                            onClick={cancelEdit}
                            variant="outline"
                            className="flex-1"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-slate-800">{customer.name}</h3>
                            <Badge variant={getStatusBadge(customer.status)}>
                              {getStatusText(customer.status)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
                            <div>📞 {customer.phone}</div>
                            <div>📧 {customer.email || "No email"}</div>
                            <div>📅 {typeof customer.workDate === 'string' ? customer.workDate : new Date(customer.workDate).toLocaleDateString()}</div>
                            <div>🕒 Registered: {typeof customer.createdAt === 'string' ? new Date(customer.createdAt).toLocaleDateString() : customer.createdAt.toLocaleDateString()}</div>
                          </div>
                        </div>
                        
                        {/* Customer Image */}
                        {customer.workImage && (
                          <div className="flex-shrink-0">
                            <img
                              src={customer.workImage}
                              alt={`${customer.name}'s work image`}
                              className="w-24 h-24 object-cover rounded-lg border border-slate-200"
                            />
                          </div>
                        )}
                        
                        <Button
                          onClick={() => startEdit(customer)}
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}