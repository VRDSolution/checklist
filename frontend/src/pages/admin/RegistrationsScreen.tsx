import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Building2, Plus, Trash2, UserPlus, Users, KeyRound, Pencil } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'

import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { clientService, userService } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

type TabKey = 'companies' | 'users'

interface ClientFormData {
  nome: string
  cnpj: string
  telefone: string
  email: string
  endereco: string
  cidade: string
  estado: string
  cep: string
}

interface ClientListItem {
  id: number
  name?: string
  nome?: string
  cnpj: string
  phone?: string
  telefone?: string
  email?: string
  address?: string
  endereco?: string
  city?: string
  cidade?: string
  state?: string
  estado?: string
  zip_code?: string
  cep?: string
  projects_count?: number
  has_projects?: boolean
}

interface UserListItem {
  id: number
  name: string
  email: string
  role: 'admin' | 'supervisor' | 'tecnico'
}

interface UserCreateData {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: 'admin' | 'supervisor' | 'tecnico'
}

interface PasswordUpdateData {
  new_password: string
  confirmPassword: string
}

const defaultClientForm: ClientFormData = {
  nome: '',
  cnpj: '',
  telefone: '',
  email: '',
  endereco: '',
  cidade: '',
  estado: '',
  cep: ''
}

const defaultUserCreateForm: UserCreateData = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'tecnico'
}

const defaultPasswordForm: PasswordUpdateData = {
  new_password: '',
  confirmPassword: ''
}

const getClientName = (client: ClientListItem) => client.name || client.nome || 'Sem nome'
const getClientPhone = (client: ClientListItem) => client.phone || client.telefone || '-'
const getClientCity = (client: ClientListItem) => client.city || client.cidade || '-'
const getClientState = (client: ClientListItem) => client.state || client.estado || '-'

const toClientFormData = (client: ClientListItem): ClientFormData => ({
  nome: getClientName(client),
  cnpj: client.cnpj || '',
  telefone: getClientPhone(client) === '-' ? '' : getClientPhone(client),
  email: client.email || '',
  endereco: client.address || client.endereco || '',
  cidade: getClientCity(client) === '-' ? '' : getClientCity(client),
  estado: getClientState(client) === '-' ? '' : getClientState(client),
  cep: client.zip_code || client.cep || ''
})

