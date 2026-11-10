import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { domAnimation, LazyMotion, MotionConfig } from 'motion/react'
import { ThemeProvider, useTheme } from './contexts/ThemeProvider'
import { ToastProvider } from './contexts/ToastProvider'
import { useSession } from './data/store'
import AppShell from './components/layout/AppShell'
import { Cursor } from './components/layout/Cursor'
import { Preloader } from './components/layout/Preloader'
import { StageHost } from './components/three/StageHost'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Patients = lazy(() => import('./pages/Patients'))
const Tests = lazy(() => import('./pages/Tests'))
const Masters = lazy(() => import('./pages/Masters'))
const Billing = lazy(() => import('./pages/Billing'))
const Collections = lazy(() => import('./pages/Collections'))
const Invoices = lazy(() => import('./pages/Invoices'))
const Results = lazy(() => import('./pages/Results'))
const Reports = lazy(() => import('./pages/Reports'))
const Settings = lazy(() => import('./pages/Settings'))
const NotFound = lazy(() => import('./pages/NotFound'))

function RequireSession({ children }: { children: ReactNode }) {
  const session = useSession()
  const location = useLocation()
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

function MotionRoot({ children }: { children: ReactNode }) {
  const { motion } = useTheme()
  return <MotionConfig reducedMotion={motion === 'reduced' ? 'always' : 'user'}>{children}</MotionConfig>
}

export default function App() {
  return (
    <ThemeProvider>
      <LazyMotion features={domAnimation} strict>
        <MotionRoot>
          <ToastProvider>
            <BrowserRouter>
              <StageHost />
              <Preloader />
              <Cursor />
              <Routes>
                <Route
                  path="/login"
                  element={
                    <Suspense fallback={null}>
                      <Login />
                    </Suspense>
                  }
                />
                <Route
                  element={
                    <RequireSession>
                      <AppShell />
                    </RequireSession>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="patients" element={<Patients />} />
                  <Route path="patients/:id" element={<Patients />} />
                  <Route path="master" element={<Navigate to="/master/tests" replace />} />
                  <Route path="master/tests" element={<Tests />} />
                  <Route path="master/:kind" element={<Masters />} />
                  <Route path="tests" element={<Navigate to="/master/tests" replace />} />
                  <Route path="billing" element={<Billing />} />
                  <Route path="collections" element={<Collections />} />
                  <Route path="results" element={<Results />} />
                  <Route path="invoices" element={<Invoices />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </MotionRoot>
      </LazyMotion>
    </ThemeProvider>
  )
}

