package dev.portmarlowe.selftest;

import dev.portmarlowe.PortMarlowe;
import dev.portmarlowe.config.PortMarloweConfig;
import dev.portmarlowe.fps.FrameRateGovernor;
import dev.portmarlowe.gui.PortMarloweOptionsScreen;
import dev.portmarlowe.platform.Platform;
import dev.portmarlowe.preset.LivePresetApplier;
import dev.portmarlowe.preset.PresetPlan;
import dev.portmarlowe.render.RenderStats;
import dev.portmarlowe.selftest.mixin.MinecraftAccessor;
import net.minecraft.client.CloudStatus;
import net.minecraft.client.GraphicsStatus;
import net.minecraft.client.Minecraft;
import net.minecraft.client.Options;
import net.minecraft.client.ParticleStatus;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.events.ContainerEventHandler;
import net.minecraft.client.gui.components.events.GuiEventListener;
import net.minecraft.client.gui.screens.ChatScreen;
import net.minecraft.client.gui.screens.PauseScreen;
import net.minecraft.client.gui.screens.TitleScreen;
import net.minecraft.client.gui.screens.options.VideoSettingsScreen;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.chat.Component;
import net.minecraft.world.Difficulty;
import net.minecraft.world.level.GameRules;
import net.minecraft.world.level.GameType;
import net.minecraft.world.level.LevelSettings;
import net.minecraft.world.level.WorldDataConfiguration;
import net.minecraft.world.level.levelgen.WorldOptions;
import net.minecraft.world.level.levelgen.presets.WorldPresets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.spongepowered.asm.mixin.MixinEnvironment;

import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Drives a real client through the code paths the mod touches and writes {@code portmarlowe-selftest.txt}
 * with PASS or FAIL, then quits. Runs from CI under a virtual display ({@code ./gradlew runSelftest}).
 */
public final class SelfTest {
    public static final Logger LOGGER = LoggerFactory.getLogger("Port Marlowe Self-Test");
    public static final boolean ENABLED = Boolean.getBoolean("portmarlowe.selftest");

    private static final long TIMEOUT_NANOS = TimeUnit.MINUTES.toNanos(15);
    private static final int STAGE_TIMEOUT_TICKS = 20 * 60;
    private static final long STARTED = System.nanoTime();

    private enum Stage {
        BOOT, MENUS, WAIT_WORLD, LIFT_OFF, PARTICLES, BLOCK_ENTITIES, FRAME_RATE, DONE
    }

    private static Stage stage = Stage.BOOT;
    private static int stageTicks;
    private static int worldTicks;
    private static int maxLiveParticles;
    private static String cullingFrame;
    private static final List<String> passed = new ArrayList<>();

    private SelfTest() {
    }

    public static void tick(Minecraft mc) {
        if (!ENABLED || stage == Stage.DONE) {
            return;
        }
        stageTicks++;
        try {
            if (System.nanoTime() - STARTED > TIMEOUT_NANOS) {
                throw new AssertionError("timed out in stage " + stage);
            }
            switch (stage) {
                case BOOT -> boot(mc);
                case MENUS -> menus(mc);
                case WAIT_WORLD -> waitForWorld(mc);
                case LIFT_OFF -> liftOff(mc);
                case PARTICLES -> particles(mc);
                case BLOCK_ENTITIES -> blockEntities(mc);
                case FRAME_RATE -> frameRate(mc);
                case DONE -> {
                }
            }
        } catch (Throwable t) {
            finish(mc, t);
        }
    }

    private static void boot(Minecraft mc) {
        if (mc.getOverlay() != null || mc.screen == null || mc.level != null) {
            return; // still loading resources
        }
        PortMarloweConfig config = PortMarlowe.config();
        // The CI window never has focus and nobody touches it.
        config.unfocusedFps = 0;
        config.idleTimeoutSeconds = 0;
        mc.options.pauseOnLostFocus = false;

        MixinEnvironment.getCurrentEnvironment().audit();
        check(true, "mixin audit: every mixin target loaded and transformed");

        check(PortMarlowe.device().platform() == Platform.IOS, "platform detected as iOS via override: " + PortMarlowe.device().describe());
        check(config.presetApplied, "first-launch preset recorded in config");

        Options options = mc.options;
        check(options.graphicsMode().get() == GraphicsStatus.FAST, "graphics: " + options.graphicsMode().get());
        check(!options.ambientOcclusion().get(), "smooth lighting off");
        check(options.biomeBlendRadius().get() == 0, "biome blend: " + options.biomeBlendRadius().get());
        check(options.mipmapLevels().get() == 0, "mipmap levels: " + options.mipmapLevels().get());
        check(!options.entityShadows().get(), "entity shadows off");
        check(options.particles().get() == ParticleStatus.MINIMAL, "particles: " + options.particles().get());
        check(options.cloudStatus().get() == CloudStatus.OFF, "clouds: " + options.cloudStatus().get());
        check(options.renderDistance().get() <= 8, "render distance: " + options.renderDistance().get());
        check(options.simulationDistance().get() == 5, "simulation distance: " + options.simulationDistance().get());
        check(options.framerateLimit().get() <= 60, "max fps: " + options.framerateLimit().get());
        check(options.menuBackgroundBlurriness().get() == 0, "menu blur: " + options.menuBackgroundBlurriness().get());
        check(options.entityDistanceScaling().get() <= 0.5, "entity distance: " + options.entityDistanceScaling().get());

        int packs = RenderStats.chunkBuilderPacks;
        if (PortMarlowe.isSodiumLoaded()) {
            // Sodium meshes chunks itself; recent versions never allocate vanilla's pool (-1).
            check(packs <= 1, "chunk mesh workers with Sodium: " + (packs < 0 ? "vanilla pool not allocated" : packs));
        } else {
            check(packs >= 1 && packs <= 3, "chunk mesh workers capped: " + packs);
        }

        int menuLimit = frameLimit(mc);
        check(menuLimit <= config.menuFps, "title screen frame cap " + menuLimit + " <= " + config.menuFps);
        next(Stage.MENUS);
    }

