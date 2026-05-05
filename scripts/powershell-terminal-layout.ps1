# Short-path prompt for PowerShell (current folder name only).
#
# Use in the current session:
#   . .\scripts\powershell-terminal-layout.ps1
# Or add that dot-source line to your PowerShell profile ($PROFILE).

function global:prompt {
  $leaf = Split-Path -Leaf -Path (Get-Location).Path
  "PS $leaf> "
}
