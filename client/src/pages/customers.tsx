import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Edit2, Save, X, Users, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageZoom } from "@/components/ui/image-zoom";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatPhoneNumber, isValidEmail, getSuggestedDates } from "@/lib/ocr";
import type { Customer } from "@shared/schema";

import { ProfileSummaryButton, QuickSummaryBadge } from "@/components/profile-summary";

export default function Customers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
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
  const [exportDateRange, setExportDateRange] = useState("all");

  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      console.log("Fetching customers from API...");
      const response = await apiRequest("GET", "/api/customers");
      const data = await response.json();
      console.log("Customers fetched:", data.length, "customers");
      return data;
    },
    staleTime: 0,
    gcTime: 0
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

  // Filter customers by search query and date
  console.log("Raw customers data:", customers);
  console.log("Is loading:", isLoading);
  console.log("Search query:", searchQuery);
  console.log("Search date:", searchDate);

  const filteredCustomers = customers.filter((customer: Customer) => {
    const matchesQuery = !searchQuery.trim() || 
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesDate = !searchDate || 
      new Date(customer.workDate).toISOString().split('T')[0] === searchDate;
    
    return matchesQuery && matchesDate;
  });

  const displayedCustomers = filteredCustomers;
  console.log("Filtered customers:", filteredCustomers.length);

  const startEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      workDate: typeof customer.workDate === 'string' ? customer.workDate : customer.workDate.toISOString().split('T')[0],
      status: customer.status,
      programType: customer.programType || "painting",
      contactStatus: customer.contactStatus || "not_contacted",
      storageLocation: customer.storageLocation || "",
      pickupStatus: customer.pickupStatus || "not_picked_up",
      notes: customer.notes || ""
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

  const saveEdit = () => {
    if (!editingCustomer) return;
    
    updateMutation.mutate({
      id: editingCustomer.id,
      updates: {
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email || null,
        status: editForm.status,
        programType: editForm.programType,
        contactStatus: editForm.contactStatus,
        storageLocation: editForm.storageLocation || null,
        pickupStatus: editForm.pickupStatus,
        notes: editForm.notes || null
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

  const getProgramTypeText = (programType: string) => {
    const programMap: Record<string, string> = {
      "painting": "Painting",
      "one_time_ceramic": "One-Time Ceramic",
      "advanced_ceramic": "Advanced Ceramic"
    };
    return programMap[programType] || programType;
  };

  const getProgramTypeBadge = (programType: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "painting": "default",
      "one_time_ceramic": "secondary",
      "advanced_ceramic": "outline"
    };
    return variants[programType] || "outline";
  };

  const exportToCSV = () => {
    const now = new Date();
    let filteredData = customers;

    // Filter by date range
    if (exportDateRange !== "all") {
      const daysAgo = exportDateRange === "1month" ? 30 : 
                     exportDateRange === "2months" ? 60 : 
                     exportDateRange === "3months" ? 90 : 0;
      
      if (daysAgo > 0) {
        const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
        filteredData = customers.filter((customer: Customer) => 
          new Date(customer.workDate) >= cutoffDate
        );
      }
    }

    // Create CSV content
    const headers = [
      "Customer ID", "Name", "Phone", "Email", "Work Date", "Status", "Program Type",
      "Contact Status", "Storage Location", "Pickup Status", "Notes", "Created Date"
    ];
    
    const csvContent = [
      headers.join(","),
      ...filteredData.map((customer: Customer) => [
        `"${customer.customerId || ""}"`,
        `"${customer.name}"`,
        `"${customer.phone}"`,
        `"${customer.email || ""}"`,
        `"${new Date(customer.workDate).toLocaleDateString()}"`,
        `"${getStatusText(customer.status)}"`,
        `"${getProgramTypeText(customer.programType || "painting")}"`,
        `"${customer.contactStatus?.replace('_', ' ') || "Not Contacted"}"`,
        `"${customer.storageLocation || ""}"`,
        `"${customer.pickupStatus?.replace('_', ' ') || "Not Picked Up"}"`,
        `"${customer.notes || ""}"`,
        `"${new Date(customer.createdAt).toLocaleDateString()}"`
      ].join(","))
    ].join("\n");

    // Download CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `customers_export_${exportDateRange}_${now.toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredData.length} customers to CSV file.`,
    });
  };

  const downloadAllImages = () => {
    const now = new Date();
    let filteredData = customers;

    // Apply same date filtering as CSV export
    if (exportDateRange !== "all") {
      const today = new Date();
      const startDate = new Date();
      
      if (exportDateRange === "today") {
        startDate.setHours(0, 0, 0, 0);
        today.setHours(23, 59, 59, 999);
      } else if (exportDateRange === "week") {
        startDate.setDate(today.getDate() - 7);
      } else if (exportDateRange === "month") {
        startDate.setMonth(today.getMonth() - 1);
      }

      if (exportDateRange !== "all") {
        filteredData = customers.filter((customer: Customer) => 
          new Date(customer.workDate) >= startDate && new Date(customer.workDate) <= today
        );
      }
    }

    // Filter customers with images
    const customersWithImages = filteredData.filter((customer: Customer) => 
      customer.customerImage || customer.workImage
    );

    if (customersWithImages.length === 0) {
      toast({
        title: "No Images Found",
        description: "No customers have uploaded images in the selected date range.",
        variant: "destructive"
      });
      return;
    }

    // Download each image
    let downloadCount = 0;
    customersWithImages.forEach((customer: Customer, index: number) => {
      setTimeout(() => {
        // Download customer info image
        if (customer.customerImage) {
          const link = document.createElement("a");
          link.href = customer.customerImage;
          link.download = `${customer.customerId || `customer_${customer.id}`}_info_image.jpg`;
          link.style.visibility = "hidden";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          downloadCount++;
        }

        // Download work image
        if (customer.workImage) {
          const link = document.createElement("a");
          link.href = customer.workImage;
          link.download = `${customer.customerId || `customer_${customer.id}`}_work_image.jpg`;
          link.style.visibility = "hidden";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          downloadCount++;
        }

        // Show completion toast after last download
        if (index === customersWithImages.length - 1) {
          setTimeout(() => {
            toast({
              title: "Images Download Complete",
              description: `Downloaded ${downloadCount} images from ${customersWithImages.length} customers.`,
            });
          }, 500);
        }
      }, index * 200); // Stagger downloads to avoid browser blocking
    });

    toast({
      title: "Starting Image Downloads",
      description: `Downloading images from ${customersWithImages.length} customers...`,
    });
  };

  const suggestedDates = getSuggestedDates();

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="text-primary" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Studio Customer Management</h1>
          <p className="text-slate-600">Search and manage pottery studio customers</p>
        </div>



        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name, phone, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Input
                    type="date"
                    placeholder="Filter by work date"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                    className="w-full"
                  />
                  {searchDate && (
                    <button
                      onClick={() => setSearchDate("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Export Section */}
              <div className="border-t pt-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">Export Data:</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 flex-1">
                    <select
                      value={exportDateRange}
                      onChange={(e) => setExportDateRange(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-md text-sm"
                    >
                      <option value="all">All Time</option>
                      <option value="1month">Last 1 Month</option>
                      <option value="2months">Last 2 Months</option>
                      <option value="3months">Last 3 Months</option>
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {searchQuery || searchDate ? `Filtered Results (${displayedCustomers.length})` : `All Customers (${customers.length})`}
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
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                              <div className="flex flex-wrap gap-1 mb-2">
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
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Program Type</label>
                            <select
                              value={editForm.programType}
                              onChange={(e) => setEditForm(prev => ({ ...prev, programType: e.target.value }))}
                              className="w-full p-2 border border-slate-300 rounded-md"
                            >
                              <option value="painting">Painting</option>
                              <option value="one_time_ceramic">One-Time Ceramic</option>
                              <option value="advanced_ceramic">Advanced Ceramic</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Status</label>
                            <select
                              value={editForm.contactStatus || "not_contacted"}
                              onChange={(e) => setEditForm(prev => ({ ...prev, contactStatus: e.target.value }))}
                              className="w-full p-2 border border-slate-300 rounded-md"
                            >
                              <option value="not_contacted">Not Contacted</option>
                              <option value="contacted">Contacted</option>
                              <option value="confirmed">Confirmed</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Pickup Status</label>
                            <select
                              value={editForm.pickupStatus || "not_picked_up"}
                              onChange={(e) => setEditForm(prev => ({ ...prev, pickupStatus: e.target.value }))}
                              className="w-full p-2 border border-slate-300 rounded-md"
                            >
                              <option value="not_picked_up">Not Picked Up</option>
                              <option value="picked_up">Picked Up</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Storage Location</label>
                          <input
                            type="text"
                            value={editForm.storageLocation || ""}
                            onChange={(e) => setEditForm(prev => ({ ...prev, storageLocation: e.target.value }))}
                            placeholder="Enter storage location (e.g., Shelf A-3, Room B)"
                            className="w-full p-2 border border-slate-300 rounded-md"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                          <textarea
                            value={editForm.notes || ""}
                            onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Enter staff notes..."
                            rows={3}
                            className="w-full p-2 border border-slate-300 rounded-md resize-none"
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
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
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                          <div className="flex-1 space-y-2">
                            {/* Customer ID - Prominently displayed */}
                            {customer.customerId && (
                              <div className="bg-slate-100 border border-slate-200 rounded-md px-3 py-1 mb-3 inline-block">
                                <span className="text-sm font-mono font-semibold text-slate-700">ID: {customer.customerId}</span>
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold text-slate-800">{customer.name}</h3>
                              <Badge variant={getStatusBadge(customer.status)}>
                                {getStatusText(customer.status)}
                              </Badge>
                              <Badge variant={getProgramTypeBadge(customer.programType || "painting")}>
                                {getProgramTypeText(customer.programType || "painting")}
                              </Badge>
                              {customer.isGroup === "true" && (
                                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                  Group ({customer.groupSize})
                                </Badge>
                              )}
                            </div>
                            <div className="mb-2">
                              <QuickSummaryBadge customer={customer} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600">
                              <div>📞 {customer.phone}</div>
                              <div>📧 {customer.email || "No email"}</div>
                              <div>📅 {typeof customer.workDate === 'string' ? customer.workDate : new Date(customer.workDate).toLocaleDateString('en-US')}</div>
                              <div>🕒 Registered: {typeof customer.createdAt === 'string' ? new Date(customer.createdAt).toLocaleDateString('en-US') : customer.createdAt.toLocaleDateString('en-US')}</div>
                              {customer.isGroup === "true" && customer.groupId && (
                                <div className="col-span-full">🏷️ Group ID: {customer.groupId}</div>
                              )}
                            </div>
                            
                            {/* Staff Workflow Information */}
                            <div className="border-t pt-3 mt-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-700">Contact:</span>
                                  <Badge variant={customer.contactStatus === "confirmed" ? "default" : customer.contactStatus === "contacted" ? "secondary" : "outline"} className="text-xs">
                                    {customer.contactStatus === "confirmed" ? "Confirmed" : 
                                     customer.contactStatus === "contacted" ? "Contacted" : "Not Contacted"}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-700">Pickup:</span>
                                  <Badge variant={customer.pickupStatus === "picked_up" ? "default" : "outline"} className="text-xs">
                                    {customer.pickupStatus === "picked_up" ? "Picked Up" : "Not Picked Up"}
                                  </Badge>
                                </div>
                                {customer.storageLocation && (
                                  <div className="col-span-full flex items-center gap-2">
                                    <span className="font-medium text-slate-700">Storage:</span>
                                    <span className="text-slate-600">{customer.storageLocation}</span>
                                  </div>
                                )}
                                {customer.notes && (
                                  <div className="col-span-full">
                                    <span className="font-medium text-slate-700">Notes:</span>
                                    <p className="text-slate-600 mt-1 text-xs leading-relaxed">{customer.notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {/* Customer Images */}
                            <div className="flex gap-2 flex-shrink-0">
                              {customer.customerImage && (
                                <div className="relative group">
                                  <ImageZoom
                                    src={customer.customerImage}
                                    alt={`${customer.name}'s information image`}
                                    thumbnailClassName="w-16 h-16 sm:w-20 sm:h-20 border-2 border-blue-200 hover:border-blue-400 transition-colors"
                                  />
                                  <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full text-[10px] font-medium shadow-sm">
                                    Info
                                  </div>
                                </div>
                              )}
                              {customer.workImage && (
                                <div className="relative group">
                                  <ImageZoom
                                    src={customer.workImage}
                                    alt={`${customer.name}'s work image`}
                                    thumbnailClassName="w-16 h-16 sm:w-20 sm:h-20 border-2 border-green-200 hover:border-green-400 transition-colors"
                                  />
                                  <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full text-[10px] font-medium shadow-sm">
                                    Work
                                  </div>
                                </div>
                              )}
                              {!customer.customerImage && !customer.workImage && (
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center">
                                  <span className="text-slate-400 text-xs">No Images</span>
                                </div>
                              )}
                              {/* Debug info - remove after testing */}
                              {process.env.NODE_ENV === 'development' && (
                                <div className="text-xs text-slate-500 mt-1">
                                  <div>Customer: {customer.customerImage ? 'Present' : 'None'}</div>
                                  <div>Work: {customer.workImage ? 'Present' : 'None'}</div>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex gap-2">
                              <ProfileSummaryButton customer={customer} />
                              <Button
                                onClick={() => startEdit(customer)}
                                variant="outline"
                                size="sm"
                                className="flex-shrink-0"
                              >
                                <Edit2 className="h-4 w-4 mr-1 sm:mr-2" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                            </div>
                          </div>
                        </div>
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