    private static void menus(Minecraft mc) {
        VideoSettingsScreen video = new VideoSettingsScreen(new TitleScreen(), mc, mc.options);
        mc.setScreen(video);
        String label = Component.translatable("portmarlowe.options.open").getString();
        check(!label.equals("portmarlowe.options.open"), "mod translations load without Fabric API: \"" + label + "\"");
        Button open = findButton(video, label);
        check(open != null, "\"" + label + "\" button present in Video Settings");
        open.onPress();
        check(mc.screen instanceof PortMarloweOptionsScreen, "settings screen opens: " + mc.screen);
        check(!((PortMarloweOptionsScreen) mc.screen).children().isEmpty(), "settings screen has widgets");

        LivePresetApplier.apply(mc.options, PresetPlan.create(PortMarlowe.config().presetOrDefault(), PortMarlowe.device()));
        check(mc.options.biomeBlendRadius().get() == 0, "live preset re-apply keeps settings consistent");

        mc.setScreen(null);
        mc.options.renderDistance().set(4); // keeps world generation on the CI runner short

        next(Stage.WAIT_WORLD);
        String name = "selftest-" + System.currentTimeMillis();
        LevelSettings settings = new LevelSettings(name, GameType.CREATIVE, false, Difficulty.PEACEFUL, true,
                new GameRules(), WorldDataConfiguration.DEFAULT);
        WorldOptions worldOptions = new WorldOptions(20261017L, false, false);
        mc.tell(() -> mc.createWorldOpenFlows().createFreshLevel(name, settings, worldOptions,
                registries -> WorldPresets.createNormalWorldDimensions(registries), mc.screen));
    }

    private static void waitForWorld(Minecraft mc) {
        if (mc.level != null && mc.screen instanceof PauseScreen) {
            mc.setScreen(null);
        }
        if (mc.level == null || mc.player == null || mc.screen != null) {
            return;
        }
        if (++worldTicks >= 100) {
            check(true, "singleplayer world loaded and rendered for 100 ticks");
            // A glass platform high above the terrain: nothing occludes the test scene and the
            // player stands still, so the camera is exactly where the scene expects it.
            LocalPlayer player = mc.player;
            player.connection.sendCommand("fill ~-2 219 ~-2 ~2 219 ~2 minecraft:glass");
            player.connection.sendCommand("tp @s ~ 220 ~");
            next(Stage.LIFT_OFF);
        }
    }

    private static void liftOff(Minecraft mc) {
        LocalPlayer player = mc.player;
        faceEast(player);
        if (stageTicks >= 40 && player.getY() > 219.5 && player.onGround()) {
            next(Stage.PARTICLES);
        } else if (stageTicks > STAGE_TIMEOUT_TICKS) {
            throw new AssertionError("player never settled on the test platform (y=" + player.getY() + ")");
        }
    }

