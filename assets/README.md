# assets/

Sourced binaries go here. Their paths mirror the pack they belong to, and `pmtool build` overlays
`assets/<pack>/` onto `packs/<pack>/`. Use the import commands rather than copying by hand. They rename
geometry identifiers, convert channels and formats, and normalise audio.

```
assets/
├── pm_fauna/
│   ├── models/entity/pm_<species>_<slot>.geo.json        pmtool import-model
│   ├── textures/entity/pm/<species>/<slot>.png|.tga       pmtool import-texture
│   │                                 <slot>_mers.tga
│   │                                 <slot>_normal.png
│   └── CREDITS.txt                                        ships inside the pack
└── pm_audio/
    ├── sounds/pm/<group>/<slot>_NN.ogg                    pmtool convert-audio
    └── CREDITS.txt
```

Run `python3 tools/pmtool.py status` to see every slot and whether it is filled. Binary files, and imported
geometry JSON, are git-ignored by default because third-party licences rarely allow republishing them in a
public repository.
