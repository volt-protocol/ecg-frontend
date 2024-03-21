import AppLayout from "layouts/AppLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Dashboard | Ethereum Credit Guild',
  description: 'Unlocking the Future of Finance',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
}
