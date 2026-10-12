using System.Collections.Generic;
using PortMarlowe.Game.Rendering;
using UnityEngine;
using UnityEngine.Rendering;

namespace PortMarlowe.Game.Characters
{
    public enum RigPose
    {
        Locomotion = 0,
        Seated = 1,
        Phone = 2,
        Cower = 3,
        Knocked = 4,
        HandsUp = 5,
        Strike = 6,
        BreakIn = 7,
    }

    /// <summary>
    /// PLACEHOLDER character presentation: a procedurally built, rigidly skinned mannequin (one
    /// SkinnedMeshRenderer, one material, palette texture for clothing colours) with procedural gait.
    /// It reads gameplay state only (speed, pose) and never moves the capsule. The production path
    /// replaces this with licensed humanoid meshes + retargeted Animator clips behind the same API.
    /// </summary>
    public sealed class CharacterRig : MonoBehaviour
    {
        private enum B
        {
            Hips, Spine, Neck, Head,
            UpperArmL, ForeArmL, UpperArmR, ForeArmR,
            ThighL, ShinL, ThighR, ShinR,
            Count,
        }

        private const int SlotSkin = 0, SlotTop = 1, SlotBottom = 2, SlotShoes = 3, SlotHair = 4, SlotAccent = 5, SlotHeadwear = 6, SlotEyes = 7, Slots = 8;

        private readonly Transform[] _bones = new Transform[(int)B.Count];
        private readonly Quaternion[] _target = new Quaternion[(int)B.Count];
        private readonly Vector3[] _bindLocalPos = new Vector3[(int)B.Count];
        private Texture2D _palette;
        private Material _material;
        private SkinnedMeshRenderer _renderer;
        private Mesh _mesh;
        private float _height;
        private float _legLength;
        private float _phase;
        private float _hipsOffset;
        private float _poseTime;
        private RigPose _pose;
        private float _knockedBlend;
        private bool _hasHeadwear;
        private Transform _headwear;

        public float Speed { get; set; }
        public bool Grounded { get; set; } = true;
        public float BlendTime { get; set; } = 0.1f;
        public RigPose Pose => _pose;

        /// <summary>World transform of the right hand (props such as a phone attach here).</summary>
        public Transform RightHand { get; private set; }

        public Material Material => _material;

        public static CharacterRig Create(Transform parent, string name, float height, float shoulderWidth, float bulk, bool longHair,
            Color skin, Color hair, Outfit outfit, MaterialLibrary lib, bool castShadows = true)
        {
            var go = new GameObject(name + "_Rig");
            go.transform.SetParent(parent, false);
            var rig = go.AddComponent<CharacterRig>();
            rig.Build(height, shoulderWidth, bulk, longHair, skin, hair, outfit, lib, castShadows);
            return rig;
        }

        public void SetPose(RigPose pose)
        {
            if (pose != _pose)
            {
                _pose = pose;
                _poseTime = 0f;
            }
        }

        public void ApplyOutfit(Outfit outfit, Color skin, Color hair)
        {
            var px = new Color32[Slots];
            px[SlotSkin] = skin;
            px[SlotTop] = outfit.Top;
            px[SlotBottom] = outfit.Bottom;
            px[SlotShoes] = outfit.Shoes;
            px[SlotHair] = hair;
            px[SlotAccent] = outfit.Accent;
            px[SlotHeadwear] = outfit.HeadwearColor;
            px[SlotEyes] = new Color(0.05f, 0.05f, 0.06f);
            _palette.SetPixels32(px);
            _palette.Apply(false, false);
            _hasHeadwear = outfit.Headwear;
            if (_headwear != null)
            {
                _headwear.localScale = _hasHeadwear ? Vector3.one : Vector3.zero;
            }
        }

        public void SetVisible(bool visible)
        {
            if (_renderer != null)
            {
                _renderer.enabled = visible;
            }
        }

