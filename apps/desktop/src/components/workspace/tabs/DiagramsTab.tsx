import { Zap } from 'lucide-react';

export function DiagramsTab() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground p-8">
      <div className="h-16 w-16 bg-surface/50 rounded-full flex items-center justify-center">
        <Zap className="h-8 w-8 opacity-30" />
      </div>
      <div className="text-center">
        <p className="font-medium text-muted-foreground mb-1">Diagrams</p>
        <p className="text-sm">Extracted diagrams and flowcharts will appear here.</p>
      </div>
    </div>
  );
}
