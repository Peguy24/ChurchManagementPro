import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useImpersonation } from '@/hooks/useImpersonation';

export default function ImpersonationBanner() {
  const { isImpersonating, impersonation, exit } = useImpersonation();

  if (!isImpersonating || !impersonation) return null;

  return (
    <div className="sticky top-0 z-[100] w-full bg-destructive text-destructive-foreground shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="truncate">
            <strong>Impersonation active</strong> — viewing as{' '}
            <strong>{impersonation.tenantName}</strong>
          </span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 shrink-0"
          onClick={() => void exit()}
        >
          <X className="mr-1 h-3 w-3" /> Exit
        </Button>
      </div>
    </div>
  );
}
