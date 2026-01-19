import React from 'react';
import { Sprint, SprintStatus } from '../../types/sprint.types';
import { format, isValid } from 'date-fns';

interface SprintPrintViewProps {
  sprints: Sprint[];
}

const safeFormatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  // If it's YYYY-MM-DD, append time to force local parsing or just parse parts manually
  // to avoid timezone shifts if the backend sends just a date string.
  // Assuming backend sends YYYY-MM-DD for date fields based on previous context.
  const date = new Date(dateStr.length === 10 ? dateStr + 'T12:00:00' : dateStr);
  return isValid(date) ? format(date, 'dd/MM/yyyy') : 'Data Inválida';
};

export const SprintPrintView = React.forwardRef<HTMLDivElement, SprintPrintViewProps>(
  ({ sprints }, ref) => {
    return (
      <div ref={ref} className="p-8 print:p-0 w-full bg-white text-black">
        <style type="text/css" media="print">
          {`
            @page { size: auto; margin: 0mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
            .print-break-after { page-break-after: always; }
          `}
        </style>
        
        {sprints.map((sprint, index) => (
          <div 
            key={sprint.id} 
            className={`w-full max-w-2xl mx-auto border-2 border-gray-800 rounded-lg p-6 mb-8 print:mb-0 print:border-2 print:border-gray-800 print:shadow-none bg-white ${index < sprints.length - 1 ? 'print-break-after' : ''}`}
            style={{ minHeight: '100mm' }} // Ensure it looks substantial
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-6 border-b-2 border-gray-200 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{sprint.title}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                    sprint.status === SprintStatus.COMPLETED ? 'bg-green-100 text-green-800 border-green-200' :
                    sprint.status === SprintStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    'bg-gray-100 text-gray-800 border-gray-200'
                  }`}>
                    {sprint.status === SprintStatus.COMPLETED ? 'Concluído' : 
                     sprint.status === SprintStatus.IN_PROGRESS ? 'Em Andamento' : 'Planejado'}
                  </span>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-md print:bg-gray-50">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Data Início</p>
                <p className="font-mono text-lg font-medium">{safeFormatDate(sprint.start_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Data Término</p>
                <p className="font-mono text-lg font-medium">{safeFormatDate(sprint.end_date)}</p>
              </div>
            </div>

            {/* Tasks */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-l-4 border-gray-800 pl-2">
                Lista de Tarefas
              </h3>
              
              {sprint.tasks && sprint.tasks.length > 0 ? (
                <ul className="space-y-3">
                  {sprint.tasks.map((task) => (
                    <li key={task.id} className="flex items-start group">
                      <div className={`
                        flex-shrink-0 w-5 h-5 mt-0.5 border-2 rounded mr-3 flex items-center justify-center
                        ${task.is_completed ? 'bg-gray-800 border-gray-800' : 'border-gray-400 bg-white'}
                      `}>
                         {task.is_completed && (
                           <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                           </svg>
                         )}
                      </div>
                      <span className={`text-sm leading-relaxed ${task.is_completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        {task.description}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 italic text-sm py-4 text-center border-2 border-dashed border-gray-200 rounded-lg">
                  Nenhuma tarefa registrada para este sprint.
                </p>
              )}
            </div>

            {/* Observations */}
            {sprint.observation && (
              <div className="mt-auto pt-4 border-t-2 border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Observações</h3>
                <p className="text-sm text-gray-600 italic whitespace-pre-wrap leading-relaxed">
                  {sprint.observation}
                </p>
              </div>
            )}
            
            {/* Footer for print only */}
            <div className="hidden print:block fixed bottom-4 right-4 text-xs text-gray-300">
              Gerado pelo Sistema Checklist
            </div>
          </div>
        ))}
      </div>
    );
  }
);

SprintPrintView.displayName = 'SprintPrintView';