        private void Build(float height, float shoulderWidth, float bulk, bool longHair, Color skin, Color hair, Outfit outfit, MaterialLibrary lib, bool castShadows)
        {
            _height = height;
            float H = height;
            _legLength = 0.47f * H;
            float hipY = 0.5f * H;
            float torso = 0.3f * H;
            float neckLen = 0.035f * H;
            float headH = 0.13f * H;
            float upperArm = 0.17f * H;
            float foreArm = 0.16f * H;
            float thigh = 0.245f * H;
            float shin = 0.235f * H;
            float sw = shoulderWidth;
            float w = bulk;

            // Bone hierarchy at bind pose (arms down, legs straight). Root of rig = character feet.
            Transform Bone(B id, Transform parent, Vector3 localPos)
            {
                var t = new GameObject(id.ToString()).transform;
                t.SetParent(parent, false);
                t.localPosition = localPos;
                _bones[(int)id] = t;
                _bindLocalPos[(int)id] = localPos;
                _target[(int)id] = Quaternion.identity;
                return t;
            }

            var hips = Bone(B.Hips, transform, new Vector3(0f, hipY, 0f));
            var spine = Bone(B.Spine, hips, new Vector3(0f, 0.06f * H, 0f));
            var neck = Bone(B.Neck, spine, new Vector3(0f, torso - 0.03f * H, 0f));
            var head = Bone(B.Head, neck, new Vector3(0f, neckLen, 0f));
            var uaL = Bone(B.UpperArmL, spine, new Vector3(-sw * 0.5f, torso - 0.06f * H, 0f));
            var faL = Bone(B.ForeArmL, uaL, new Vector3(0f, -upperArm, 0f));
            var uaR = Bone(B.UpperArmR, spine, new Vector3(sw * 0.5f, torso - 0.06f * H, 0f));
            var faR = Bone(B.ForeArmR, uaR, new Vector3(0f, -upperArm, 0f));
            var thL = Bone(B.ThighL, hips, new Vector3(-0.1f * w * H / 1.8f, -0.01f, 0f));
            var shL = Bone(B.ShinL, thL, new Vector3(0f, -thigh, 0f));
            var thR = Bone(B.ThighR, hips, new Vector3(0.1f * w * H / 1.8f, -0.01f, 0f));
            var shR = Bone(B.ShinR, thR, new Vector3(0f, -thigh, 0f));

            var hand = new GameObject("HandR").transform;
            hand.SetParent(faR, false);
            hand.localPosition = new Vector3(0f, -foreArm - 0.06f, 0f);
            RightHand = hand;

            var verts = new List<Vector3>();
            var normals = new List<Vector3>();
            var uvs = new List<Vector2>();
            var tris = new List<int>();
            var weights = new List<BoneWeight>();

            void Box(B bone, int slot, Vector3 centerLocalToBone, Vector3 size)
            {
                var t = _bones[(int)bone];
                Vector3 c = transform.InverseTransformPoint(t.position) + centerLocalToBone; // bind pose: bones unrotated
                AddBox(verts, normals, uvs, tris, weights, c, size, (int)bone, slot);
            }

            // Legs.
            Box(B.ThighL, SlotBottom, new Vector3(0f, -thigh * 0.5f, 0f), new Vector3(0.15f * w, thigh, 0.17f * w));
            Box(B.ThighR, SlotBottom, new Vector3(0f, -thigh * 0.5f, 0f), new Vector3(0.15f * w, thigh, 0.17f * w));
            Box(B.ShinL, SlotBottom, new Vector3(0f, -shin * 0.5f, 0f), new Vector3(0.12f * w, shin, 0.13f * w));
            Box(B.ShinR, SlotBottom, new Vector3(0f, -shin * 0.5f, 0f), new Vector3(0.12f * w, shin, 0.13f * w));
            Box(B.ShinL, SlotShoes, new Vector3(0f, -shin - 0.035f, 0.045f), new Vector3(0.11f, 0.08f, 0.27f));
            Box(B.ShinR, SlotShoes, new Vector3(0f, -shin - 0.035f, 0.045f), new Vector3(0.11f, 0.08f, 0.27f));

            // Pelvis and torso (jacket over shirt reads as a slightly wider chest).
            Box(B.Hips, SlotBottom, new Vector3(0f, 0.02f, 0f), new Vector3(sw * 0.82f * w, 0.14f * H / 1.8f, 0.2f * w));
            Box(B.Spine, SlotTop, new Vector3(0f, torso * 0.32f, 0f), new Vector3(sw * 0.78f * w, torso * 0.64f, 0.21f * w));
            Box(B.Spine, SlotTop, new Vector3(0f, torso * 0.72f, 0f), new Vector3(sw * 1.02f, torso * 0.36f, 0.23f * w));
            Box(B.Spine, SlotAccent, new Vector3(0f, torso * 0.9f, 0.02f), new Vector3(sw * 0.45f, 0.04f, 0.2f * w));

            // Neck and head.
            Box(B.Neck, SlotSkin, new Vector3(0f, neckLen * 0.5f, 0f), new Vector3(0.1f, neckLen + 0.02f, 0.1f));
            Box(B.Head, SlotSkin, new Vector3(0f, headH * 0.5f, 0.01f), new Vector3(0.16f, headH, 0.19f));
            Box(B.Head, SlotSkin, new Vector3(0f, headH * 0.42f, 0.105f), new Vector3(0.035f, 0.05f, 0.03f)); // nose
            Box(B.Head, SlotEyes, new Vector3(-0.038f, headH * 0.58f, 0.1f), new Vector3(0.03f, 0.018f, 0.01f));
            Box(B.Head, SlotEyes, new Vector3(0.038f, headH * 0.58f, 0.1f), new Vector3(0.03f, 0.018f, 0.01f));
            Box(B.Head, SlotHair, new Vector3(0f, headH * 0.92f, -0.005f), new Vector3(0.175f, 0.05f, 0.205f));
            Box(B.Head, SlotHair, new Vector3(0f, headH * 0.6f, -0.09f), new Vector3(0.17f, headH * 0.6f, 0.04f));
            if (longHair)
            {
                Box(B.Head, SlotHair, new Vector3(0f, headH * 0.15f, -0.1f), new Vector3(0.18f, headH * 0.9f, 0.05f));
                Box(B.Head, SlotHair, new Vector3(-0.085f, headH * 0.45f, -0.03f), new Vector3(0.02f, headH * 0.7f, 0.12f));
                Box(B.Head, SlotHair, new Vector3(0.085f, headH * 0.45f, -0.03f), new Vector3(0.02f, headH * 0.7f, 0.12f));
            }

            // Arms (sleeves = top colour; forearm sleeves to the wrist; hands skin).
            Box(B.UpperArmL, SlotTop, new Vector3(0f, -upperArm * 0.5f, 0f), new Vector3(0.1f * w, upperArm + 0.04f, 0.11f * w));
            Box(B.UpperArmR, SlotTop, new Vector3(0f, -upperArm * 0.5f, 0f), new Vector3(0.1f * w, upperArm + 0.04f, 0.11f * w));
            Box(B.ForeArmL, SlotTop, new Vector3(0f, -foreArm * 0.45f, 0f), new Vector3(0.085f * w, foreArm * 0.9f, 0.09f * w));
            Box(B.ForeArmR, SlotTop, new Vector3(0f, -foreArm * 0.45f, 0f), new Vector3(0.085f * w, foreArm * 0.9f, 0.09f * w));
            Box(B.ForeArmL, SlotSkin, new Vector3(0f, -foreArm - 0.03f, 0f), new Vector3(0.07f, 0.11f, 0.05f));
            Box(B.ForeArmR, SlotSkin, new Vector3(0f, -foreArm - 0.03f, 0f), new Vector3(0.07f, 0.11f, 0.05f));

            // Headwear as a separate child so it can be hidden without rebuilding the mesh.
            _mesh = new Mesh { name = name + "_Mesh" };
            _mesh.SetVertices(verts);
            _mesh.SetNormals(normals);
            _mesh.SetUVs(0, uvs);
            _mesh.SetTriangles(tris, 0);
            _mesh.boneWeights = weights.ToArray();
            var bind = new Matrix4x4[(int)B.Count];
            for (int i = 0; i < bind.Length; i++)
            {
                bind[i] = _bones[i].worldToLocalMatrix * transform.localToWorldMatrix;
            }

            _mesh.bindposes = bind;
            _mesh.RecalculateBounds();

            _palette = ProceduralTextures.Palette(name + "_Palette", Slots);
            _material = lib.Lit(name + "_Mat", Color.white, 0.28f, 0f, _palette, Vector2.one);
            lib.Track(_palette);
            lib.Track(_mesh);

            _renderer = gameObject.AddComponent<SkinnedMeshRenderer>();
            _renderer.sharedMesh = _mesh;
            _renderer.bones = _bones;
            _renderer.rootBone = hips;
            _renderer.sharedMaterial = _material;
            _renderer.quality = SkinQuality.Bone1;
            _renderer.updateWhenOffscreen = false;
            _renderer.shadowCastingMode = castShadows ? ShadowCastingMode.On : ShadowCastingMode.Off;
            _renderer.localBounds = new Bounds(new Vector3(0f, -hipY * 0.1f, 0f), new Vector3(1.4f, H * 1.2f, 1.4f));

            // Cap: small mesh parented to the head bone.
            var capGo = new GameObject("Headwear");
            capGo.transform.SetParent(head, false);
            var cmf = capGo.AddComponent<MeshFilter>();
            var cv = new List<Vector3>();
            var cn = new List<Vector3>();
            var cu = new List<Vector2>();
            var ct = new List<int>();
            var cw = new List<BoneWeight>();
            AddBox(cv, cn, cu, ct, cw, new Vector3(0f, headH * 0.98f, 0f), new Vector3(0.19f, 0.07f, 0.22f), 0, SlotHeadwear);
            AddBox(cv, cn, cu, ct, cw, new Vector3(0f, headH * 0.88f, 0.14f), new Vector3(0.17f, 0.02f, 0.1f), 0, SlotHeadwear);
            var capMesh = new Mesh { name = "Cap" };
            capMesh.SetVertices(cv);
            capMesh.SetNormals(cn);
            capMesh.SetUVs(0, cu);
            capMesh.SetTriangles(ct, 0);
            cmf.sharedMesh = capMesh;
            lib.Track(capMesh);
            var cmr = capGo.AddComponent<MeshRenderer>();
            cmr.sharedMaterial = _material;
            _headwear = capGo.transform;

            ApplyOutfit(outfit, skin, hair);
        }

