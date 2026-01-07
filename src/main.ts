import { app, BrowserWindow, ipcMain, Tray, nativeImage, Menu } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { autoUpdater } from 'electron-updater';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Windows에서 캐시 디렉토리 권한 문제 해결
if (process.platform === 'win32') {
  // 사용자 데이터 디렉토리를 명시적으로 설정하여 권한 문제 방지
  const userDataPath = path.join(app.getPath('appData'), app.getName());
  app.setPath('userData', userDataPath);
  
  // 캐시 디렉토리를 사용자 디렉토리 내로 설정
  app.setPath('cache', path.join(userDataPath, 'Cache'));
  app.setPath('sessionData', path.join(userDataPath, 'Session Data'));
  
  // GPU 및 캐시 관련 에러 완화를 위한 명령줄 스위치 추가
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  app.commandLine.appendSwitch('disable-software-rasterizer');
  app.commandLine.appendSwitch('disable-dev-shm-usage');
}

// Enable remote debugging for MCP (포트 충돌 방지를 위해 조건부 설정)
// 포트가 이미 사용 중일 경우를 대비해 에러를 무시하도록 설정
try {
  app.commandLine.appendSwitch('remote-debugging-port', '9222');
} catch (error) {
  console.warn('Remote debugging port 설정 실패:', error);
}

// DevTools 서버 시작 실패 에러 완화
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');

// Custom protocol for deep linking
const PROTOCOL = 'electrontest';
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// Single instance lock - 앱이 이미 실행 중이면 새 인스턴스를 막고 기존 앱으로 링크 전달
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    // 두 번째 인스턴스가 실행되려 할 때 (링크 클릭 등)
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      // Windows에서 프로토콜 URL 파싱
      const url = commandLine.find((arg) => arg.startsWith(`${PROTOCOL}://`));
      if (url) {
        handleAuthCallback(url);
      }
    }
  });
}

// macOS에서 URL 열기
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (url.startsWith(`${PROTOCOL}://`)) {
    handleAuthCallback(url);
  }
});

// 인증 콜백 처리
function handleAuthCallback(url: string) {
  console.log('🔗 Deep link received:', url);
  
  // URL에서 해시 부분 추출 (Supabase는 #access_token=... 형식으로 전달)
  const hashIndex = url.indexOf('#');
  if (hashIndex !== -1 && mainWindow) {
    const hash = url.substring(hashIndex);
    // React Router의 해시 라우팅과 결합
    const navigationUrl = `/#/auth/callback${hash}`;
    
    console.log('📍 Navigating to:', navigationUrl);
    
    // 메인 윈도우에 URL 전달
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL + navigationUrl);
    } else {
      // 프로덕션 빌드에서는 해시만 변경
      mainWindow.webContents.executeJavaScript(`
        window.location.hash = '${hash}';
      `);
    }
  }
}

const createTray = () => {
  // 트레이 아이콘 이미지 로드
  // 개발 환경과 프로덕션 환경에서 경로가 다름
  let iconPath: string;
  if (app.isPackaged) {
    // 프로덕션 빌드: extraResource로 복사된 assets는 resources 폴더에 있음
    iconPath = path.join(process.resourcesPath, 'assets', 'supabase-logo.png');
  } else {
    // 개발 환경: __dirname 기준 상대 경로
    iconPath = path.join(__dirname, '../../assets/supabase-logo.png');
  }
  
  const icon = nativeImage.createFromPath(iconPath);
  
  // 아이콘 파일이 없으면 에러 처리
  if (icon.isEmpty()) {
    console.error('트레이 아이콘을 로드할 수 없습니다:', iconPath);
    // 빈 아이콘 대신 기본 아이콘 생성
    const emptyIcon = nativeImage.createEmpty();
    tray = new Tray(emptyIcon);
    return;
  }
  
  // Windows에서는 작은 아이콘 크기로 리사이즈
  if (process.platform === 'win32') {
    icon.resize({ width: 16, height: 16 });
  }
  
  tray = new Tray(icon);
  
  // 트레이 아이콘 툴팁
  tray.setToolTip('NATE-communication');
  
  // 트레이 아이콘 컨텍스트 메뉴
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '보이기',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    {
      label: '종료',
      click: () => {
        isQuitting = true;
        if (mainWindow) {
          mainWindow.destroy();
        }
        if (tray) {
          tray.destroy();
        }
        app.quit();
      },
    },
  ]);
  
  tray.setContextMenu(contextMenu);
  
  // 트레이 아이콘 클릭 이벤트 (더블클릭 또는 싱글클릭)
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createWindow();
    }
  });
};

