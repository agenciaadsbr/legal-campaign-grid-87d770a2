- Consolidation of all types of activities (direct comments, post card comments, task comments, status changes, assignee changes, deadlines, creation, etc.) into the "Atividades" tab of the project.
- Detailed display for each item, including type, origin, author, date/time, related task title, category, and specific changes (previous vs. new value).
- Implementation of compact filters in the "Atividades" tab (All, Comments, Posts, Tasks, Status, Assignees, Deadlines, System) and by period (Today, Last 7/30 days, Custom).
- Addition of a "Ver histórico geral em Atividades" link in the "Histórico de Comentários" popup for quick navigation.
- Optimization of the `atividade_cliente` table usage to avoid duplicates and ensure traceability.

Technical Details:
- **`src/store/crm.ts`**: Update the `addAtividade` function to handle more specific metadata and ensure all relevant actions (status change, assign, comment) trigger an activity log.
- **`src/store/demandas.ts`**: Add activity logging to `updateDemanda`, `moveStatus`, `assign`, and `addComentario`.
- **`src/pages/ProjetoCliente.tsx`**: 
    - Expand `AtividadesTab` with filtering logic and a detailed list of activities.
    - Implement a grouping mechanism by date.
    - Add a specialized rendering for each activity type (e.g., status change vs. comment).
- **`src/components/HistoricoComentariosDialog.tsx`**: Add the button to navigate to the "Atividades" tab with the "Comentários" filter applied.
- **`src/store/atividades.ts`**: Ensure the store correctly handles the new activity structure and supports reloading/filtering.

User Verification Steps:
1. Open a client's project and go to the "Atividades" tab to see consolidated logs.
2. Add a comment to a Post or Task and verify it appears in "Atividades".
3. Change the status or assignee of a task and check the logged change.
4. Filter activities by "Comments" or "Status" to verify the filters work.
5. Use the link in the "Histórico de Comentários" popup to jump to the full history.
