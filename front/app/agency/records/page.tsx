'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AgencyRecordsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/agency/services');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <p className="text-muted-foreground">Redirigiendo a Crear servicio...</p>
    </div>
  );
}
