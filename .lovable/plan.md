text
I will implement a global "Create Task" feature, standardize forms, and add workflow capabilities to posts. This is an expansion of the current system, ensuring backward compatibility.

### Phase 1: Global "Create Task" Sidebar Item
- Add "Criar Tarefa" to `AppSidebar.tsx` with a `Plus` icon, positioned after "Clientes".
- Create `src/pages/CriarTarefa.tsx` as the landing page for this menu item.
- Register the `/criar-tarefa` route in `App.tsx`.

### Phase 2 & 3: TaskFormBase Component
- Create `src/components/tarefas/TaskFormBase.tsx` based on `DemandaDetalheDialog.tsx`.
- Include fields: Cliente (select), Área (select: Posts, Vídeos, etc.), Subtipo, Título, Urgente (toggle), Status, Prioridade, Datas (Início/Limite), Responsáveis, Anexos, Drive/External links, Briefing, Comments, FAQ, and Workflow.
- Implement auto-mapping logic: saving a task with a specific "Área" will automatically create it in the corresponding category in the CRM store.

### Phase 4 & 5: Post Standardization & Workflow
- Update `PostDetalhe.tsx` to use `TaskFormBase`.
- Add conditional fields for "Posts" category: Publicação dates, Legenda, and Meta/Meister links.
- Integrate `WorkflowSection` into `PostDetalhe.tsx` to allow creating follow-up tasks (e.g., Designer finishes post -> system suggests scheduling).

### Phase 6: Blocked Tasks Logic
- Add "AGUARDANDO ETAPA ANTERIOR" status handling.
- Allow editing briefing, attachments, and comments but restrict movement/completion while blocked.
- Update `DemandCard.tsx` and `DemandaDetalheDialog.tsx` to display lock indicators and restricted actions.

### Phase 7 to 10: History, Responsiveness & Compatibility
- Ensure all new tasks are registered in the activity history.
- Maintain existing layouts and ensure mobile responsiveness (no horizontal scroll).
- Ensure existing cards continue to work without modification.

### Technical Details
- **Store**: Use `useDemandasStore` for task creation and `useCRM` for posts/cards.
- **UI Components**: Leverage Shadcn UI (Select, Popover, Card, etc.) for consistency.
- **Workflow**: Use `task_dependencies` logic for blocking/unlocking tasks.
- **Layout**: Use CSS Grid/Flex for responsive form sections.
