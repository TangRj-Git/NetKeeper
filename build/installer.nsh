!macro customInstall
  CreateShortCut "$DESKTOP\NetKeeper.lnk" "$INSTDIR\NetKeeper.exe" "" "$INSTDIR\resources\icon.ico" 0
  CreateDirectory "$SMPROGRAMS\NetKeeper"
  CreateShortCut "$SMPROGRAMS\NetKeeper\NetKeeper.lnk" "$INSTDIR\NetKeeper.exe" "" "$INSTDIR\resources\icon.ico" 0
!macroend
