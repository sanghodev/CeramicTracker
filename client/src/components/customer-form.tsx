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
  const suggestedDates = getSuggestedDates();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      workDate: initialData?.workDate || new Date().toISOString().split('T')[0],
      status: "waiting",
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

  const onSubmit = (data: FormData) => {
    createCustomerMutation.mutate(data);
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

            <FormField
              control={form.control}
              name="workDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-slate-700">Work Date</FormLabel>
                  
                  {/* Quick date suggestions */}
                  <div className="flex gap-2 mb-2">
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
                        {suggestion.label}
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

            <div className="flex space-x-3 pt-4">
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
