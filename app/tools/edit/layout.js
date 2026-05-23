import DashboardShell from '@/components/layout/DashboardShell';

/**
 * Edit-tool layout — bypasses the default padded/scrollable wrapper so the
 * PDF editor can manage its own scroll and sticky toolbar layout.
 */
export default function EditToolLayout({ children }) {
  return <DashboardShell noPadding>{children}</DashboardShell>;
}
