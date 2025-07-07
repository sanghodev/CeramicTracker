import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Camera, Users, Search } from "lucide-react";
import Home from "@/pages/home";
import Customers from "@/pages/customers";
import ImageSearch from "@/pages/image-search";
import NotFound from "@/pages/not-found";

function Navigation() {
  const [location] = useLocation();
  
  return (
    <nav className="bg-white border-b border-slate-200 px-2 sm:px-6 py-3">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-3 gap-1 sm:flex sm:justify-center sm:space-x-4">
          <Link href="/">
            <Button 
              variant={location === "/" ? "default" : "outline"}
              className="flex flex-col sm:flex-row items-center gap-1 text-xs sm:text-base w-full sm:w-auto py-2 px-2 sm:px-4 h-auto sm:h-10"
            >
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Register Customer</span>
              <span className="sm:hidden text-[10px] leading-tight">Register</span>
            </Button>
          </Link>
          <Link href="/customers">
            <Button 
              variant={location === "/customers" ? "default" : "outline"}
              className="flex flex-col sm:flex-row items-center gap-1 text-xs sm:text-base w-full sm:w-auto py-2 px-2 sm:px-4 h-auto sm:h-10"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Customer Management</span>
              <span className="sm:hidden text-[10px] leading-tight">Manage</span>
            </Button>
          </Link>
          <Link href="/image-search">
            <Button 
              variant={location === "/image-search" ? "default" : "outline"}
              className="flex flex-col sm:flex-row items-center gap-1 text-xs sm:text-base w-full sm:w-auto py-2 px-2 sm:px-4 h-auto sm:h-10"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Image Search</span>
              <span className="sm:hidden text-[10px] leading-tight">Search</span>
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/customers" component={Customers} />
        <Route path="/image-search" component={ImageSearch} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
