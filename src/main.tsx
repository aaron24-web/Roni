import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './shared/lib/queryClient'
import AuthProvider from './shared/context/AuthProvider'
import ToastProvider from './shared/components/feedback/ToastProvider'
import DialogProvider from './shared/components/feedback/DialogProvider'
import './index.css'
import './shared/styles/ui.css'
import App from './App'

const contenedor = document.getElementById('root')
if (!contenedor) throw new Error('No se encontró el elemento #root')

createRoot(contenedor).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <DialogProvider>
            <App />
          </DialogProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
