import React from 'react';
import { Outlet } from 'react-router-dom';
import WorkspaceSidebar from './WorkspaceSidebar';
import Sidebar from './Sidebar';
import CustomTitleBar from './CustomTitleBar';

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-white overflow-hidden flex-col">
      {/* 커스텀 타이틀바 */}
      <CustomTitleBar />
      
      <div className="flex flex-1 overflow-hidden">
        <WorkspaceSidebar />
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
          <div className="flex-1 overflow-hidden relative">
             <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

