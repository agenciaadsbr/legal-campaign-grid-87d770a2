import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Users, FileText, Bell, BarChart3, Scale, LogOut, Settings, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Menu fixo — visível para TODOS os usuários autenticados (admin, editor, viewer)
// Build tag: sidebar-v3-demandas-always-visible
type MenuItem = { title: string; url: string; icon: typeof LayoutDashboard; end?: boolean };

const MENU_ITEMS: MenuItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, end: true },
  { title: "Minhas Tarefas", url: "/minhas-tarefas", icon: CheckSquare },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Contratos", url: "/contratos", icon: FileText },
  { title: "Alertas", url: "/alertas", icon: Bell },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, roles, signOut } = useAuth();
  const initial = (user?.email ?? "?").charAt(0).toUpperCase();
  const roleLabel = roles[0] ?? "—";

  const handleSignOut = async () => {
    await signOut();
    toast.success("Sessão encerrada");
    navigate("/auth", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center shrink-0">
            <Scale className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold text-sidebar-foreground">Dash Tasks</div>
              <div className="text-[10px] text-sidebar-foreground/60">Gestão de Tarefas</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {MENU_ITEMS.map((item) => {
                const active = item.end ? pathname === item.url : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.end}
                        className={cn(
                          "flex items-center gap-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground rounded-md transition-colors",
                          active && "bg-sidebar-accent text-sidebar-foreground font-medium"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-3 py-3">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
              {initial}
            </div>
            <div className="leading-tight overflow-hidden flex-1">
              <div className="text-xs font-medium text-sidebar-foreground truncate">
                {user?.email ?? "—"}
              </div>
              <div className="text-[10px] text-sidebar-foreground/60 capitalize">{roleLabel}</div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-sidebar-foreground/70 hover:text-sidebar-foreground"
              onClick={handleSignOut}
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <button
            onClick={handleSignOut}
            title="Sair"
            className="h-7 w-7 mx-auto rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary hover:bg-primary/30 transition-colors"
          >
            {initial}
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
