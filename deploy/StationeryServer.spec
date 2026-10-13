# PyInstaller spec — builds a self-contained Windows server (no Python needed on
# the target machine). Run from the `backend/` folder on a DEV machine:
#     pyinstaller ..\deploy\StationeryServer.spec --noconfirm
#
# Produces  backend\dist\StationeryServer\  (a folder you copy to the laptop).
# The frontend must be built first (frontend\dist must exist).

import os
from PyInstaller.utils.hooks import collect_submodules, collect_all

block_cipher = None

# The frontend production build, bundled next to the exe as "frontend_dist".
datas = [(os.path.join('..', 'frontend', 'dist'), 'frontend_dist')]
binaries = []
# App + seed packages use function-local (dynamic) imports PyInstaller can't see
# statically, so collect every submodule explicitly.
hiddenimports = collect_submodules('app') + collect_submodules('seeds') + ['waitress']

# APScheduler pulls triggers/jobstores dynamically — collect it fully.
for pkg in ('apscheduler', 'flask_apscheduler'):
    d, b, h = collect_all(pkg)
    datas += d
    binaries += b
    hiddenimports += h

a = Analysis(
    ['serve.py'],
    pathex=['.'],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    runtime_hooks=[],
    excludes=['tkinter', 'matplotlib', 'pytest'],
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz, a.scripts, [],
    exclude_binaries=True,
    name='StationeryServer',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,   # keep a console target; the Windows service runs it headless
)
coll = COLLECT(
    exe, a.binaries, a.zipfiles, a.datas,
    strip=False, upx=False, name='StationeryServer',
)
