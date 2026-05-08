import type { Demanda } from "@/store/demandas";

export type ModoLiberacao = "automatico" | "manual";

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  modo_liberacao: ModoLiberacao;
  liberado: boolean;
  liberado_em: string | null;
  liberado_por: string | null;
  created_at: string;
}

/** Esta tarefa está aguardando alguma dependência ainda não liberada? */
export function isAguardandoDependencia(
  taskId: string,
  deps: TaskDependency[]
): boolean {
  return deps.some((d) => d.task_id === taskId && !d.liberado);
}

/** Lista de dependências (pais) ainda pendentes desta tarefa. */
export function getDependenciasPendentes(
  taskId: string,
  deps: TaskDependency[]
): TaskDependency[] {
  return deps.filter((d) => d.task_id === taskId && !d.liberado);
}

/** Pais imediatas (todas, liberadas ou não) desta tarefa. */
export function getPais(taskId: string, deps: TaskDependency[]): TaskDependency[] {
  return deps.filter((d) => d.task_id === taskId);
}

/** Filhas imediatas: tarefas que dependem desta. */
export function getFilhas(taskId: string, deps: TaskDependency[]): TaskDependency[] {
  return deps.filter((d) => d.depends_on_task_id === taskId);
}

/** Demandas (filhas) que herdam desta tarefa. */
export function getDemandasFilhas(
  taskId: string,
  deps: TaskDependency[],
  demandas: Demanda[]
): Demanda[] {
  const ids = new Set(getFilhas(taskId, deps).map((d) => d.task_id));
  return demandas.filter((d) => ids.has(d.id));
}

/** Demandas (pais) das quais esta tarefa depende. */
export function getDemandasPais(
  taskId: string,
  deps: TaskDependency[],
  demandas: Demanda[]
): Demanda[] {
  const ids = new Set(getPais(taskId, deps).map((d) => d.depends_on_task_id));
  return demandas.filter((d) => ids.has(d.id));
}
