import React from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  children: React.ReactNode
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between rounded-t-2xl">
            <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
              type="button"
            >
              <X size={24} />
            </button>
          </div>
        )}
        <div className="px-8 py-6">
          {children}
        </div>
      </div>
    </div>
  )
}
