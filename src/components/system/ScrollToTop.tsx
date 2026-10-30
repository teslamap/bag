import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  useEffect(() => {
    if (search) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [search]);
  return null;
}
