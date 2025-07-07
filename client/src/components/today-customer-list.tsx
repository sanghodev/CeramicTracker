import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Users, Phone, Mail, Image, CheckCircle, MessageCircle, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Customer } from "@shared/schema";

export default function TodayCustomerList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers/today"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/customers/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers/today"] });
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "ready":
        return "secondary";
      case "contacted":
        return "outline";
      case "waiting":
        return "outline";
      default:
        return "outline";
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Registrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="text-slate-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Unable to load today's customers</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Recent Registrations
          <Badge variant="secondary" className="ml-auto">
            {customers.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {customers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 text-sm">No recent customers</p>
          </div>
        ) : (
          <div className="space-y-3">
            {customers.map((customer: Customer) => (
              <div key={customer.id} className="border rounded-lg p-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  {/* Customer Image */}
                  <div className="flex-shrink-0">
                    {customer.customerImage ? (
                      <ImageZoom
                        src={getImageUrl(customer.customerImage) || ''}
                        alt={`${customer.name}'s photo`}
                        thumbnailClassName="w-12 h-12 border border-slate-200 hover:border-slate-400 transition-colors"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Users className="h-6 w-6 text-slate-400" />
                      </div>
                    )}
                  </div>

                  {/* Customer Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold text-slate-800 truncate">{customer.name}</h3>
                        <p className="text-xs text-slate-500">{customer.customerId}</p>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <Badge variant={getStatusBadge(customer.status)} className="text-xs">
                          {getStatusText(customer.status)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getProgramTypeText(customer.programType)}
                        </Badge>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-1">
                      {customer.phone && (
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Phone className="h-3 w-3" />
                          <span className="truncate">{customer.phone}</span>
                        </div>
                      )}
                      {customer.email && (
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        <span>Work: {new Date(customer.workDate).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Registered: {new Date(customer.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                  </div>

                  {/* Work Image */}
                  {customer.workImage && (
                    <div className="flex-shrink-0">
                      <ImageZoom
                        src={getImageUrl(customer.workImage) || ''}
                        alt={`${customer.name}'s artwork`}
                        thumbnailClassName="w-12 h-12 border border-green-200 hover:border-green-400 transition-colors"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}