const createWindow = () => {
  // 이미 창이 있으면 보이기만 함
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  // Create the browser window.
  // 아이콘 경로 설정 (개발/프로덕션 환경 구분)
  let iconPath: string;
  if (app.isPackaged) {
    // 프로덕션 빌드: extraResource로 복사된 assets는 resources 폴더에 있음
    iconPath = path.join(process.resourcesPath, 'assets', 'supabase-logo.png');
  } else {
    iconPath = path.join(__dirname, '../../assets/supabase-logo.png');
  }
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false, // 커스텀 타이틀바 사용
    titleBarStyle: 'hidden',
    icon: iconPath, // 앱 아이콘 설정
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    // Open the DevTools only in development mode.
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // 윈도우가 닫히려 할 때 숨기기 (트레이에 남기기)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // 윈도우가 실제로 닫힐 때 참조 제거
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 윈도우 최대화 상태 변경 이벤트
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximize-changed', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximize-changed', false);
  });
};

// IPC 핸들러 등록
ipcMain.handle('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() ?? false;
});

// 자동 업데이트 설정
function setupAutoUpdater() {
  // 개발 환경에서는 자동 업데이트 비활성화
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    console.log('개발 환경: 자동 업데이트 비활성화');
    return;
  }

  // GitHub Releases를 사용하도록 설정
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'suksa',
    repo: 'nate-slack',
  });

  // 업데이트 확인 주기 (1시간마다)
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 60 * 60 * 1000);

  // 앱 시작 시 업데이트 확인
  autoUpdater.checkForUpdatesAndNotify();

  // 업데이트 이벤트 핸들러
  autoUpdater.on('checking-for-update', () => {
    console.log('업데이트 확인 중...');
    if (mainWindow) {
      mainWindow.webContents.send('update-status', { status: 'checking' });
    }
  });

  autoUpdater.on('update-available', (info: { version: string }) => {
    console.log('업데이트 사용 가능:', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update-status', {
        status: 'available',
        version: info.version,
      });
    }
  });

  autoUpdater.on('update-not-available', (info: { version: string }) => {
    console.log('최신 버전입니다:', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update-status', {
        status: 'not-available',
        version: info.version,
      });
    }
  });

  autoUpdater.on('error', (err: Error) => {
    console.error('업데이트 오류:', err);
    if (mainWindow) {
      mainWindow.webContents.send('update-status', {
        status: 'error',
        error: err.message,
      });
    }
  });

  autoUpdater.on('download-progress', (progressObj: { percent: number; transferred: number; total: number }) => {
    const message = `다운로드 진행률: ${Math.round(progressObj.percent)}%`;
    console.log(message);
    if (mainWindow) {
      mainWindow.webContents.send('update-progress', {
        percent: Math.round(progressObj.percent),
        transferred: progressObj.transferred,
        total: progressObj.total,
      });
    }
  });

  autoUpdater.on('update-downloaded', (info: { version: string }) => {
    console.log('업데이트 다운로드 완료:', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update-status', {
        status: 'downloaded',
        version: info.version,
      });
    }
    // 사용자에게 재시작 옵션 제공
    // autoUpdater.quitAndInstall()을 호출하여 재시작
  });
}

// IPC 핸들러: 업데이트 재시작
ipcMain.handle('restart-and-install-update', () => {
  autoUpdater.quitAndInstall();
});

// IPC 핸들러: 수동 업데이트 확인
ipcMain.handle('check-for-updates', () => {
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  // 앱 이름 설정 (알림에 표시되는 이름)
  app.setName('네이트 커뮤니케이션');
  
  // 커스텀 프로토콜 등록 (Windows & Linux)
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }

  // 자동 업데이트 설정
  setupAutoUpdater();

  // 트레이 아이콘 생성
  createTray();
  
  createWindow();

  // 앱 시작 시 URL이 있으면 처리 (macOS)
  if (process.platform === 'darwin') {
    app.on('open-url', (event, url) => {
      event.preventDefault();
      if (url.startsWith(`${PROTOCOL}://`)) {
        handleAuthCallback(url);
      }
    });
  }
  
  // Windows에서 앱 시작 시 URL 파싱
  if (process.platform === 'win32') {
    const url = process.argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (url) {
      setTimeout(() => handleAuthCallback(url), 1000); // 윈도우가 로드될 때까지 대기
    }
  }
});

// 모든 창이 닫혀도 앱을 종료하지 않음 (트레이에 남아있음)
// 사용자가 트레이 메뉴에서 '종료'를 선택하거나 Cmd+Q (macOS)로 종료
app.on('window-all-closed', () => {
  // 트레이에 남아있도록 아무것도 하지 않음
  // macOS도 동일하게 처리
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
