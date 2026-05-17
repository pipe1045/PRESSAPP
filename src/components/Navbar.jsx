import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, DollarSign } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menu = [
    { icon: <Home size={20} />, path: '/home', label: 'Inicio' },
    { icon: <Users size={20} />, path: '/cobrador', label: 'Clientes' },
    { icon: <DollarSign size={20} />, path: '/caja', label: 'Caja' },
  ];

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 0, 
      left: 0, 
      right: 0, 
      backgroundColor: '#111', 
      display: 'flex', 
      justifyContent: 'space-around', 
      padding: '12px 0', 
      borderTop: '1px solid rgba(57,255,20,0.2)',
      zIndex: 1000 
    }}>
      {menu.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button 
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: isActive ? '#39FF14' : '#666', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '4px',
              cursor: 'pointer',
              transition: '0.3s',
              width: '33%'
            }}
          >
            {item.icon}
            <span style={{ 
              fontSize: '10px', 
              fontWeight: 'bold', 
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {item.label}
            </span>
            {isActive && (
              <div style={{ 
                width: '4px', 
                height: '4px', 
                backgroundColor: '#39FF14', 
                borderRadius: '50%',
                marginTop: '2px',
                boxShadow: '0 0 8px #39FF14'
              }}></div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Navbar;