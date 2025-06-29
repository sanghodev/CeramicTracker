import { Users } from "lucide-react";
import PaginatedCustomerList from "@/components/paginated-customer-list";

export default function Customers() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="text-primary" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Customer Management</h1>
          <p className="text-slate-600">Manage all customer registrations and track their progress</p>
        </div>

        {/* Paginated Customer List */}
        <PaginatedCustomerList />
      </div>
    </div>
  );
}