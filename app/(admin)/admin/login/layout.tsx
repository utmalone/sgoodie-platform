export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-fog px-6 py-12">
      {children}
    </div>
  );
}
