#!/usr/bin/env bash
# Installs Unity Hub from Unity's official apt repository, plus a browser and keyring for the Hub
# sign-in, inside the licence-helper codespace (.devcontainer/unity-licence). Idempotent.
set -euo pipefail

if ! command -v unityhub >/dev/null 2>&1; then
  sudo apt-get update -q
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -q wget gnupg ca-certificates
  sudo install -d -m 0755 /usr/share/keyrings
  wget -qO - https://hub.unity3d.com/linux/keys/public | gpg --dearmor | sudo tee /usr/share/keyrings/Unity_Technologies_ApS.gpg >/dev/null
  echo "deb [signed-by=/usr/share/keyrings/Unity_Technologies_ApS.gpg] https://hub.unity3d.com/linux/repos/deb stable main" \
    | sudo tee /etc/apt/sources.list.d/unityhub.list >/dev/null
  sudo apt-get update -q
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -q unityhub firefox-esr gnome-keyring dbus-x11 xdg-utils
fi

# Hub opens the Unity sign-in page in the default browser and comes back through unityhub:// links.
xdg-mime default firefox-esr.desktop x-scheme-handler/http x-scheme-handler/https text/html || true
xdg-mime default unityhub.desktop x-scheme-handler/unityhub || true

# Desktop shortcut that starts Hub the way it works inside a container.
mkdir -p "$HOME/Desktop"
cat > "$HOME/Desktop/unity-hub.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Unity Hub (licence helper)
Exec=bash $(pwd)/Tools/Licence/start-unity-hub.sh
Terminal=false
DESKTOP
chmod +x "$HOME/Desktop/unity-hub.desktop"
echo "Unity Hub installed: $(dpkg-query -W -f='${Version}' unityhub 2>/dev/null || echo unknown)"
