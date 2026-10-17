#version 150

// Port Marlowe "Dread": the one shader. Cold desaturation, a creeping vignette that throbs
// with a lub-dub heartbeat, chromatic fringing and film grain, with the edges of the screen
// slowly crawling as if something is moving in your peripheral vision.

uniform sampler2D InSampler;
uniform vec2 OutSize;
uniform float Time; // 0..1, loops once per second

in vec2 texCoord;
out vec4 fragColor;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 uv = texCoord;
    vec2 centered = uv - 0.5;
    float dist = length(centered);

    // lub-dub heartbeat, 1 Hz, two close pulses
    float beat = pow(max(0.0, sin(Time * 6.2831853)), 8.0)
               + 0.6 * pow(max(0.0, sin(Time * 6.2831853 - 1.1)), 8.0);
    beat = clamp(beat, 0.0, 1.0);

    // peripheral crawl: warp only near the edges
    float edge = smoothstep(0.25, 0.75, dist);
    vec2 wobble = vec2(sin(uv.y * 14.0 + Time * 6.2831853 * 0.7),
                       cos(uv.x * 11.0 + Time * 6.2831853 * 0.5)) * 0.004 * edge;
    uv += wobble;

    // chromatic aberration, stronger at the edges and on the heartbeat
    vec2 dir = normalize(centered + 1e-5) * (0.0025 + 0.006 * edge + 0.002 * beat);
    vec3 col;
    col.r = texture(InSampler, uv + dir).r;
    col.g = texture(InSampler, uv).g;
    col.b = texture(InSampler, uv - dir).b;

    // desaturate and push towards cold, sickly blue-green
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, 0.55);
    col *= vec3(0.86, 0.97, 1.05);

    // crush mids so shadows swallow detail
    col = pow(col, vec3(1.18));

    // pulsing vignette
    float vig = smoothstep(0.30, 0.85, dist + 0.06 * beat);
    col *= 1.0 - vig * (0.65 + 0.2 * beat);
    // faint red bleed at the very edge on each beat
    col += vec3(0.18, 0.0, 0.0) * vig * beat * vig;

    // film grain, re-seeded in time steps
    float grain = hash(floor(uv * OutSize) + floor(Time * 24.0)) - 0.5;
    col += grain * 0.07;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
