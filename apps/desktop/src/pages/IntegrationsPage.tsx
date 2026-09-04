import React from 'react';
import { IntegrationsHub } from '@/components/integrations/IntegrationsHub';

export const IntegrationsPage: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto bg-background text-foreground min-h-0 selection:bg-primary">
      <main className="max-w-6xl mx-auto px-6 md:px-10 py-10">
        <IntegrationsHub />
      </main>
    </div>
  );
};
