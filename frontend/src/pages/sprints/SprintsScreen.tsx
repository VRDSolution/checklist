import React, { useState, useMemo } from 'react';
import { Plus, Calendar, CheckCircle, Circle, Trash2, MoreVertical, X, ArrowLeft, Folder, ChevronRight, Edit, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { SearchBar } from '../../components/ui/SearchBar';
import { useSprints } from '../../hooks/useSprints';
import { SprintStatus, CreateSprint, Sprint } from '../../types/sprint.types';
import { SprintPrintView } from '../../components/sprints/SprintPrintView';
import { useData } from '../../contexts/DataContext';
import { format, isValid } from 'date-fns';

const safeFormat = (dateStr: string, formatStr: string) => {
  // Fix timezone issue: force local time if string is just YYYY-MM-DD
  if (dateStr && dateStr.length === 10) {
    dateStr += 'T00:00:00';
  }
  const date = new Date(dateStr);
  return isValid(date) ? format(date, formatStr) : 'Invalid Date';
};

// Helper: Extract YYYY-MM-DD from an ISO string (or Date object) based on UTC values.
// This ensures that "2026-01-16T00:00:00.000Z" (which is actually Jan 16th)
// is converted to "2026-01-16" for the input value, regardless of the user's local timezone.
const toInputDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (!isValid(date)) return '';
  
  // Use UTC methods to extract the exact stored date
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface SprintsScreenProps {
  onNavigate: (page: string) => void;
}

export const SprintsScreen: React.FC<SprintsScreenProps> = ({ onNavigate }) => {
  const { projects } = useData();
  const [viewMode, setViewMode] = useState<'projects' | 'sprints'>('projects');
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { sprints, loading, createSprint, updateSprint, updateSprintStatus, updateSprintTask, deleteSprint } = useSprints(selectedProjectId);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  
  // Print functionality
  const [sprintsToPrint, setSprintsToPrint] = useState<Sprint[]>([]);
  const printRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Sprint-Card',
    onAfterPrint: () => setSprintsToPrint([]), // Clear state after printing
  });

  // Trigger print when data is set
  React.useEffect(() => {
    if (sprintsToPrint.length > 0) {
      handlePrint();
    }
  }, [sprintsToPrint, handlePrint]);

  const triggerPrintSprint = (sprint: Sprint) => {
    setSprintsToPrint([sprint]);
  };

  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [formData, setFormData] = useState<Partial<CreateSprint>>({
    title: '',
    start_date: '',
    end_date: '',
    observation: '',
    tasks: []
  });

  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projects;
    const term = searchTerm.toLowerCase();
    return projects.filter(p => 
      p.name.toLowerCase().includes(term) ||
      (p.client && p.client.toLowerCase().includes(term))
    );
  }, [projects, searchTerm]);

  const handleSelectProject = (projectId: number) => {
    setSelectedProjectId(projectId);
    setViewMode('sprints');
  };

  const handleBack = () => {
    if (viewMode === 'sprints') {
      setViewMode('projects');
      setSelectedProjectId(undefined);
    } else {
      onNavigate('dashboard');
    }
  };

  const selectedProject = projects.find(p => Number(p.id) === selectedProjectId);

  const handleAddTask = () => {
    if (!newTaskDescription.trim()) return;
    setFormData(prev => ({
      ...prev,
      tasks: [...(prev.tasks || []), { description: newTaskDescription }]
    }));
    setNewTaskDescription('');
  };

  const handleRemoveTask = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks?.filter((_, i) => i !== index)
    }));
  };

  const handleEditSprint = (sprint: Sprint) => {
    setEditingSprint(sprint);
    setFormData({
      title: sprint.title,
      start_date: toInputDate(sprint.start_date),
      end_date: toInputDate(sprint.end_date),
      observation: sprint.observation,
      tasks: [] // Only for new tasks
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSprint || !formData.title || !formData.start_date || !formData.end_date) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await updateSprint(editingSprint.id, {
        title: formData.title,
        start_date: formData.start_date,
        end_date: formData.end_date,
        observation: formData.observation,
        tasks: formData.tasks || []
      });
      setIsEditModalOpen(false);
      setEditingSprint(null);
      setFormData({ title: '', start_date: '', end_date: '', observation: '', tasks: [] });
    } catch (error) {
      alert('Failed to update sprint');
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.start_date || !formData.end_date || !selectedProjectId) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await createSprint({
        project_id: selectedProjectId,
        title: formData.title,
        start_date: formData.start_date,
        end_date: formData.end_date,
        observation: formData.observation,
        tasks: formData.tasks || []
      });
      setIsCreateModalOpen(false);
      setFormData({ title: '', start_date: '', end_date: '', observation: '', tasks: [] });
    } catch (error) {
      alert('Failed to create sprint');
    }
  };

  const toggleTask = async (sprint: Sprint, taskId: number, currentStatus: boolean) => {
    try {
      await updateSprintTask(sprint.id, taskId, { is_completed: !currentStatus });
    } catch (error) {
      console.error('Failed to update task', error);
    }
  };

  const handleDeleteSprint = async (id: number) => {
    if (confirm('Are you sure you want to delete this sprint?')) {
      await deleteSprint(id);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case SprintStatus.PLANNED: return 'Planejado';
      case SprintStatus.IN_PROGRESS: return 'Em Andamento';
      case SprintStatus.COMPLETED: return 'Concluído';
      default: return status;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {viewMode === 'projects' ? (
        <>
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => onNavigate('dashboard')} className="p-2 hover:bg-slate-200 rounded-full">
              <ArrowLeft size={24} className="text-slate-700" />
            </button>
            <h1 className="text-2xl font-bold text-slate-800">Gestão de Sprints</h1>
          </div>

          <SearchBar 
            value={searchTerm} 
            onChange={setSearchTerm} 
            placeholder="Buscar projeto..." 
          />

          <div className="space-y-3 mt-6">
            {filteredProjects.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Folder size={48} className="mx-auto mb-4 opacity-50" />
                <p>Nenhum projeto encontrado</p>
              </div>
            )}
            
            {filteredProjects.map(p => (
              <Card 
                key={p.id} 
                onClick={() => handleSelectProject(Number(p.id))} 
                className="p-5 flex items-center justify-between group cursor-pointer hover:shadow-md transition-shadow"
              >
                <div>
                  <h3 className="font-bold text-slate-800">{p.name}</h3>
                  <p className="text-sm text-slate-500">{p.client}</p>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-blue-900" />
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button onClick={handleBack} className="p-2 hover:bg-slate-200 rounded-full">
                <ArrowLeft size={24} className="text-slate-700" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Sprints</h1>
                <p className="text-sm text-slate-500">{selectedProject?.name}</p>
              </div>
            </div>
            
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="!w-[40px] !h-[40px] !p-0 md:!w-[200px] md:!h-auto md:!px-4 md:!py-2 flex items-center justify-center flex-none"
            >
              <Plus className="w-5 h-5 mr-0 md:mr-2" />
              <span className="hidden md:inline">Novo Sprint</span>
            </Button>
          </div>

          {loading ? (
            <div>Carregando...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-6">
              {sprints.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-350">
                  <p>Nenhum sprint encontrado para este projeto.</p>
                </div>
              )}
              {sprints.map(sprint => (
                <Card key={sprint.id} className="p-4 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{sprint.title}</h3>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Calendar className="w-4 h-4 mr-1" />
                        {safeFormat(sprint.start_date, 'dd/MM/yyyy')} - {safeFormat(sprint.end_date, 'dd/MM/yyyy')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        sprint.status === SprintStatus.COMPLETED ? 'bg-green-100 text-green-800' :
                        sprint.status === SprintStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {getStatusLabel(sprint.status || 'planned')}
                      </span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); triggerPrintSprint(sprint); }}
                        className="text-gray-500 hover:text-gray-700 mx-1"
                        title="Imprimir Card"
                      >
                       <Printer className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEditSprint(sprint); }}
                        className="text-blue-500 hover:text-blue-700"
                        title="Editar Sprint"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteSprint(sprint.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 mb-4">
                    {(sprint.tasks || []).map(task => (
                      <div key={task.id} className="flex items-start gap-2 group">
                        <button 
                          onClick={() => toggleTask(sprint, task.id, task.is_completed)}
                          className="mt-0.5 text-gray-400 hover:text-blue-500"
                        >
                          {task.is_completed ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>
                        <span className={`text-sm ${task.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                          {task.description}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t mt-auto">
                    <select
                      className="w-full text-sm border-gray-300 rounded-md"
                      value={sprint.status}
                      onChange={(e) => updateSprintStatus(sprint.id, { status: e.target.value as SprintStatus })}
                    >
                      <option value={SprintStatus.PLANNED}>Planejado</option>
                      <option value={SprintStatus.IN_PROGRESS}>Em Andamento</option>
                      <option value={SprintStatus.COMPLETED}>Concluído</option>
                    </select>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingSprint(null); }}
        title="Editar Sprint"
      >
        <form onSubmit={handleUpdateSprint} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Título</label>
            <Input
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="Sprint 1"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Data Início</label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={e => setFormData({...formData, start_date: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Data Fim</label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={e => setFormData({...formData, end_date: e.target.value})}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Observação</label>
            <textarea
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={3}
              value={formData.observation || ''}
              onChange={e => setFormData({...formData, observation: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Adicionar Novas Tarefas</label>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1">
                <input
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  value={newTaskDescription}
                  onChange={e => setNewTaskDescription(e.target.value)}
                  placeholder="Nova tarefa..."
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddTask())}
                />
              </div>
              <button 
                type="button"
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all"
                onClick={handleAddTask}
                title="Adicionar Tarefa"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {formData.tasks?.map((task, index) => (
                <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <span className="text-sm">{task.description}</span>
                  <button type="button" onClick={() => handleRemoveTask(index)} className="text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => { setIsEditModalOpen(false); setEditingSprint(null); }}>
              Cancelar
            </Button>
            <Button type="submit">
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Criar Novo Sprint"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Título</label>
            <Input
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="Sprint 1"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Data Início</label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={e => setFormData({...formData, start_date: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Data Fim</label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={e => setFormData({...formData, end_date: e.target.value})}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Observação</label>
            <textarea
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={3}
              value={formData.observation}
              onChange={e => setFormData({...formData, observation: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tarefas</label>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1">
                <input
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  value={newTaskDescription}
                  onChange={e => setNewTaskDescription(e.target.value)}
                  placeholder="Adicionar tarefa..."
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddTask())}
                />
              </div>
              <button 
                type="button"
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all"
                onClick={handleAddTask}
                title="Adicionar Tarefa"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {formData.tasks?.map((task, index) => (
                <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <span className="text-sm">{task.description}</span>
                  <button type="button" onClick={() => handleRemoveTask(index)} className="text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Criar Sprint
            </Button>
          </div>
        </form>
      </Modal>

      {/* Hidden Print Component */}
      <div style={{ display: 'none' }}>
        <SprintPrintView ref={printRef} sprints={sprintsToPrint} />
      </div>
    </div>
  );
};