        private static void AddBox(List<Vector3> v, List<Vector3> n, List<Vector2> uv, List<int> t, List<BoneWeight> w, Vector3 c, Vector3 size, int bone, int slot)
        {
            Vector3 h = size * 0.5f;
            var u = new Vector2((slot + 0.5f) / Slots, 0.5f);
            var bw = new BoneWeight { boneIndex0 = bone, weight0 = 1f };
            void Face(Vector3 normal, Vector3 a, Vector3 b, Vector3 cc, Vector3 d)
            {
                int i = v.Count;
                v.Add(c + a);
                v.Add(c + b);
                v.Add(c + cc);
                v.Add(c + d);
                for (int k = 0; k < 4; k++)
                {
                    n.Add(normal);
                    uv.Add(u);
                    w.Add(bw);
                }

                t.Add(i);
                t.Add(i + 3);
                t.Add(i + 2);
                t.Add(i);
                t.Add(i + 2);
                t.Add(i + 1);
            }

            Face(Vector3.back, new Vector3(-h.x, -h.y, -h.z), new Vector3(h.x, -h.y, -h.z), new Vector3(h.x, h.y, -h.z), new Vector3(-h.x, h.y, -h.z));
            Face(Vector3.forward, new Vector3(h.x, -h.y, h.z), new Vector3(-h.x, -h.y, h.z), new Vector3(-h.x, h.y, h.z), new Vector3(h.x, h.y, h.z));
            Face(Vector3.left, new Vector3(-h.x, -h.y, h.z), new Vector3(-h.x, -h.y, -h.z), new Vector3(-h.x, h.y, -h.z), new Vector3(-h.x, h.y, h.z));
            Face(Vector3.right, new Vector3(h.x, -h.y, -h.z), new Vector3(h.x, -h.y, h.z), new Vector3(h.x, h.y, h.z), new Vector3(h.x, h.y, -h.z));
            Face(Vector3.up, new Vector3(-h.x, h.y, -h.z), new Vector3(h.x, h.y, -h.z), new Vector3(h.x, h.y, h.z), new Vector3(-h.x, h.y, h.z));
            Face(Vector3.down, new Vector3(-h.x, -h.y, h.z), new Vector3(h.x, -h.y, h.z), new Vector3(h.x, -h.y, -h.z), new Vector3(-h.x, -h.y, -h.z));
        }

