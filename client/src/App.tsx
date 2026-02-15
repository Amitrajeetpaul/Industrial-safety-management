import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Report from "@/pages/Report";
import Incidents from "@/pages/Incidents";
import Risks from "@/pages/Risks";
import NotFound from "@/pages/not-found";
import { Navigation } from "@/components/Navigation";

function ProtectedRoute({ component: Component, allowedRoles }: { component: any, allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navigation />
      <div className="lg:pl-64 pt-16 lg:pt-0 min-h-screen bg-muted/20">
        <Component />
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      
      <Route path="/report">
        {() => <ProtectedRoute component={Report} />}
      </Route>
      
      <Route path="/incidents">
        {() => <ProtectedRoute component={Incidents} allowedRoles={['admin', 'manager']} />}
      </Route>
      
      <Route path="/risks">
        {() => <ProtectedRoute component={Risks} allowedRoles={['admin', 'manager']} />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}

export default App;
