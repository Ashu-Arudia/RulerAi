import DemoSidebar from '@/components/layout/DemoSidebar';

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <DemoSidebar />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}
