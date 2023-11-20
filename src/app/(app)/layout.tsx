import AppLayout from "layouts/AppLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Dashboard | Volt Protocol',
  description: '...',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
}
