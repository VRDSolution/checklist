import React from 'react';
import { Sprint, SprintStatus } from '../../types/sprint.types';
import { format, isValid } from 'date-fns';

interface SprintPrintViewProps {
  sprints: Sprint[];
}

const safeFormatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr.length === 10 ? dateStr + 'T12:00:00' : dateStr);
  return isValid(date) ? format(date, 'dd/MM/yyyy') : 'Data Inválida';
};

export const SprintPrintView = React.forwardRef<HTMLDivElement, SprintPrintViewProps>(
  ({ sprints }, ref) => {
    return (
      <div ref={ref} className="p-8 print:p-6 w-full bg-white text-black font-sans">
        <style type="text/css" media="print">
          {`
            @page { size: A4; margin: 10mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
            .print-break-after { page-break-after: always; }
          `}
        </style>
        
        {sprints.map((sprint, index) => (
          <div 
            key={sprint.id} 
            className={`w-full max-w-3xl mx-auto border-2 border-slate-800 rounded-xl p-8 mb-8 bg-white ${index < sprints.length - 1 ? 'print-break-after' : ''}`}
          >
            {/* Header */}
            <header className="flex justify-between items-start border-b-4 border-slate-800 pb-6 mb-8">
              <div>
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Sprint Card</h2>
                <h1 className="text-4xl font-black text-slate-900 leading-tight">{sprint.title}</h1>
              </div>
              <div className="flex flex-col items-end">
                <span className={`px-4 py-2 rounded-lg text-sm font-bold uppercase border-2 ${
                  sprint.status === SprintStatus.COMPLETED ? 'bg-emerald-100 text-emerald-800 border-emerald-800' :
                  sprint.status === SprintStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800 border-blue-800' :
                  'bg-gray-100 text-gray-800 border-gray-800'
                }`}>
                  {sprint.status === SprintStatus.COMPLETED ? 'Concluído' : 
                   sprint.status === SprintStatus.IN_PROGRESS ? 'Em Andamento' : 'Planejado'}
                </span>
              </div>
            </header>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Data de Início</p>
                <p className="text-xl font-mono font-semibold text-slate-900">{safeFormatDate(sprint.start_date)}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Data de Término</p>
                <p className="text-xl font-mono font-semibold text-slate-900">{safeFormatDate(sprint.end_date)}</p>
              </div>
            </div>

            {/* Tasks Section */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider">
                  Tarefas do Sprint
                </h3>
                <div className="flex-1 h-px bg-slate-300"></div>
                <span className="text-xs font-medium text-slate-500">
                  {sprint.tasks?.filter(t => t.is_completed).length || 0}/{sprint.tasks?.length || 0} Concluídas
                </span>
              </div>

              <div className="space-y-3">
                {sprint.tasks && sprint.tasks.length > 0 ? (
                  sprint.tasks.map((task) => (
                    <div key={task.id} className="flex items-start p-3 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg transition-colors">
                      {/* Checkbox Visual */}
                      <div className={`
                        flex-shrink-0 w-6 h-6 mr-4 border-2 rounded flex items-center justify-center
                        ${task.is_completed ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-400'}
                      `}>
                        {task.is_completed && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 pt-0.5">
                        <p className={`text-base font-medium leading-tight ${task.is_completed ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                          {task.description}
                        </p>
                        {task.completed_at && task.is_completed && (
                           <p className="text-xs text-slate-400 mt-1">
                             Concluído em: {new Date(task.completed_at || '').toLocaleDateString()}
                           </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                    <p className="text-slate-400 italic">Nenhuma tarefa registrada para este sprint.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Observations */}
            {sprint.observation && (
              <div className="mt-8 bg-amber-50 border border-amber-100 p-6 rounded-lg">
                <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Observações</h3>
                <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed">
                  {sprint.observation}
                </p>
              </div>
            )}
            
            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-400">
              <div>
                <p>Gerado pelo Sistema Checklist</p>
                <p className="mt-1">Impresso em: {new Date().toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p>Identificador: #{sprint.id}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
);

SprintPrintView.displayName = 'SprintPrintView';
