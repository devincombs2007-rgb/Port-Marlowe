#!/usr/bin/env bash
# Stores the Unity Personal licence file and the Unity sign-in as this repository's Actions
# secrets, without printing them, then starts the CI build. Run in the licence-helper codespace
# after Unity Hub has added the free personal licence. Values never appear on screen or in chat.
set -euo pipefail
REPO="${REPO:-devincombs2007-rgb/Port-Marlowe}"
BRANCH="${BRANCH:-claude/m1-foundation}"
LIC="$HOME/.local/share/unity3d/Unity/Unity_lic.ulf"

if [ ! -f "$LIC" ]; then
  echo "No licence file at $LIC yet."
  echo "In Unity Hub: Preferences > Licenses > Add > Get a free personal license, then run this again."
  exit 1
fi
if ! grep -q '<DeveloperData Value="' "$LIC"; then
  echo "The file at $LIC does not look like a Unity licence file."
  exit 1
fi

# The codespace's built-in token cannot write repository secrets, so sign in to GitHub once.
unset GITHUB_TOKEN GH_TOKEN
if ! gh auth status -h github.com >/dev/null 2>&1; then
  echo "Signing in to GitHub. A one-time code will appear: open https://github.com/login/device and enter it."
  gh auth login -h github.com --web --git-protocol https --scopes repo,workflow
fi

gh secret set UNITY_LICENSE --repo "$REPO" < "$LIC"
read -rp "Unity account email: " unity_email
read -rsp "Unity account password (typing is hidden): " unity_password; echo
printf '%s' "$unity_email" | gh secret set UNITY_EMAIL --repo "$REPO"
printf '%s' "$unity_password" | gh secret set UNITY_PASSWORD --repo "$REPO"
unset unity_password
echo "Saved UNITY_LICENSE, UNITY_EMAIL and UNITY_PASSWORD."

gh workflow run ci.yml --repo "$REPO" --ref "$BRANCH"
echo "Build started: https://github.com/$REPO/actions/workflows/ci.yml"
echo "You can now delete this codespace at https://github.com/codespaces (it holds a Unity sign-in)."