    private static void particles(Minecraft mc) {
        PortMarloweConfig config = PortMarlowe.config();
        LocalPlayer player = mc.player;
        faceEast(player);
        for (int i = 0; i < 400; i++) {
            double side = (i & 1) == 0 ? 1 : -1; // half in front of the camera, half behind it
            mc.particleEngine.createParticle(ParticleTypes.END_ROD,
                    player.getX() + side * (6 + (i % 7)), player.getEyeY() + (i % 5) - 2, player.getZ() + (i % 9) - 4,
                    0, 0, 0);
        }

        int live = Integer.parseInt(mc.particleEngine.countParticles());
        if (live > config.particleLimit) {
            throw new AssertionError("live particles " + live + " exceed the limit " + config.particleLimit);
        }
        maxLiveParticles = Math.max(maxLiveParticles, live);

        // Half the particles are behind the camera: roughly half must be culled, and the other half drawn.
        int tested = RenderStats.lastFrameParticlesTested;
        int culled = RenderStats.lastFrameParticlesCulled;
        if (tested >= config.particleLimit / 2 && culled >= tested / 4 && culled <= tested * 3 / 4) {
            cullingFrame = culled + " of " + tested;
        }

        if (maxLiveParticles >= config.particleLimit / 2 && cullingFrame != null && stageTicks >= 20) {
            check(true, "particle limit holds (peak " + maxLiveParticles + " <= " + config.particleLimit + ")");
            check(true, "particles behind the camera culled, the ones in front drawn (" + cullingFrame + " culled in one frame)");
            player.connection.sendCommand("setblock ~10 ~ ~ minecraft:chest");
            player.connection.sendCommand("fill ~48 ~-1 ~-2 ~48 ~1 ~2 minecraft:chest");
            next(Stage.BLOCK_ENTITIES);
        } else if (stageTicks > STAGE_TIMEOUT_TICKS) {
            throw new AssertionError("particles: peak live " + maxLiveParticles + ", last frame culled "
                    + RenderStats.lastFrameParticlesCulled + " of " + RenderStats.lastFrameParticlesTested);
        }
    }

    private static void blockEntities(Minecraft mc) {
        faceEast(mc.player);
        if (RenderStats.lastFrameBlockEntitiesSkipped > 0 && stageTicks >= 20) {
            check(true, "block entities beyond " + PortMarlowe.config().blockEntityDistance + " blocks skipped ("
                    + RenderStats.lastFrameBlockEntitiesSkipped + " last frame)");
            PortMarlowe.config().textureAnimations = false;
            next(Stage.FRAME_RATE);
        } else if (stageTicks > STAGE_TIMEOUT_TICKS) {
            throw new AssertionError("no block entity was skipped by distance");
        }
    }

    private static void frameRate(Minecraft mc) {
        if (stageTicks < 20) {
            return; // let a few frames render with texture animations off
        }
        PortMarlowe.config().textureAnimations = true;
        PortMarloweConfig config = PortMarlowe.config();
        int vanilla = mc.getWindow().getFramerateLimit();

        mc.setScreen(null);
        check(frameLimit(mc) == vanilla, "in-game frame cap untouched: " + frameLimit(mc) + " == " + vanilla);

        mc.setScreen(new ChatScreen(""));
        check(frameLimit(mc) == vanilla, "chat keeps the full frame rate: " + frameLimit(mc));

        mc.setScreen(new PauseScreen(true));
        int paused = frameLimit(mc);
        check(paused <= config.menuFps && RenderStats.fpsDecision.reason() == FrameRateGovernor.Reason.MENU,
                "pause menu frame cap " + paused + " <= " + config.menuFps);
        mc.setScreen(null);

        finish(mc, null);
    }

    private static int frameLimit(Minecraft mc) {
        return ((MinecraftAccessor) mc).portmarloweSelftest$getFramerateLimit();
    }

    private static void faceEast(LocalPlayer player) {
        player.setYRot(-90.0F);
        player.setXRot(0.0F);
    }

    private static Button findButton(ContainerEventHandler container, String label) {
        for (GuiEventListener child : container.children()) {
            if (child instanceof Button button && button.getMessage().getString().equals(label)) {
                return button;
            }
            if (child instanceof ContainerEventHandler nested) {
                Button found = findButton(nested, label);
                if (found != null) {
                    return found;
                }
            }
        }
        return null;
    }

    private static void check(boolean condition, String description) {
        if (!condition) {
            throw new AssertionError(description);
        }
        passed.add("ok - " + description);
        LOGGER.info("ok - {}", description);
    }

    private static void next(Stage nextStage) {
        LOGGER.info("Stage {} -> {}", stage, nextStage);
        stage = nextStage;
        stageTicks = 0;
    }

    private static void finish(Minecraft mc, Throwable failure) {
        stage = Stage.DONE;
        StringBuilder report = new StringBuilder();
        if (failure == null) {
            report.append("PASS\n");
        } else {
            StringWriter trace = new StringWriter();
            failure.printStackTrace(new PrintWriter(trace));
            report.append("FAIL: ").append(failure).append('\n').append(trace).append('\n');
            LOGGER.error("Self-test FAILED", failure);
        }
        passed.forEach(line -> report.append(line).append('\n'));

        Path file = mc.gameDirectory.toPath().resolve("portmarlowe-selftest.txt");
        try {
            Files.writeString(file, report.toString(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            LOGGER.error("Could not write {}", file, e);
        }
        LOGGER.info("Self-test finished: {} ({} checks passed)", failure == null ? "PASS" : "FAIL", passed.size());
        mc.stop();
    }
}
