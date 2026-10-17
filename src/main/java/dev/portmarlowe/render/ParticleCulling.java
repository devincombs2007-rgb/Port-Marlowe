package dev.portmarlowe.render;

import dev.portmarlowe.PortMarlowe;
import net.minecraft.client.particle.Particle;
import net.minecraft.client.particle.SingleQuadParticle;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;
import org.joml.FrustumIntersection;
import org.joml.Matrix4f;

/**
 * Vanilla builds a camera-facing quad for every live particle each frame, including the ones behind
 * the player. This keeps a copy of the frustum the level renderer culls chunks with and skips the
 * particles outside it.
 */
public final class ParticleCulling {
    private static final FrustumIntersection FRUSTUM = new FrustumIntersection();
    private static final Matrix4f VIEW_PROJECTION = new Matrix4f();
    /** Slack for the quad extending past the bounding box and for movement within the frame. */
    private static final float MARGIN = 0.5F;

    private static boolean valid;
    private static double cameraX;
    private static double cameraY;
    private static double cameraZ;

    private ParticleCulling() {
    }

    /** Same matrices and camera origin as vanilla's {@code Frustum}. */
    public static void capture(Vec3 cameraPosition, Matrix4f view, Matrix4f projection) {
        projection.mul(view, VIEW_PROJECTION);
        FRUSTUM.set(VIEW_PROJECTION);
        cameraX = cameraPosition.x;
        cameraY = cameraPosition.y;
        cameraZ = cameraPosition.z;
        valid = true;
        RenderStats.beginFrame();
    }

    public static boolean shouldRender(Particle particle, float partialTick) {
        // Only plain billboards: custom particles (elder guardian, item pickup...) draw away from their box.
        if (!valid || !(particle instanceof SingleQuadParticle quad) || !PortMarlowe.config().particleCulling) {
            return true;
        }
        RenderStats.particlesTested++;
        AABB box = particle.getBoundingBox();
        float radius = quad.getQuadSize(partialTick) + MARGIN;
        boolean visible = FRUSTUM.testAab(
                (float) (box.minX - cameraX) - radius,
                (float) (box.minY - cameraY) - radius,
                (float) (box.minZ - cameraZ) - radius,
                (float) (box.maxX - cameraX) + radius,
                (float) (box.maxY - cameraY) + radius,
                (float) (box.maxZ - cameraZ) + radius);
        if (!visible) {
            RenderStats.particlesCulled++;
        }
        return visible;
    }
}
