import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Users,
  Calendar,
  Clock,
  Phone,
  Mail,
  Package,
  Edit,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageZoom } from "@/components/ui/image-zoom";
import { getImageUrl } from "@/lib/image-utils";
import { apiRequest } from "@/lib/queryClient";
import CustomerForm from "@/components/customer-form";
import type { Customer } from "@shared/schema";

interface PaginatedResult {
  data: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function PaginatedCustomerList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [status, setStatus] = useState("");
  const [programType, setProgramType] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const limit = 15; // Compact list for better performance

  const { data: result, isLoading, error } = useQuery({
    queryKey: ["/api/customers/paginated", page, search, dateRange, status, programType],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(dateRange !== "all" && { dateRange }),
        ...(status && { status }),
        ...(programType && { programType })
      });
      
      const response = await apiRequest("GET", `/api/customers/paginated?${params}`);
      return await response.json() as PaginatedResult;
    }
  });

  const customers = result?.data || [];
  const totalPages = result?.totalPages || 1;
  const total = result?.total || 0;

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      "waiting": "Waiting",
      "in_progress": "In Progress", 
      "ready": "Ready",
      "completed": "Completed"
    };
    return statusMap[status] || status;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "waiting": return "secondary";
      case "in_progress": return "default";
      case "ready": return "outline";
      case "completed": return "destructive";
      default: return "secondary";
    }
  };

  const getProgramTypeText = (programType: string) => {
    const typeMap: Record<string, string> = {
      "painting": "Painting",
      "one_time_ceramic": "One-time Ceramic",
      "advanced_ceramic": "Advanced Ceramic"
    };
    return typeMap[programType] || programType;
  };

  const resetFilters = () => {
    setSearch("");
    setDateRange("all");
    setStatus("");
    setProgramType("");
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page when searching
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
  };

  const handleEditCancel = () => {
    setEditingCustomer(null);
  };

  const handleEditSubmit = () => {
    setEditingCustomer(null);
    // Refresh the data
    queryClient.invalidateQueries({ queryKey: ["/api/customers/paginated"] });
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="text-slate-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Unable to load customers</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show edit form if editing
  if (editingCustomer) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Edit Customer: {editingCustomer.name}
              </CardTitle>
              <Button onClick={handleEditCancel} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <CustomerForm 
              initialData={editingCustomer}
              onSubmitted={handleEditSubmit}
              onCancelled={handleEditCancel}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter & Search
            {total > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {total} customers
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, phone, email, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="outline">
                Search
              </Button>
            </form>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>

              <Select value={status || "all_statuses"} onValueChange={(value) => setStatus(value === "all_statuses" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_statuses">All Statuses</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={programType || "all_programs"} onValueChange={(value) => setProgramType(value === "all_programs" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Program Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_programs">All Programs</SelectItem>
                  <SelectItem value="painting">Painting</SelectItem>
                  <SelectItem value="one_time_ceramic">One-time Ceramic</SelectItem>
                  <SelectItem value="advanced_ceramic">Advanced Ceramic</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={resetFilters} variant="outline" className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customer Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-lg" />
                </div>
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 text-lg mb-2">No customers found</p>
              <p className="text-slate-400 text-sm">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div className="space-y-2">
              {customers.map((customer: Customer) => (
                <div key={customer.id} className="border rounded-lg p-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    {/* Customer Image */}
                    <div className="flex-shrink-0">
                      {customer.customerImage ? (
                        <ImageZoom
                          src={getImageUrl(customer.customerImage) || ''}
                          alt={`${customer.name}'s photo`}
                          thumbnailClassName="w-10 h-10 border border-slate-200 hover:border-slate-400 transition-colors"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Users className="h-5 w-5 text-slate-400" />
                        </div>
                      )}
                    </div>

                    {/* Customer Info - Compact */}
                    <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-4 gap-2 lg:gap-4">
                      {/* Name & ID */}
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-800 truncate text-sm">{customer.name}</h3>
                        <p className="text-xs text-slate-500 truncate">{customer.customerId}</p>
                      </div>

                      {/* Contact */}
                      <div className="min-w-0">
                        {customer.phone && (
                          <div className="flex items-center gap-1 text-xs text-slate-600 mb-1">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{customer.phone}</span>
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-1 text-xs text-slate-600">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Dates */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 text-xs text-slate-600 mb-1">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">Work: {new Date(customer.workDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">Reg: {new Date(customer.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Status & Program */}
                      <div className="flex flex-wrap gap-1 items-start">
                        <Badge variant={getStatusBadge(customer.status)} className="text-xs">
                          {getStatusText(customer.status)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Package className="h-3 w-3 mr-1" />
                          {getProgramTypeText(customer.programType)}
                        </Badge>
                      </div>
                    </div>

                    {/* Work Image */}
                    <div className="flex-shrink-0">
                      {customer.workImage ? (
                        <ImageZoom
                          src={getImageUrl(customer.workImage) || ''}
                          alt={`${customer.name}'s artwork`}
                          thumbnailClassName="w-10 h-10 border border-green-200 hover:border-green-400 transition-colors"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Package className="h-5 w-5 text-slate-400" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Page {page} of {totalPages} ({total} total customers)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                    if (pageNum > totalPages) return null;
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}