        // ------------------------------------------------------------------ animation

        private static Quaternion Swing(float forwardDegrees, float sideDegrees = 0f, float twistDegrees = 0f) =>
            Quaternion.Euler(-forwardDegrees, twistDegrees, sideDegrees);

        private void LateUpdate()
        {
            float dt = Time.deltaTime;
            if (dt <= 0f)
            {
                return;
            }

            _poseTime += dt;
            for (int i = 0; i < _target.Length; i++)
            {
                _target[i] = Quaternion.identity;
            }

            float hipDrop = 0f;
            float bodyPitch = 0f;
            switch (_pose)
            {
                case RigPose.Locomotion:
                    Locomotion(dt, ref hipDrop);
                    break;
                case RigPose.Seated:
                    _target[(int)B.ThighL] = _target[(int)B.ThighR] = Swing(88f);
                    _target[(int)B.ShinL] = _target[(int)B.ShinR] = Swing(-82f);
                    _target[(int)B.UpperArmL] = Swing(48f, 8f);
                    _target[(int)B.UpperArmR] = Swing(48f, -8f);
                    _target[(int)B.ForeArmL] = _target[(int)B.ForeArmR] = Swing(32f);
                    _target[(int)B.Spine] = Swing(-6f);
                    hipDrop = _legLength * 0.47f;
                    break;
                case RigPose.Phone:
                    Idle(ref hipDrop);
                    _target[(int)B.UpperArmR] = Swing(28f, -38f);
                    _target[(int)B.ForeArmR] = Swing(142f);
                    _target[(int)B.Head] = Swing(-6f, 0f, 12f);
                    break;
                case RigPose.Cower:
                    _target[(int)B.ThighL] = _target[(int)B.ThighR] = Swing(105f);
                    _target[(int)B.ShinL] = _target[(int)B.ShinR] = Swing(-120f);
                    _target[(int)B.Spine] = Swing(32f);
                    _target[(int)B.UpperArmL] = Swing(150f, 18f);
                    _target[(int)B.UpperArmR] = Swing(150f, -18f);
                    _target[(int)B.ForeArmL] = _target[(int)B.ForeArmR] = Swing(95f);
                    _target[(int)B.Head] = Swing(25f);
                    hipDrop = _legLength * 0.55f;
                    break;
                case RigPose.HandsUp:
                    Idle(ref hipDrop);
                    _target[(int)B.UpperArmL] = Swing(0f, -150f);
                    _target[(int)B.UpperArmR] = Swing(0f, 150f);
                    _target[(int)B.ForeArmL] = Swing(0f, -20f);
                    _target[(int)B.ForeArmR] = Swing(0f, 20f);
                    break;
                case RigPose.Strike:
                {
                    Idle(ref hipDrop);
                    float t = Mathf.Clamp01(_poseTime / 0.14f);
                    float back = 1f - Mathf.Clamp01((_poseTime - 0.22f) / 0.18f);
                    _target[(int)B.UpperArmR] = Swing(Mathf.Lerp(20f, 88f, t) * back);
                    _target[(int)B.ForeArmR] = Swing(Mathf.Lerp(110f, 5f, t) * back);
                    _target[(int)B.UpperArmL] = Swing(40f, 10f);
                    _target[(int)B.ForeArmL] = Swing(100f);
                    _target[(int)B.Spine] = Swing(8f * t * back, 0f, -18f * t * back);
                    break;
                }

                case RigPose.BreakIn:
                {
                    Idle(ref hipDrop);
                    float cycle = Mathf.PingPong(_poseTime * 4f, 1f);
                    _target[(int)B.UpperArmR] = Swing(60f + cycle * 40f, -10f);
                    _target[(int)B.ForeArmR] = Swing(40f - cycle * 30f);
                    _target[(int)B.Spine] = Swing(10f);
                    break;
                }

                case RigPose.Knocked:
                    _target[(int)B.UpperArmL] = Swing(20f, -70f);
                    _target[(int)B.UpperArmR] = Swing(-10f, 80f);
                    _target[(int)B.ThighL] = Swing(15f, -10f);
                    _target[(int)B.ThighR] = Swing(-5f, 12f);
                    _target[(int)B.ShinL] = Swing(-25f);
                    bodyPitch = 90f;
                    break;
            }

            float k = MathUtilSmoothing(dt, BlendTime);
            for (int i = 0; i < _bones.Length; i++)
            {
                _bones[i].localRotation = Quaternion.Slerp(_bones[i].localRotation, _target[i], k);
            }

            _hipsOffset = Mathf.Lerp(_hipsOffset, hipDrop, k);
            var hips = _bones[(int)B.Hips];
            hips.localPosition = _bindLocalPos[(int)B.Hips] - new Vector3(0f, _hipsOffset, 0f);

            // Knockdown topples the whole rig about the feet (presentation only; capsule stays put).
            _knockedBlend = Mathf.MoveTowards(_knockedBlend, bodyPitch > 0f ? 1f : 0f, dt / 0.35f);
            transform.localRotation = Quaternion.Euler(-90f * Mathf.SmoothStep(0f, 1f, _knockedBlend), 0f, 0f);
            transform.localPosition = new Vector3(0f, 0.12f * _knockedBlend, -0.15f * _knockedBlend);
        }

