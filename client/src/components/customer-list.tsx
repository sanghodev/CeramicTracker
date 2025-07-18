import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Search, Phone, Mail, Calendar, MoreVertical, Image, Clock, CheckCircle, MessageCircle, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Customer } from "@shared/schema";

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "ready":
      return "bg-blue-100 text-blue-800";
    case "contacted":
      return "bg-yellow-100 text-yellow-800";
    case "waiting":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "completed":
      return "Pickup Complete";
    case "ready":
      return "Ready";
    case "contacted":
      return "Contacted";
    case "waiting":
      return "Waiting";
    default:
      return status;
  }
};

export default function CustomerList() {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/customers/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
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

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
              <Users className="text-secondary" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Customer List</h3>
              <p className="text-sm text-slate-600">Manage registered customers</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {filteredCustomers.length}
          </Badge>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
          <Input
            type="text"
            placeholder="Search by name or phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        {/* Customer Cards */}
        <div className="space-y-3">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-5 w-12" />
                    </div>
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {searchQuery ? "No search results found." : "No customers registered yet."}
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Customer work image */}
                    <div className="flex-shrink-0">
                      {customer.workImage ? (
                        <img
                          src={customer.workImage}
                          alt={`${customer.name}'s work`}
                          className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
                          <Image size={20} className="text-slate-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Customer info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-slate-800">{customer.name}</h4>
                        <Badge
                          variant="secondary"
                          className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(customer.status)}`}
                        >
                          {getStatusText(customer.status)}
                        </Badge>
                        {customer.isGroup === "true" && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
                            Group ({customer.groupSize})
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-slate-600 mb-3">
                        <div className="flex items-center space-x-2">
                          <Phone size={14} className="w-4" />
                          <span>{customer.phone}</span>
                        </div>
                        {customer.email && (
                          <div className="flex items-center space-x-2">
                            <Mail size={14} className="w-4" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <Calendar size={14} className="w-4" />
                          <span>{new Date(customer.workDate).toLocaleDateString('en-US')}</span>
                        </div>
                        {customer.isGroup === "true" && customer.groupId && (
                          <div className="flex items-center space-x-2">
                            <span className="text-xs">🏷️ ID: {customer.groupId}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Status Update Buttons */}
                      <div className="grid grid-cols-2 gap-1">
                        <Button
                          variant={customer.status === "waiting" ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleStatusUpdate(customer.id, "waiting")}
                          disabled={updateStatusMutation.isPending}
                          className="text-xs flex items-center gap-1"
                        >
                          <Clock size={12} />
                          Waiting
                        </Button>
                        <Button
                          variant={customer.status === "ready" ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleStatusUpdate(customer.id, "ready")}
                          disabled={updateStatusMutation.isPending}
                          className="text-xs flex items-center gap-1"
                        >
                          <CheckCircle size={12} />
                          Ready
                        </Button>
                        <Button
                          variant={customer.status === "contacted" ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleStatusUpdate(customer.id, "contacted")}
                          disabled={updateStatusMutation.isPending}
                          className="text-xs flex items-center gap-1"
                        >
                          <MessageCircle size={12} />
                          Contacted
                        </Button>
                        <Button
                          variant={customer.status === "completed" ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleStatusUpdate(customer.id, "completed")}
                          disabled={updateStatusMutation.isPending}
                          className="text-xs flex items-center gap-1"
                        >
                          <Package size={12} />
                          Pickup
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
