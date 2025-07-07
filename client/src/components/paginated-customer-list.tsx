import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Edit2, Save, X, Users, Download, Calendar, Filter, Clock, CheckCircle, MessageCircle, Package, Phone, Mail, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ImageZoom } from "@/components/ui/image-zoom";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getImageUrl } from "@/lib/image-utils";
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
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [status, setStatus] = useState("");
  const [programType, setProgramType] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const limit = 20; // More rows for Excel-like view

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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/customers/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers/paginated"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Status Updated",
        description: "Customer status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update customer status.",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (customerId: number, newStatus: string) => {
    updateStatusMutation.mutate({ id: customerId, status: newStatus });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "ready": return "bg-blue-100 text-blue-800 border-blue-200";
      case "contacted": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "waiting": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return "Complete";
      case "ready": return "Ready";
      case "contacted": return "Contacted";
      case "waiting": return "Waiting";
      default: return status;
    }
  };

  const getProgramTypeText = (programType: string) => {
    switch (programType) {
      case "painting": return "Painting";
      case "one_time_ceramic": return "Ceramic";
      case "advanced_ceramic": return "Adv.Ceramic";
      default: return programType;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading customers...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">Failed to load customers</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customer Management
            <Badge variant="secondary" className="ml-2">
              {total} total
            </Badge>
          </CardTitle>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 pt-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="completed">Complete</SelectItem>
            </SelectContent>
          </Select>

          <Select value={programType} onValueChange={setProgramType}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Programs</SelectItem>
              <SelectItem value="painting">Painting</SelectItem>
              <SelectItem value="one_time_ceramic">Ceramic</SelectItem>
              <SelectItem value="advanced_ceramic">Adv.Ceramic</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-[60px]">Image</TableHead>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead className="w-[150px]">Name</TableHead>
                <TableHead className="w-[120px]">Phone</TableHead>
                <TableHead className="w-[180px]">Email</TableHead>
                <TableHead className="w-[100px]">Work Date</TableHead>
                <TableHead className="w-[80px]">Program</TableHead>
                <TableHead className="w-[80px]">Group</TableHead>
                <TableHead className="w-[90px]">Status</TableHead>
                <TableHead className="w-[250px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id} className="hover:bg-slate-50">
                  <TableCell className="p-2">
                    <div className="flex gap-1">
                      {customer.customerImage && (
                        <ImageZoom
                          src={getImageUrl(customer.customerImage) || ''}
                          alt="Customer"
                          thumbnailClassName="w-6 h-6 border border-slate-200 hover:border-slate-400 transition-colors"
                        />
                      )}
                      {customer.workImage && (
                        <ImageZoom
                          src={getImageUrl(customer.workImage) || ''}
                          alt="Work"
                          thumbnailClassName="w-6 h-6 border border-green-200 hover:border-green-400 transition-colors"
                        />
                      )}
                      {!customer.customerImage && !customer.workImage && (
                        <div className="w-6 h-6 bg-slate-100 border border-slate-200 rounded flex items-center justify-center">
                          <Image size={12} className="text-slate-400" />
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="font-mono text-xs p-2">
                    {customer.customerId}
                  </TableCell>

                  <TableCell className="font-medium p-2">
                    {customer.name}
                  </TableCell>

                  <TableCell className="text-sm p-2">
                    {customer.phone}
                  </TableCell>

                  <TableCell className="text-sm p-2 max-w-[180px] truncate">
                    {customer.email || "-"}
                  </TableCell>

                  <TableCell className="text-sm p-2">
                    {new Date(customer.workDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </TableCell>

                  <TableCell className="p-2">
                    <Badge variant="outline" className="text-xs">
                      {getProgramTypeText(customer.programType)}
                    </Badge>
                  </TableCell>

                  <TableCell className="p-2">
                    {customer.isGroup === "true" ? (
                      <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                        {customer.groupSize}
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-500">-</span>
                    )}
                  </TableCell>

                  <TableCell className="p-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getStatusColor(customer.status)}`}
                    >
                      {getStatusText(customer.status)}
                    </Badge>
                  </TableCell>

                  <TableCell className="p-2">
                    <div className="flex gap-1">
                      <Button
                        variant={customer.status === "waiting" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleStatusUpdate(customer.id, "waiting")}
                        disabled={updateStatusMutation.isPending}
                        className="h-6 px-2 text-xs"
                      >
                        <Clock size={10} />
                      </Button>
                      <Button
                        variant={customer.status === "ready" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleStatusUpdate(customer.id, "ready")}
                        disabled={updateStatusMutation.isPending}
                        className="h-6 px-2 text-xs"
                      >
                        <CheckCircle size={10} />
                      </Button>
                      <Button
                        variant={customer.status === "contacted" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleStatusUpdate(customer.id, "contacted")}
                        disabled={updateStatusMutation.isPending}
                        className="h-6 px-2 text-xs"
                      >
                        <MessageCircle size={10} />
                      </Button>
                      <Button
                        variant={customer.status === "completed" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleStatusUpdate(customer.id, "completed")}
                        disabled={updateStatusMutation.isPending}
                        className="h-6 px-2 text-xs"
                      >
                        <Package size={10} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-slate-600">
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} customers
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-3 text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}