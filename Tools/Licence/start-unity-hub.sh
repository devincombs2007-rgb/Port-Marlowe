#!/usr/bin/env bash
# Starts Unity Hub on the codespace desktop (display :1 from the desktop-lite feature).
# --no-sandbox: Chromium's sandbox is unavailable inside containers. A throwaway keyring lets Hub
# keep its sign-in for this session.
export DISPLAY="${DISPLAY:-:1}"
exec dbus-run-session -- bash -c 'printf "" | gnome-keyring-daemon --unlock --components=secrets >/dev/null 2>&1; exec unityhub --no-sandbox'
