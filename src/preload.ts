// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

// 윈도우 제어 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 윈도우 최소화
  minimize: () => ipcRenderer.invoke('window-minimize'),
  // 윈도우 최대화/복원
  maximize: () => ipcRenderer.invoke('window-maximize'),
  // 윈도우 닫기
  close: () => ipcRenderer.invoke('window-close'),
  // 윈도우 최대화 상태 확인
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  // 윈도우 최대화 상태 변경 이벤트
  onMaximize: (callback: (isMaximized: boolean) => void) => {
    ipcRenderer.on('window-maximize-changed', (_event, isMaximized: boolean) => {
      callback(isMaximized);
    });
  },
});
