import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const SubPageHeader = ({ title, actions }) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-10 bg-white shadow-md border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Botón de Volver */}
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft size={28} className="text-gray-700" />
        </button>
        
        {/* Título (se ajusta si hay acciones) */}
        <h1 className="text-xl font-bold text-gray-800 absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
          {title}
        </h1>
        
        {/* Acciones (se renderizan a la derecha) */}
        <div className="w-10 h-10 flex items-center justify-end">
          {actions}
        </div>
      </div>
    </header>
  );
};

export default SubPageHeader;
