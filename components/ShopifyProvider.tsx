
import React, { useMemo } from 'react';
import { Provider } from '@shopify/app-bridge-react';

export const ShopifyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const host = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('host');
  }, []);

  const shop = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('shop');
  }, []);
  
  if (host && shop) {
    const appBridgeConfig = {
      apiKey: 'JUST_A_PLACEHOLDER', // This will be replaced by your actual Shopify App API key later
      host,
      forceRedirect: true,
    };

    return (
      <Provider config={appBridgeConfig}>
        {children}
      </Provider>
    );
  }

  // If not in Shopify context, render children without the provider
  return <>{children}</>;
};
