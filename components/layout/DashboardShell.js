'use client';

import { AppProvider } from '@/context/AppContext';
import Sidebar from '@/components/layout/Sidebar';
import Toast from '@/components/shared/Toast';
import Navbar from '@/components/layout/Navbar';

/**
 * DashboardShell — wraps all /dashboard and /tools/* pages.
 * Provides: top navbar + collapsible sidebar + main content area.
 */
export default function DashboardShell({ children, noPadding = false }) {
  return (
    <AppProvider>
      <div className="flex flex-col h-screen bg-dark-950 text-dark-50 overflow-hidden">
        <Navbar />
        <div className="flex flex-1 overflow-hidden pt-14">
          {!noPadding && (
            <div className="hidden md:flex">
              <Sidebar />
            </div>
          )}
          <main className="flex-1 overflow-hidden flex flex-col bg-dark-950">
            {noPadding ? (
              // Full-height tools (e.g. the PDF editor) manage their own
              // scroll and layout — render directly without the padded wrapper.
              children
            ) : (
              <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scroll p-6 sm:p-8">
                {children}
              </div>
            )}
          </main>
        </div>
        <Toast />
      </div>
    </AppProvider>
  );
}
