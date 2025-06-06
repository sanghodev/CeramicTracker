import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Camera, Users } from "lucide-react";
import Home from "@/pages/home";
import Customers from "@/pages/customers";
import NotFound from "@/pages/not-found";

function Navigation() {
  const [location] = useLocation();
  
  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="max-w-6xl mx-auto flex justify-center space-x-4">
        <Link href="/">
          <Button 
            variant={location === "/" ? "default" : "outline"}
            className="flex items-center gap-2"
          >
            <Camera className="h-4 w-4" />
            Register Customer
          </Button>
        </Link>
        <Link href="/customers">
          <Button 
            variant={location === "/customers" ? "default" : "outline"}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Customer Management
          </Button>
        </Link>
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
