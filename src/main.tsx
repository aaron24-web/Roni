import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import AuthProvider from './context/AuthProvider'
import './index.css'
import App from './App'

const contenedor = document.getElementById('root')
if (!contenedor) throw new Error('No se encontró el elemento #root')

createRoot(contenedor).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
