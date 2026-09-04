import React from 'react';
import { IntegrationsHub } from '@/components/integrations/IntegrationsHub';

export const IntegrationsPage: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto bg-background text-foreground min-h-0 selection:bg-primary">
      <main className="w-full max-w-full px-6 lg:px-10 py-8">
        <IntegrationsHub />
      </main>
    </div>
  );
};
