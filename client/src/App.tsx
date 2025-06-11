import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConnectionMonitor } from "@/components/connection-monitor";
import { Button } from "@/components/ui/button";
import { Camera, Users, Search } from "lucide-react";
import Home from "@/pages/home";
import Customers from "@/pages/customers";
import ImageSearch from "@/pages/image-search";
import NotFound from "@/pages/not-found";

function Navigation() {
  const [location] = useLocation();
  
  return (
    <nav className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
      <div className="max-w-6xl mx-auto flex justify-center">
        <div className="grid grid-cols-3 gap-2 sm:flex sm:space-x-4 w-full sm:w-auto">
          <Link href="/">
            <Button 
              variant={location === "/" ? "default" : "outline"}
              className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base w-full sm:w-auto"
            >
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Register Customer</span>
              <span className="sm:hidden">Register</span>
            </Button>
          </Link>
          <Link href="/customers">
            <Button 
              variant={location === "/customers" ? "default" : "outline"}
              className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base w-full sm:w-auto"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Customer Management</span>
              <span className="sm:hidden">Manage</span>
            </Button>
          </Link>
          <Link href="/image-search">
            <Button 
              variant={location === "/image-search" ? "default" : "outline"}
              className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base w-full sm:w-auto"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Image Search</span>
              <span className="sm:hidden">Search</span>
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
        <div className="min-h-screen bg-slate-50">
          <ConnectionMonitor />
          <Router />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
