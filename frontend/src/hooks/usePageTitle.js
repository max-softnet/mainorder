import { useEffect } from 'react';

export default function usePageTitle(...parts) {
  useEffect(() => {
    const segments = ['Main Order', ...parts.filter(Boolean)];
    document.title = segments.join(' — ');
  }, parts);
}
