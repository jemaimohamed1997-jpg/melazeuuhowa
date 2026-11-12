; Inno Setup 6 Script pour Huilerie Jemai (معصرة جماعي)
; Création d'un installateur professionnel sous Windows 11

#define MyAppName "Huilerie Jemai - Gestion de Stock"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Huilerie Jemai (معصرة جماعي)"
#define MyAppExeName "HuilerieJemai.exe"

[Setup]
AppId={{D37E8492-4B2C-4A89-BF7D-9A23E982F101}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\HuilerieJemai
DisableProgramGroupPage=yes
OutputDir=output_installer
OutputBaseFilename=Setup_Huilerie_Jemai_v1.0
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "dist\HuilerieJemai.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "README_WINDOWS11.md"; DestDir: "{app}"; Flags: isreadme

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
