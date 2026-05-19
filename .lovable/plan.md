# Operational Structure Engine Implementation Plan

I will implement a multi-step operational structure system in the "Operacional" tab. This involves evolving the current "Gerar estrutura operacional" functionality into a smart engine that can handle both single tasks and complex multi-step workflows with dependencies.

## Technical Details

### 1. Database Schema Evolution
- Enhanced `demandas` table with `is_parent`, `parent_id`, and `template_type`.
- New `operational_flow_templates` and `operational_flow_steps` tables for pre-defined multi-step workflows.
- New `task_dependencies` table for task locking logic.
- Migration already applied to establish these structures and initial data.

### 2. Frontend Components
- **Preview Modal**: A new dialog to review and edit tasks (single and multi-step) before final generation.
- **Parent Card UI**: Enhanced card in the "Operacional" tab to show progress (e.g., "2/4 steps"), current stage, and status.
- **Step Dependency UI**: Visual indicators on cards showing their relationship to parent flows and blocking status.
- **Workflow Locking**: Implementation of UI-level locks for tasks with unmet dependencies.

### 3. State Management & Logic
- Update `useDemandasStore` to handle parent-child relationships and dependency resolution.
- Enhance `gerarEstruturaOperacional` to support previewing and conditional creation.
- Logic to automatically unlock "next steps" when a dependency is completed (for automatic mode) or show a "Release" button (for manual mode).

## Proposed Changes

### Database & Types
- Update `src/integrations/supabase/types.ts` with new columns and tables.

### Logic (Store)
- Modify `src/store/operationalTemplates.ts` to include flow template loading and structured generation logic.
- Update `src/store/demandas.ts` to support hierarchical task management.

### UI Components
- Update `src/components/projeto/OperacionalTab.tsx` to launch the preview modal.
- Create `src/components/projeto/OperationalPreviewModal.tsx`.
- Modify `src/components/projeto/AreaTab.tsx` and related Kanban components to display dependency status.

### Security & RLS
- All new tables have RLS enabled, allowing authenticated users access while keeping operational data secure.

## Implementation Steps

1.  **Update Types**: Synchronize frontend types with the new database schema.
2.  **Flow Logic**: Implement the generator logic that parses templates into a flat list of tasks with dependency IDs.
3.  **Preview Modal**: Build the "Previa antes de gerar" UI where users can edit/remove tasks.
4.  **Task Hierarchy**: Update the Kanban cards to show parent-flow progress.
5.  **Dependency Engine**: Implement the logic that checks if a task is "Aguardando etapa anterior" and handles the unlocking flow.
6.  **History Integration**: Ensure all automatic actions are logged in the `atividades` tab.

No existing data will be removed or altered destructively. The layout will remain consistent with the current design system.
