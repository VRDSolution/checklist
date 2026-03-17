export interface Client {
  id: number
  name: string
  nome?: string // Fallback for backend alias issues
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
  description?: string
  contact_email?: string
  contact_phone?: string
  is_active?: boolean
  created_at: string
  updated_at: string | null
}

export interface ClientCreateRequest {
  nome: string
  cnpj: string
  telefone?: string
  email?: string
  endereco?: string
  cidade: string
  estado: string
  cep?: string
  observacoes?: string
}