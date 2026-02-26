'use client';

import { useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

export default function QrRouterPage() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const sp = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!type || !id) return;

    const desk = sp.get('desk') || undefined;

    if (type === 'desk') {
      router.replace(`/d/${id}`);
      return;
    }

    if (type === 'table') {
      router.replace(`/t/${id}`);
      return;
    }

    if (type === 'item') {
      if (desk) router.replace(`/d/${desk}?add=${id}`);
      else router.replace(`/owner/menu?add=${id}`);
      return;
    }

    // Service QR: /q/service/print?tenant=<tenantId>
    if (type === 'service') {
      const tenant = sp.get('tenant') || '';
      router.replace(`/checkout?service=${encodeURIComponent(id)}&tenant=${encodeURIComponent(tenant)}`);
      return;
    }

    router.replace(`/`);
  }, [type, id, sp, router]);

  return null;
}
