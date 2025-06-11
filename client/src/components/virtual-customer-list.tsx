import React, { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { FixedSizeList as List } from "react-window";
import { apiRequest } from "@/lib/queryClient";
import { formatWorkDate, formatCustomerId } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Phone, Mail, Calendar, MoreVertical, Search } from "lucide-react";
import type { Customer } from "@shared/schema";

interface VirtualCustomerListProps {
  onEdit?: (customer: Customer) => void;
}

const ITEM_HEIGHT = 120; // 각 고객 카드의 높이
const CONTAINER_HEIGHT = 600; // 가상 스크롤 컨테이너 높이

export default function VirtualCustomerList({ onEdit }: VirtualCustomerListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDate, setSearchDate] = useState("");

  const { data: customers = [], isLoading, error } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      console.log("Fetching customers from API...");
      try {
        const response = await apiRequest("GET", "/api/customers");
        
        // Check if response is valid before parsing JSON
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(`Expected JSON response, got: ${contentType}. Response: ${text.substring(0, 100)}`);
        }
        
        const data = await response.json();
        console.log("Customers received:", data.length);
        return data;
      } catch (error: any) {
        console.error("Failed to fetch customers:", error);
        throw new Error(`Customer data fetch failed: ${error.message}`);
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Log error if data fetch fails
  if (error) {
    console.error("Failed to fetch customers:", error);
  }

  // 필터링된 고객 목록 (메모이제이션으로 성능 최적화)
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer: Customer) => {
      const matchesQuery = !searchQuery.trim() || 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesDate = !searchDate || 
        formatWorkDate(customer.workDate).includes(searchDate);
      
      return matchesQuery && matchesDate;
    });
  }, [customers, searchQuery, searchDate]);

  // 각 고객 항목 렌더링 컴포넌트
  const CustomerItem = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const customer = filteredCustomers[index];
    
    if (!customer) return null;

    return (
      <div style={style} className="px-4">
        <div className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow mb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              {/* Customer work image */}
              <div className="flex-shrink-0">
                {customer.workImage ? (
                  <img
                    src={customer.workImage}
                    alt={`${customer.name}'s work`}
                    className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                    loading="lazy" // 지연 로딩
                  />
                ) : (
                  <div className="w-16 h-16 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
                    <span className="text-slate-400 text-xs">No Photo</span>
                  </div>
                )}
              </div>

              {/* Customer details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-medium text-slate-900 truncate">{customer.name}</h3>
                  <Badge 
                    variant={
                      customer.status === 'completed' ? 'default' :
                      customer.status === 'in_progress' ? 'secondary' : 
                      'outline'
                    }
                    className="text-xs"
                  >
                    {customer.status === 'waiting' ? 'Waiting' :
                     customer.status === 'in_progress' ? 'In Progress' :
                     customer.status === 'completed' ? 'Completed' :
                     customer.status === 'picked_up' ? 'Picked Up' : 'Unknown'}
                  </Badge>
                  {customer.isGroup === "true" && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
                      Group ({customer.groupSize})
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-1 text-sm text-slate-600">
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
                    <span>{formatWorkDate(customer.workDate)}</span>
                  </div>
                  {customer.isGroup === "true" && customer.groupId && (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs">🏷️ Group: {customer.groupId}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {onEdit && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-slate-400 hover:text-slate-600 p-2"
                onClick={() => onEdit(customer)}
              >
                <MoreVertical size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }, [filteredCustomers, onEdit]);

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">
          <p className="font-medium">Failed to load customer data</p>
          <p className="text-sm mt-2">Error: {String(error)}</p>
        </div>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
          className="mt-4"
        >
          Reload Page
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
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
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Input
          type="date"
          value={searchDate}
          onChange={(e) => setSearchDate(e.target.value)}
          className="w-full sm:w-48"
          placeholder="Filter by date"
        />
      </div>

      {/* Result count and debug info */}
      <div className="text-sm text-slate-600 flex justify-between">
        <span>Total {filteredCustomers.length} customers</span>
        <span className="text-xs text-slate-400">
          Loaded: {customers.length} | API Status: {isLoading ? 'Loading...' : error ? 'Error' : 'Ready'}
        </span>
      </div>

      {/* Virtual scroll list */}
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          {searchQuery || searchDate ? "No search results found." : "No customers registered yet."}
        </div>
      ) : (
        <List
          height={CONTAINER_HEIGHT}
          width={800}
          itemCount={filteredCustomers.length}
          itemSize={ITEM_HEIGHT}
          className="border border-slate-200 rounded-lg"
        >
          {CustomerItem}
        </List>
      )}
    </div>
  );
}