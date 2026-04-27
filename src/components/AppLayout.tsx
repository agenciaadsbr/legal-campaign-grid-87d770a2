import { Outlet, useLocation, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Bell, Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import { useCRM, useCRMBootstrap } from "@/store/crm";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Fragment, useMemo } from "react";

function useBreadcrumbs() {
  const { pathname } = useLocation();
  const { clientes, posts, cards } = useCRM();
  return useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    const crumbs: { label: string; to?: string }[] = [];
    if (parts.length === 0) return [{ label: "Dashboard" }];
    if (parts[0] === "clientes") {
      crumbs.push({ label: "Clientes/Posts", to: "/clientes" });
      if (parts[1]) {
        const cliente = clientes.find((c) => c.id === parts[1]);
        crumbs.push({ label: cliente?.nome_cliente ?? "Cliente", to: `/clientes/${parts[1]}` });
        if (parts[2] === "posts" && parts[3]) {
          const post = posts.find((p) => p.id === parts[3]);
          const card = post && cards.find((c) => c.id === post.card_id);
          crumbs.push({ label: card?.titulo_card ?? post?.titulo_post ?? "Post" });
        }
      }
    } else {
      crumbs.push({ label: parts[0].replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) });
    }
    return crumbs;
  }, [pathname, clientes, posts, cards]);
}

export function AppLayout() {
  useCRMBootstrap();
  const { theme, toggle } = useTheme();
  const alertasPendentes = useCRM((s) => s.alertas.filter((a) => a.status === "Pendente").length);
  const crumbs = useBreadcrumbs();

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b bg-card flex items-center px-4 gap-3 sticky top-0 z-30">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <Breadcrumb className="hidden sm:block">
              <BreadcrumbList>
                {crumbs.map((c, i) => (
                  <Fragment key={i}>
                    <BreadcrumbItem>
                      {c.to && i < crumbs.length - 1 ? (
                        <BreadcrumbLink asChild>
                          <Link to={c.to}>{c.label}</Link>
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{c.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                    {i < crumbs.length - 1 && <BreadcrumbSeparator />}
                  </Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-1">
              <Link to="/alertas">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  {alertasPendentes > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-destructive text-destructive-foreground">
                      {alertasPendentes}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={toggle}>
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </header>
          <main className="flex-1 min-w-0 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