        private void Idle(ref float hipDrop)
        {
            float breathe = Mathf.Sin(Time.time * 1.6f) * 1.2f;
            _target[(int)B.Spine] = Swing(breathe * 0.5f);
            _target[(int)B.UpperArmL] = Swing(2f, 6f);
            _target[(int)B.UpperArmR] = Swing(2f, -6f);
            _target[(int)B.ForeArmL] = _target[(int)B.ForeArmR] = Swing(8f);
            hipDrop = 0.01f;
        }

        private void Locomotion(float dt, ref float hipDrop)
        {
            float speed = Mathf.Max(0f, Speed);
            if (speed < 0.08f || !Grounded)
            {
                Idle(ref hipDrop);
                if (!Grounded)
                {
                    _target[(int)B.ThighL] = Swing(25f);
                    _target[(int)B.ShinL] = Swing(-40f);
                    _target[(int)B.ThighR] = Swing(-10f);
                    _target[(int)B.ShinR] = Swing(-30f);
                    _target[(int)B.UpperArmL] = Swing(30f, 25f);
                    _target[(int)B.UpperArmR] = Swing(30f, -25f);
                }

                return;
            }

            float run = Mathf.InverseLerp(2.2f, 6.5f, speed);
            // Distance-driven phase: stride length grows with speed so feet do not slide.
            float stride = _legLength * Mathf.Lerp(1.45f, 2.6f, run);
            _phase = Mathf.Repeat(_phase + speed * dt / stride * Mathf.PI * 2f, Mathf.PI * 2f);
            float s = Mathf.Sin(_phase);
            float legAmp = Mathf.Lerp(26f, 48f, run);
            float kneeAmp = Mathf.Lerp(32f, 85f, run);
            float armAmp = Mathf.Lerp(18f, 52f, run);
            _target[(int)B.ThighL] = Swing(s * legAmp);
            _target[(int)B.ThighR] = Swing(-s * legAmp);
            _target[(int)B.ShinL] = Swing(-Mathf.Max(0f, -Mathf.Cos(_phase)) * kneeAmp - 6f);
            _target[(int)B.ShinR] = Swing(-Mathf.Max(0f, Mathf.Cos(_phase)) * kneeAmp - 6f);
            _target[(int)B.UpperArmL] = Swing(-s * armAmp, 5f);
            _target[(int)B.UpperArmR] = Swing(s * armAmp, -5f);
            _target[(int)B.ForeArmL] = Swing(Mathf.Lerp(18f, 80f, run) + Mathf.Max(0f, -s) * 15f);
            _target[(int)B.ForeArmR] = Swing(Mathf.Lerp(18f, 80f, run) + Mathf.Max(0f, s) * 15f);
            _target[(int)B.Spine] = Swing(Mathf.Lerp(3f, 13f, run), 0f, s * Mathf.Lerp(4f, 9f, run));
            _target[(int)B.Head] = Swing(-Mathf.Lerp(2f, 8f, run));
            hipDrop = (1f - Mathf.Abs(Mathf.Cos(_phase))) * Mathf.Lerp(0.025f, 0.07f, run) + run * 0.05f;
        }

        private static float MathUtilSmoothing(float dt, float tau) => tau <= 0f ? 1f : 1f - Mathf.Exp(-dt / tau);
    }
}
