import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Save, X, CheckCircle, Calendar, Clock, Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { insertCustomerSchema } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatPhoneNumber, isValidEmail, getSuggestedDates } from "@/lib/ocr";
import { z } from "zod";

const formSchema = insertCustomerSchema.extend({
  workDate: z.string().min(1, "Please enter work date"),
  isGroup: z.string().default("false"),
  groupSize: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CustomerFormProps {
  initialData?: any;
  onSubmitted: () => void;
  onCancelled: () => void;
}

export default function CustomerForm({ initialData, onSubmitted, onCancelled }: CustomerFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [phoneValue, setPhoneValue] = useState(initialData?.phone || "");
  const [emailValue, setEmailValue] = useState(initialData?.email || "");
  const [workImagePreview, setWorkImagePreview] = useState<string | null>(initialData?.workImage || null);
  const [isGroupBooking, setIsGroupBooking] = useState(false);
  const [groupSize, setGroupSize] = useState("2");
  const suggestedDates = getSuggestedDates();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      workDate: initialData?.workDate || new Date().toISOString().split('T')[0],
      status: "waiting",
      workImage: initialData?.workImage || "",
      isGroup: "false",
      groupSize: "",
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/customers", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Save Complete",
        description: "Customer information successfully saved.",
      });
      onSubmitted();
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "An error occurred while saving customer information.",
        variant: "destructive",
      });
    },
  });

  const generateGroupId = (workDate: string, groupSize: string) => {
    const date = new Date(workDate);
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // Generate group letter (A, B, C, etc.)
    const groupLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    
    // Generate sequential number (01, 02, etc.)
    const sequentialNumber = '01'; // This would be calculated based on existing groups for the day
    
    return `${year}${month}${day}-${groupSize}${groupLetter}${sequentialNumber}`;
  };

  const onSubmit = (data: FormData) => {
    const submissionData = { ...data };
    
    if (isGroupBooking) {
      submissionData.isGroup = "true";
      submissionData.groupSize = groupSize;
      submissionData.groupId = generateGroupId(data.workDate, groupSize);
    } else {
      submissionData.isGroup = "false";
      submissionData.groupSize = "";
      submissionData.groupId = "";
    }
    
    createCustomerMutation.mutate(submissionData);
  };

  const handlePhoneChange = (field: any, value: string) => {
    const formatted = formatPhoneNumber(value);
    setPhoneValue(formatted);
    field.onChange(formatted);
  };

  const handleEmailChange = (field: any, value: string) => {
    setEmailValue(value);
    field.onChange(value);
  };

  const handleWorkImageUpload = (field: any, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File Size Exceeded",
          description: "File size must be 5MB or less.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setWorkImagePreview(base64);
        field.onChange(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeWorkImage = (field: any) => {
    setWorkImagePreview(null);
    field.onChange("");
  };

  const selectSuggestedDate = (dateValue: string) => {
    form.setValue("workDate", dateValue);
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check className="text-secondary" size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Extracted Customer Information</h3>
          <p className="text-sm text-slate-600">Review and edit the information before saving</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-slate-700">Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter customer name"
                      {...field}
                      className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-slate-700">Phone Number</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="tel"
                        placeholder="555-123-4567"
                        value={phoneValue}
                        onChange={(e) => handlePhoneChange(field, e.target.value)}
                        maxLength={14}
                        className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                      {phoneValue.length === 14 && (
                        <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-slate-700">Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder="customer@example.com"
                        value={emailValue}
                        onChange={(e) => handleEmailChange(field, e.target.value)}
                        className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                      {emailValue && isValidEmail(emailValue) && (
                        <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Booking Type Selection */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Booking Type</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={!isGroupBooking ? "default" : "outline"}
                  onClick={() => {
                    setIsGroupBooking(false);
                    form.setValue("isGroup", "false");
                  }}
                  className="text-sm py-2"
                >
                  Single
                </Button>
                <Button
                  type="button"
                  variant={isGroupBooking ? "default" : "outline"}
                  onClick={() => {
                    setIsGroupBooking(true);
                    form.setValue("isGroup", "true");
                  }}
                  className="text-sm py-2"
                >
                  Group
                </Button>
              </div>
            </div>

            {/* Group Size Selection */}
            {isGroupBooking && (
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700">Group Size</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                  {[2, 3, 4, 5, 6].map((size) => (
                    <Button
                      key={size}
                      type="button"
                      size="sm"
                      variant={groupSize === size.toString() ? "default" : "outline"}
                      onClick={() => {
                        setGroupSize(size.toString());
                        form.setValue("groupSize", size.toString());
                      }}
                      className="text-xs"
                    >
                      {size}
                    </Button>
                  ))}
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-600">For groups larger than 6 people:</label>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="7"
                    max="50"
                    placeholder="Enter group size (7+)"
                    value={parseInt(groupSize) > 6 ? groupSize : ""}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      if (value && parseInt(value) >= 7) {
                        setGroupSize(value);
                        form.setValue("groupSize", value);
                      } else if (!value) {
                        setGroupSize("");
                        form.setValue("groupSize", "");
                      }
                    }}
                    className="w-full py-3 px-4 text-lg"
                    style={{ fontSize: '16px' }}
                  />
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="workDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-slate-700">Work Date</FormLabel>
                  
                  {/* Quick date suggestions */}
                  <div className="grid grid-cols-3 gap-1 mb-2">
                    {suggestedDates.map((suggestion) => (
                      <Button
                        key={suggestion.value}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => selectSuggestedDate(suggestion.value)}
                        className="text-xs flex items-center gap-1"
                      >
                        {suggestion.label === 'Today' && <Clock className="h-3 w-3" />}
                        {suggestion.label === 'Tomorrow' && <Calendar className="h-3 w-3" />}
                        {suggestion.label === 'Next Week' && <Calendar className="h-3 w-3" />}
                        <span className="truncate">{suggestion.label}</span>
                      </Button>
                    ))}
                  </div>
                  
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="workImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-slate-700">Work Photo (Optional)</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {/* Image upload button */}
                      <div className="flex items-center gap-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleWorkImageUpload(field, e)}
                          className="hidden"
                          id="work-image-upload"
                        />
                        <label
                          htmlFor="work-image-upload"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg cursor-pointer transition-colors"
                        >
                          <Upload className="h-4 w-4" />
                          Upload Photo
                        </label>
                        {workImagePreview && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeWorkImage(field)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        )}
                      </div>
                      
                      {/* Image preview */}
                      {workImagePreview && (
                        <div className="relative">
                          <img
                            src={workImagePreview}
                            alt="Work preview"
                            className="w-full max-w-sm h-48 object-cover rounded-lg border border-slate-200"
                          />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="submit"
                disabled={createCustomerMutation.isPending}
                className="flex-1 bg-primary hover:bg-blue-700 text-white font-semibold py-3"
              >
                <Save className="mr-2" size={16} />
                {createCustomerMutation.isPending ? "Saving..." : "Save"}
              </Button>
              <Button
                type="button"
                onClick={onCancelled}
                variant="outline"
                className="flex-1 bg-slate-500 hover:bg-slate-600 text-white font-semibold py-3"
              >
                <X className="mr-2" size={16} />
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </section>
  );
}
