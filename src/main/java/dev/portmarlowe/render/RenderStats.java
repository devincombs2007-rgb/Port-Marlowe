package dev.portmarlowe.render;

import dev.portmarlowe.fps.FrameRateGovernor;

/** Per-frame counters shown on the F3 screen. Only touched from the render thread. */
public final class RenderStats {
    public static int particlesTested;
    public static int particlesCulled;
    public static int blockEntitiesSkipped;
    public static int lastFrameParticlesTested;
    public static int lastFrameParticlesCulled;
    public static int lastFrameBlockEntitiesSkipped;
    /** Section buffer packs vanilla allocated for chunk meshing; -1 until the game has allocated them. */
    public static int chunkBuilderPacks = -1;
    public static FrameRateGovernor.Decision fpsDecision = new FrameRateGovernor.Decision(0, FrameRateGovernor.Reason.NONE);

    private RenderStats() {
    }

    public static void beginFrame() {
        lastFrameParticlesTested = particlesTested;
        lastFrameParticlesCulled = particlesCulled;
        lastFrameBlockEntitiesSkipped = blockEntitiesSkipped;
        particlesTested = 0;
        particlesCulled = 0;
        blockEntitiesSkipped = 0;
    }
}
