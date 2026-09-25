# PROTECTED — do not remove. Enforced, not just documented.

Created 2026-09-25 by kestrel after finding a **live Home Assistant VM running off a disk
inside this staging pen.** This file exists because the triage skill's own pitfall says:
*"A verdict in a table is not an enforcement. A file explicitly classified 'do not touch'
can be deleted minutes later because nothing was enforcing the classification."*

## The protected paths

The machine-readable list is `_protected.jsonl` beside this file. **Any staging, boxing or
deletion pass must load it and hard-exclude every matching path before acting.** If a future
tool does not read it, that tool is broken — not this file.

| path | why |
|---|---|
| `crushed-20260923/Downloads__housebus__haos_generic-aarch64-18.3.vdi` | **A RUNNING VirtualBox VM's disk.** 4.76 GB, open handle held by VBoxHeadless. Deleting it kills Home Assistant and its entire configuration. |
| `crushed-20260923/Downloads__housebus__haos_generic-aarch64-18.3.vdi.zip` | the compressed origin of the same disk |

## Evidence as measured (2026-09-25 ~19:00)

```
VBoxManage list runningvms  ->  "Home Assistant" {381a2f0f-9968-49c2-a6c6-fdf3f6023e63}
lsof                        ->  VBoxHeadl pid=70838
                                .../delete/crushed-20260923/Downloads__housebus__haos_generic-aarch64-18.3.vdi
.vbox config declares       ->  /Users/mcvoid/Downloads/housebus/haos_generic-aarch64-18.3.vdi
ls ~/Downloads/housebus/    ->  EMPTY (the file was moved here and the config never updated)
file mtime                  ->  2026-09-25 18:59  (actively being written)
```

## The two hazards, separately

1. **Deletion hazard.** This pen reads as disposable. It is not — one of its members is a
   live system disk. Hence the protected list.
2. **Restart hazard — this bites even with no deletion.** The `.vbox` config points at
   `~/Downloads/housebus/`, which is now empty. **If the VM is powered off and started
   again as-is, VirtualBox will not find its disk and the VM will not boot.**

## The fix, when the VM is next powered off

Do this in one window, with the VM stopped — it is a move inside the same filesystem, so it
is instant and reversible:

```bash
# 1. confirm the VM is down (must print nothing)
VBoxManage list runningvms

# 2. move the disk to its proper home, beside the VM config
mv "~/void-anchor/delete/crushed-20260923/Downloads__housebus__haos_generic-aarch64-18.3.vdi" \
   "$HOME/VirtualBox VMs/Home Assistant/haos_generic-aarch64-18.3.vdi"

# 3. point the config at the real location (both lines, if the media registry repeats it)
#    replace the old path string with the new one in:
#    "$HOME/VirtualBox VMs/Home Assistant/Home Assistant.vbox"

# 4. start it and confirm it boots
VBoxManage startvm "Home Assistant"
```

Duration: under a minute. It cannot be done while the VM runs — VirtualBox holds the handle.

## What must not happen

- Do not delete, move or compress anything under this pen without loading `_protected.jsonl`.
- Do not "tidy" the pen by emptying it. It contains live infrastructure.
- Do not assume the `.vbox` path is the real path — **it is not, and that discrepancy is the
  whole reason this file exists.**
