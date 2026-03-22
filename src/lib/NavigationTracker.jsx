import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { pagesConfig } from '@/pages.config';

export default function NavigationTracker() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { Pages, mainPage } = pagesConfig;
  const mainPageKey = mainPage ?? Object.keys(Pages)[0];

  // Post navigation changes to parent window
  useEffect(() => {
    window.parent?.postMessage(
      {
        type: 'app_changed_url',
        url: window.location.href,
      },
      '*'
    );
  }, [location]);

  // Log user activity when navigating to a page
  useEffect(() => {
    const pathname = location.pathname;
    let pageName;

    if (pathname === '/' || pathname === '') {
      pageName = mainPageKey;
    } else {
      const pathSegment = pathname.replace(/^\//, '').split('/')[0];
      const pageKeys = Object.keys(Pages);
      const matchedKey = pageKeys.find(
        (key) => key.toLowerCase() === pathSegment.toLowerCase()
      );
      pageName = matchedKey || null;
    }

    // Log navigation (could be sent to analytics service)
    if (isAuthenticated && pageName) {
      console.debug(`[Navigation] User visited: ${pageName}`);
    }
  }, [location, isAuthenticated, Pages, mainPageKey]);

  return null;
}
