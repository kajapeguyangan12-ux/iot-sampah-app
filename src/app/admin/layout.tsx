import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { RoleGate } from "@/components/role-gate";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RoleGate allow="admin">
      <main className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-6 px-4 py-6 md:px-8 xl:px-10">
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <AdminSidebar />
          <div className="min-w-0">{children}</div>
        </div>
      </main>
    </RoleGate>
  );
}
