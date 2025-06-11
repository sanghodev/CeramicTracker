import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';

export function ConnectionMonitor() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'healthy' | 'unhealthy'>('checking');
  const [healthData, setHealthData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setConnectionStatus('checking');
    setError(null);
    
    try {
      const response = await apiRequest('GET', '/api/health');
      const data = await response.json();
      setHealthData(data);
      setConnectionStatus(data.status === 'healthy' ? 'healthy' : 'unhealthy');
    } catch (err: any) {
      setError(err.message);
      setConnectionStatus('unhealthy');
    }
  };

  useEffect(() => {
    checkHealth();
    
    // Check health every 30 seconds in deployed environment
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (connectionStatus === 'healthy') {
    return null; // Don't show anything when everything is working
  }

  return (
    <Alert className={connectionStatus === 'checking' ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'}>
      <div className="flex items-center gap-2">
        {connectionStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin" />}
        {connectionStatus === 'unhealthy' && <AlertCircle className="h-4 w-4 text-red-600" />}
        <AlertDescription>
          {connectionStatus === 'checking' && 'Checking server connection...'}
          {connectionStatus === 'unhealthy' && (
            <div className="space-y-2">
              <p className="font-medium">Connection Issue Detected</p>
              <p className="text-sm">
                {error ? `Error: ${error}` : 'Unable to connect to the server. This may be a temporary issue.'}
              </p>
              {healthData && (
                <div className="text-xs text-gray-600">
                  <p>Response time: {healthData.responseTime}</p>
                  <p>Environment: {healthData.environment}</p>
                  <p>Timestamp: {new Date(healthData.timestamp).toLocaleTimeString()}</p>
                </div>
              )}
              <Button 
                onClick={checkHealth} 
                size="sm" 
                variant="outline"
                className="mt-2"
              >
                Retry Connection
              </Button>
            </div>
          )}
        </AlertDescription>
      </div>
    </Alert>
  );
}