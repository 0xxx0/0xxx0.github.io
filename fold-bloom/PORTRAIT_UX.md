# FOLD//BLOOM portrait interaction notes — RC11.3

Portrait is treated as a different interaction regime, not a scaled desktop layout.

## Design decisions

1. **Thumb dock, not top-corner commands**
   - MENU / LENS / SOUND live in the lower reachable region.
   - Ring geometry moves slightly upward to preserve a lower control zone.
   - Rationale: one-handed reachability studies show large-phone interfaces benefit when controls adapt toward the thumb's functional area rather than only shrinking the whole display.

2. **Toolglass remains spatial and temporary**
   - Hold the central LENS puck.
   - X axis changes topology.
   - Y axis changes scale.
   - A dead zone prevents accidental mode jumps.
   - Haptic ticks mark discrete topology/scope changes.
   - The overlay shows current PATH and current/micro/macro scale without drawing labels outside the portrait viewport.

3. **Lens Lab remains the explicit recovery path**
   - Toolglass is the fast in-context instrument.
   - Lens Lab is the inspectable, recoverable version with tabs, forecast book, RETURN receipts, and explicit commit.
   - This follows the useful part of Toolglass/Magic Lens interaction while avoiding an opaque gesture-only mode.

4. **Bottom sheets for advanced surfaces**
   - Pause, cultivation, lineage, styles, analytics, projection and Lens Lab rise from the bottom on portrait.
   - Lens Lab keeps BACK / COMMIT sticky at the bottom.
   - Horizontal tab rails prevent tall stacks of tiny controls.

5. **Reduce field occlusion**
   - The large desktop order book becomes a compact edge pressure meter in portrait.
   - Toolglass topology labels are no longer placed around a radius that clips outside narrow screens.
   - Telemetry remains visible but compact.

## Research anchors

- Bier et al., *Toolglass and Magic Lenses: The See-Through Interface*, SIGGRAPH 1993 / ACM DOI 10.1145/166117.166126.
- Bergstrom-Lehtovirta & Oulasvirta, *Modeling the Functional Area of the Thumb on Mobile Touchscreen Surfaces*, CHI 2014, DOI 10.1145/2556288.2557354.
- Buschek et al., *Dynamic UI Adaptations for One-Handed Use of Large Mobile Touchscreen Devices*, INTERACT 2017.
- Snyder et al., *Interaction Techniques for Exploratory Data Visualization on Mobile Devices*, 2024: emphasize discoverability, rapid in-context exploration, single-touch/fixed orientation, and graceful recovery.

## Next validation vector

Measure rather than decorate:

- time from launch to first successful bloom
- grip-shift count for MENU / LENS / SOUND
- wrong topology selections per ten Toolglass uses
- wrong scale selections per ten Toolglass uses
- Toolglass → Lens Lab recovery rate
- accidental lens activation rate
- bloom/drift rate before vs after portrait adaptation
- mute-mode comprehension of NEXT / PRESS / causal path
- portrait vs landscape task parity

Keep landscape as an ablation. A portrait-specific projection earns permanence only if it improves actionability or comprehension without reducing play quality.
