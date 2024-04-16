import AppLayout from 'layouts/AppLayout';
import { Metadata } from 'next';
import { TAB_DESCRIPTION, TAB_TITLE } from 'utils/constants';

export const metadata: Metadata = {
  title: `Dashboard | ${TAB_TITLE}`,
  description: TAB_DESCRIPTION
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