export const RegistrationsScreen = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState<TabKey>('companies')
  const [isLoading, setIsLoading] = useState(false)

  const [clients, setClients] = useState<ClientListItem[]>([])
  const [users, setUsers] = useState<UserListItem[]>([])

  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<ClientListItem | null>(null)
  const [clientForm, setClientForm] = useState<ClientFormData>(defaultClientForm)

  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [userForm, setUserForm] = useState<UserCreateData>(defaultUserCreateForm)

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null)
  const [passwordForm, setPasswordForm] = useState<PasswordUpdateData>(defaultPasswordForm)

  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Acesso não autorizado')
      navigate('/')
    }
  }, [navigate, user])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [clientsResponse, usersResponse] = await Promise.all([
        clientService.getAll(),
        userService.getAll()
      ])
      setClients(clientsResponse as ClientListItem[])
      setUsers(usersResponse as UserListItem[])
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erro ao carregar cadastros'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const usersLabel = useMemo(() => `${users.length} usuário(s)`, [users.length])
  const clientsLabel = useMemo(() => `${clients.length} empresa(s)`, [clients.length])

  const openNewClientModal = () => {
    setEditingClient(null)
    setClientForm(defaultClientForm)
    setIsClientModalOpen(true)
  }

  const openEditClientModal = (client: ClientListItem) => {
    setEditingClient(client)
    setClientForm(toClientFormData(client))
    setIsClientModalOpen(true)
  }

  const handleClientSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!clientForm.nome || !clientForm.cnpj || !clientForm.cidade || !clientForm.estado) {
      toast.error('Preencha nome, CNPJ, cidade e estado')
      return
    }

    setIsLoading(true)
    try {
      if (editingClient) {
        await clientService.update(editingClient.id, clientForm)
        toast.success('Empresa atualizada com sucesso!')
      } else {
        await clientService.create(clientForm)
        toast.success('Empresa cadastrada com sucesso!')
      }
      setIsClientModalOpen(false)
      setClientForm(defaultClientForm)
      setEditingClient(null)
      await loadData()
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erro ao salvar empresa'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteClient = async (client: ClientListItem) => {
    const projectCount = client.projects_count || 0
    const hasProjects = Boolean(client.has_projects) || projectCount > 0

    if (hasProjects) {
      toast.error('Esta empresa possui projetos vinculados e não pode ser excluída.')
      return
    }

    if (!window.confirm(`Deseja excluir a empresa ${getClientName(client)}?`)) {
      return
    }

    setIsLoading(true)
    try {
      await clientService.delete(client.id)
      toast.success('Empresa excluída com sucesso!')
      await loadData()
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erro ao excluir empresa'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const openCreateUserModal = () => {
    setUserForm(defaultUserCreateForm)
    setIsUserModalOpen(true)
  }

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault()

    if (userForm.password !== userForm.confirmPassword) {
      toast.error('As senhas não conferem')
      return
    }

    setIsLoading(true)
    try {
      await userService.create({
        name: userForm.name,
        email: userForm.email,
        password: userForm.password,
        role: userForm.role
      })
      toast.success('Usuário cadastrado com sucesso!')
      setIsUserModalOpen(false)
      setUserForm(defaultUserCreateForm)
      await loadData()
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erro ao cadastrar usuário'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUser = async (targetUser: UserListItem) => {
    if (!window.confirm(`Deseja excluir o usuário ${targetUser.name}?`)) {
      return
    }

    setIsLoading(true)
    try {
      await userService.delete(targetUser.id)
      toast.success('Usuário excluído com sucesso!')
      await loadData()
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erro ao excluir usuário'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const openPasswordModal = (targetUser: UserListItem) => {
    setSelectedUser(targetUser)
    setPasswordForm(defaultPasswordForm)
    setIsPasswordModalOpen(true)
  }

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!selectedUser) {
      return
    }

    if (passwordForm.new_password !== passwordForm.confirmPassword) {
      toast.error('As senhas não conferem')
      return
    }

    setIsLoading(true)
    try {
      await userService.updatePassword(selectedUser.id, {
        new_password: passwordForm.new_password
      })
      toast.success('Senha atualizada com sucesso!')
      setIsPasswordModalOpen(false)
      setSelectedUser(null)
      setPasswordForm(defaultPasswordForm)
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erro ao atualizar senha'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-200 rounded-full">
          <ArrowLeft />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Cadastros</h1>
          <p className="text-sm text-slate-500">Gerencie empresas e usuários</p>
        </div>
      </header>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('companies')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'companies' ? 'bg-blue-900 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
        >
          Empresas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'users' ? 'bg-blue-900 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
        >
          Usuários
        </button>
      </div>

      {activeTab === 'companies' && (
        <Card className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Empresas</h2>
              <p className="text-sm text-slate-500">{clientsLabel}</p>
            </div>
            <Button className="w-auto px-5 py-2 text-sm" onClick={openNewClientModal} icon={Plus}>
              Nova Empresa
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2">Empresa</th>
                  <th className="py-2">CNPJ</th>
                  <th className="py-2">Cidade/UF</th>
                  <th className="py-2">Projetos</th>
                  <th className="py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const projectCount = client.projects_count || 0
                  const hasProjects = Boolean(client.has_projects) || projectCount > 0
                  return (
                    <tr key={client.id} className="border-b border-slate-100">
                      <td className="py-3">
                        <div className="font-medium text-slate-800 flex items-center gap-2">
                          <span>{getClientName(client)}</span>
                          {hasProjects && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              Com projetos vinculados
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500">{client.email || '-'}</div>
                      </td>
                      <td className="py-3 text-slate-600">{client.cnpj}</td>
                      <td className="py-3 text-slate-600">{getClientCity(client)}/{getClientState(client)}</td>
                      <td className="py-3 text-slate-600">{projectCount}</td>
                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditClientModal(client)}
                            className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
                          >
                            <span className="inline-flex items-center gap-1"><Pencil size={14} /> Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClient(client)}
                            disabled={isLoading}
                            className={`px-3 py-1.5 rounded-lg ${hasProjects ? 'bg-slate-200 text-slate-500' : 'bg-red-100 text-red-700 hover:bg-red-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={hasProjects ? 'Empresa com projetos vinculados não pode ser excluída' : 'Excluir empresa'}
                          >
                            <span className="inline-flex items-center gap-1"><Trash2 size={14} /> Excluir</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {!clients.length && !isLoading && (
              <p className="text-slate-500 py-6 text-center">Nenhuma empresa cadastrada.</p>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'users' && (
        <Card className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Usuários</h2>
              <p className="text-sm text-slate-500">{usersLabel}</p>
            </div>
            <Button className="w-auto px-5 py-2 text-sm" onClick={openCreateUserModal} icon={UserPlus}>
              Novo Usuário
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2">Nome</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Perfil</th>
                  <th className="py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((appUser) => (
                  <tr key={appUser.id} className="border-b border-slate-100">
                    <td className="py-3 text-slate-800 font-medium">{appUser.name}</td>
                    <td className="py-3 text-slate-600">{appUser.email}</td>
                    <td className="py-3 text-slate-600">{appUser.role}</td>
                    <td className="py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openPasswordModal(appUser)}
                          className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200"
                        >
                          <span className="inline-flex items-center gap-1"><KeyRound size={14} /> Editar Senha</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(appUser)}
                          disabled={isLoading}
                          className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="inline-flex items-center gap-1"><Trash2 size={14} /> Excluir</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!users.length && !isLoading && (
              <p className="text-slate-500 py-6 text-center">Nenhum usuário cadastrado.</p>
            )}
          </div>
        </Card>
      )}

      <Modal
        isOpen={isClientModalOpen}
        onClose={() => {
          setIsClientModalOpen(false)
          setEditingClient(null)
        }}
        title={editingClient ? 'Editar Empresa' : 'Nova Empresa'}
      >
        <form onSubmit={handleClientSubmit} className="space-y-4">
          <Input label="Nome" value={clientForm.nome} onChange={(event) => setClientForm((prev) => ({ ...prev, nome: event.target.value }))} required />
          <Input label="CNPJ" value={clientForm.cnpj} onChange={(event) => setClientForm((prev) => ({ ...prev, cnpj: event.target.value }))} required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Telefone" value={clientForm.telefone} onChange={(event) => setClientForm((prev) => ({ ...prev, telefone: event.target.value }))} />
            <Input label="Email" type="email" value={clientForm.email} onChange={(event) => setClientForm((prev) => ({ ...prev, email: event.target.value }))} />
          </div>
          <Input label="Endereço" value={clientForm.endereco} onChange={(event) => setClientForm((prev) => ({ ...prev, endereco: event.target.value }))} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input label="Cidade" value={clientForm.cidade} onChange={(event) => setClientForm((prev) => ({ ...prev, cidade: event.target.value }))} required />
            <Input label="UF" value={clientForm.estado} maxLength={2} onChange={(event) => setClientForm((prev) => ({ ...prev, estado: event.target.value }))} required />
            <Input label="CEP" value={clientForm.cep} onChange={(event) => setClientForm((prev) => ({ ...prev, cep: event.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="outline" className="w-auto px-6 py-2 text-sm" onClick={() => setIsClientModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="w-auto px-6 py-2 text-sm" disabled={isLoading} icon={Building2}>
              {editingClient ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Novo Usuário">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input label="Nome" value={userForm.name} onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))} required />
          <Input label="Email" type="email" value={userForm.email} onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))} required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Senha" type="password" value={userForm.password} onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))} required />
            <Input
              label="Confirmar Senha"
              type="password"
              value={userForm.confirmPassword}
              onChange={(event) => setUserForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Perfil de Acesso</label>
            <select
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-900 outline-none transition-all"
              value={userForm.role}
              onChange={(event) => setUserForm((prev) => ({ ...prev, role: event.target.value as UserCreateData['role'] }))}
            >
              <option value="tecnico">Técnico</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="outline" className="w-auto px-6 py-2 text-sm" onClick={() => setIsUserModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="w-auto px-6 py-2 text-sm" disabled={isLoading} icon={Users}>
              Cadastrar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title="Editar Senha">
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <p className="text-sm text-slate-600">
            Alterando senha de <span className="font-semibold text-slate-800">{selectedUser?.name}</span>
          </p>
          <Input
            label="Nova Senha"
            type="password"
            value={passwordForm.new_password}
            onChange={(event) => setPasswordForm((prev) => ({ ...prev, new_password: event.target.value }))}
            required
          />
          <Input
            label="Confirmar Senha"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
            required
          />
          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="outline" className="w-auto px-6 py-2 text-sm" onClick={() => setIsPasswordModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="w-auto px-6 py-2 text-sm" disabled={isLoading} icon={KeyRound}>
              Salvar Senha
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}