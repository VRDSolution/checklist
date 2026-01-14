import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart2, PieChart, Users, Clock, Activity } from 'lucide-react';
import { analyticsService, DashboardData } from '../../services/analytics.service';
import { toast } from 'react-hot-toast';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const dashboardData = await analyticsService.getDashboardData();
      setData(dashboardData);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/')}
                className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
                title="Voltar"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart2 className="w-8 h-8 text-primary-600" />
                Painel de Gestão
              </h1>
            </div>
            <div className="text-sm text-gray-500">
              Dados do Mês Atual
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Active Now */}
          <div className="bg-white rounded-xl shadow p-6 flex items-center justify-between border-l-4 border-green-500">
            <div>
              <p className="text-sm font-medium text-gray-500">Ativos Agora</p>
              <p className="text-3xl font-bold text-gray-900">{data?.kpis.active_now}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>

          {/* Today's Checkins */}
          <div className="bg-white rounded-xl shadow p-6 flex items-center justify-between border-l-4 border-blue-500">
            <div>
              <p className="text-sm font-medium text-gray-500">Check-ins Hoje</p>
              <p className="text-3xl font-bold text-gray-900">{data?.kpis.checkins_today}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          
          {/* Projects Count (Derived from chart data for simplicity or would need API) */}
          <div className="bg-white rounded-xl shadow p-6 flex items-center justify-between border-l-4 border-purple-500">
             <div>
              <p className="text-sm font-medium text-gray-500">Projetos Ativos (Mês)</p>
              <p className="text-3xl font-bold text-gray-900">{data?.hours_per_project.length}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <PieChart className="w-6 h-6 text-purple-600" />
            </div>
          </div>

           <div className="bg-white rounded-xl shadow p-6 flex items-center justify-between border-l-4 border-orange-500">
             <div>
              <p className="text-sm font-medium text-gray-500">Top Técnico (Checkins)</p>
              <p className="text-lg font-bold text-gray-900 truncate max-w-[150px]" title={data?.top_technicians[0]?.name}>
                {data?.top_technicians[0]?.name || '-'}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Hours per Project */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Horas por Projeto (Mês)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.hours_per_project} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                  <RechartsTooltip />
                  <Bar dataKey="hours" fill="#0EA5E9" name="Horas" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Project Status */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Status dos Projetos</h3>
            <div className="h-80 flex justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={data?.project_status}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="count"
                    label
                  >
                    {data?.project_status.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top Technicians Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800">Top 5 Técnicos (Produtividade)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Técnico</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-ins Completos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Horas</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.top_technicians.map((person, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{person.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{person.checkins}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{person.hours}h</td>
                  </tr>
                ))}
                {data?.top_technicians.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500">Nenhum dado encontrado</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
};
