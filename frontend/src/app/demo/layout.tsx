import DemoSidebar from '@/components/layout/DemoSidebar';
import QueryProvider from '@/components/providers/QueryProvider';
import DemoTour from '@/components/demo/DemoTour';
import DemoTourFloatingBtn from '@/components/demo/DemoTourFloatingBtn';

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <div className="app-layout">
        <DemoSidebar />
        <div className="main-content">
          {children}
        </div>
      </div>
      <DemoTour />
      <DemoTourFloatingBtn />
    </QueryProvider>
  );
}
