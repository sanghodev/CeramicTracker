import { useState } from "react";
import { Camera, Users, Menu } from "lucide-react";
import CameraCapture from "@/components/camera-capture";
import CustomerForm from "@/components/customer-form";
import CustomerList from "@/components/customer-list";

export default function Home() {
  const [extractedData, setExtractedData] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const handleDataExtracted = (data: any) => {
    setExtractedData(data);
    setShowForm(true);
  };

  const handleFormSubmitted = () => {
    setShowForm(false);
    setExtractedData(null);
  };

  const handleFormCancelled = () => {
    setShowForm(false);
    setExtractedData(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Camera className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Ceramics Studio</h1>
                <p className="text-sm text-slate-500">Customer Management</p>
              </div>
            </div>
            <button className="p-2 text-slate-600 hover:text-slate-800 transition-colors">
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Camera Capture Section */}
        <CameraCapture onDataExtracted={handleDataExtracted} />

        {/* Customer Form Section */}
        {showForm && (
          <CustomerForm
            initialData={extractedData}
            onSubmitted={handleFormSubmitted}
            onCancelled={handleFormCancelled}
          />
        )}

        {/* Customer List Section */}
        <CustomerList />
      </main>
    </div>
  );
}
