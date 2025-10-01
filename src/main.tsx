import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// import App from './App.tsx'
import { RecoilRoot } from 'recoil'
// import Map from './Map.tsx'
import MapView from './MapView.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RecoilRoot>
      <QueryClientProvider client={queryClient}>
        <MapView />
      </QueryClientProvider>
    </RecoilRoot>
  </StrictMode>,
)
