import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../AppIcon';

const SidebarNavigation = ({ isCollapsed = false, onToggleCollapse }) => {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navigationItems = [
    {
      icon: 'LayoutDashboard',
      label: 'Dashboard',
      path: '/main-dashboard',
      tooltip: 'Financial overview and analytics'
    },
    {
      icon: 'Receipt',
      label: 'Transactions',
      path: '/transaction-details',
      tooltip: 'View and manage transactions'
    },
    {
      icon: 'Upload',
      label: 'Upload Data',
      path: '/file-upload',
      tooltip: 'Import CSV files and data'
    },
    {
      icon: 'MessageSquare',
      label: 'AI Assistant',
      path: '/ai-chat-interface',
      tooltip: 'Chat with financial AI assistant'
    }
  ];

  const isActivePath = (path) => {
    return location?.pathname === path;
  };

  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-100">
        <div className="flex items-center justify-around h-16 px-2">
          {navigationItems?.map((item) => (
            <Link
              key={item?.path}
              to={item?.path}
              className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg transition-smooth ${
                isActivePath(item?.path)
                  ? 'text-primary bg-primary/10' :'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon name={item?.icon} size={20} />
              <span className="text-xs mt-1 font-medium">{item?.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    );
  }

  return (
    <aside className={`fixed left-0 top-0 h-full bg-card border-r border-border z-100 transition-smooth ${
      isCollapsed ? 'w-16' : 'w-60'
    }`}>
      <div className="flex flex-col h-full">
        {/* Logo Section */}
        <div className="flex items-center h-16 px-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="TrendingUp" size={20} color="white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-foreground">FinTwin</span>
                <span className="text-xs text-muted-foreground">Financial Analytics</span>
              </div>
            )}
          </div>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="ml-auto p-1.5 rounded-md hover:bg-muted transition-smooth"
            >
              <Icon name={isCollapsed ? "ChevronRight" : "ChevronLeft"} size={16} />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-2">
            {navigationItems?.map((item) => (
              <li key={item?.path}>
                <Link
                  to={item?.path}
                  className={`flex items-center px-3 py-2.5 rounded-lg transition-smooth group ${
                    isActivePath(item?.path)
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted lift-hover'
                  }`}
                  title={isCollapsed ? item?.tooltip : undefined}
                >
                  <Icon 
                    name={item?.icon} 
                    size={20} 
                    className={`${isCollapsed ? 'mx-auto' : 'mr-3'}`}
                  />
                  {!isCollapsed && (
                    <span className="font-medium text-sm">{item?.label}</span>
                  )}
                  {!isCollapsed && isActivePath(item?.path) && (
                    <div className="ml-auto w-2 h-2 bg-primary-foreground rounded-full opacity-75" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Section */}
        <div className="px-4 py-4 border-t border-border">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <Icon name="User" size={16} />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">John Doe</p>
                <p className="text-xs text-muted-foreground truncate">john@example.com</p>
              </div>
            )}
          </div>
        </div>

        {/* Security Badge */}
        {!isCollapsed && (
          <div className="px-4 pb-4">
            <div className="flex items-center justify-center py-2 px-3 bg-success/10 rounded-lg">
              <Icon name="Shield" size={14} className="text-success mr-2" />
              <span className="text-xs font-medium text-success">Bank-Level Security</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default SidebarNavigation;