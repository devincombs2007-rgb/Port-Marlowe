using PortMarlowe.Core;
using PortMarlowe.Core.Character;
using PortMarlowe.Core.Crime;
using UnityEngine;

namespace PortMarlowe.Game.Characters
{
    /// <summary>A worn outfit: the colours a viewer sees and the coarse descriptors police can report.</summary>
    public sealed class Outfit
    {
        public string Name;
        public Color Top;
        public Color Bottom;
        public Color Shoes;
        public Color Accent;
        public bool Headwear;
        public Color HeadwearColor;
        public ColorFamily TopFamily;
        public ColorFamily BottomFamily;
    }

    /// <summary>Static identity data for a playable protagonist (see Docs/Characters.md for full sheets).</summary>
    public sealed class ProtagonistProfile
    {
        public StableId Id;
        public string FullName;
        public string ShortName;
        public float Height;
        public float ShoulderWidth;
        public float Bulk;
        public BuildClass Build;
        public HeightClass HeightClass;
        public Color Skin;
        public Color Hair;
        public bool LongHair;
        public int StartingCash;
        public LocomotionTuning Locomotion;
        public Outfit[] Outfits;

        public Appearance AppearanceFor(int outfitIndex)
        {
            var o = Outfits[Mathf.Clamp(outfitIndex, 0, Outfits.Length - 1)];
            return new Appearance(o.TopFamily, o.BottomFamily, Build, HeightClass, o.Headwear);
        }
    }

    public static class Roster
    {
        public static readonly StableId RhysId = new StableId("char.rhys");
        public static readonly StableId LenaId = new StableId("char.lena");

        public static ProtagonistProfile Rhys()
        {
            var loco = new LocomotionTuning
            {
                WalkSpeed = 1.5f,
                JogSpeed = 3.6f,
                SprintSpeed = 6.6f,
                Acceleration = 13.5f,
                Deceleration = 18f,
            };
            return new ProtagonistProfile
            {
                Id = RhysId,
                FullName = "Rhys Calloway",
                ShortName = "Rhys",
                Height = 1.85f,
                ShoulderWidth = 0.46f,
                Bulk = 1.08f,
                Build = BuildClass.Average,
                HeightClass = HeightClass.Tall,
                Skin = new Color(0.72f, 0.55f, 0.43f),
                Hair = new Color(0.12f, 0.1f, 0.09f),
                LongHair = false,
                StartingCash = 340,
                Locomotion = loco,
                Outfits = new[]
                {
                    new Outfit { Name = "Work jacket", Top = new Color(0.27f, 0.28f, 0.29f), Bottom = new Color(0.14f, 0.17f, 0.24f), Shoes = new Color(0.2f, 0.15f, 0.1f), Accent = new Color(0.5f, 0.45f, 0.35f), TopFamily = ColorFamily.Grey, BottomFamily = ColorFamily.Blue },
                    new Outfit { Name = "Field shirt", Top = new Color(0.33f, 0.37f, 0.22f), Bottom = new Color(0.62f, 0.54f, 0.40f), Shoes = new Color(0.32f, 0.22f, 0.14f), Accent = new Color(0.25f, 0.27f, 0.18f), TopFamily = ColorFamily.Green, BottomFamily = ColorFamily.Tan },
                    new Outfit { Name = "Black hoodie and cap", Top = new Color(0.08f, 0.08f, 0.09f), Bottom = new Color(0.36f, 0.37f, 0.38f), Shoes = new Color(0.85f, 0.85f, 0.83f), Accent = new Color(0.15f, 0.15f, 0.16f), Headwear = true, HeadwearColor = new Color(0.55f, 0.12f, 0.1f), TopFamily = ColorFamily.Black, BottomFamily = ColorFamily.Grey },
                },
            };
        }

        public static ProtagonistProfile Lena()
        {
            var loco = new LocomotionTuning
            {
                WalkSpeed = 1.45f,
                JogSpeed = 3.5f,
                SprintSpeed = 6.5f,
                Acceleration = 15f,
                Deceleration = 19f,
                TurnRateJog = 580f,
            };
            return new ProtagonistProfile
            {
                Id = LenaId,
                FullName = "Lena Duarte",
                ShortName = "Lena",
                Height = 1.68f,
                ShoulderWidth = 0.38f,
                Bulk = 0.92f,
                Build = BuildClass.Slim,
                HeightClass = HeightClass.Average,
                Skin = new Color(0.62f, 0.45f, 0.34f),
                Hair = new Color(0.16f, 0.1f, 0.07f),
                LongHair = true,
                StartingCash = 120,
                Locomotion = loco,
                Outfits = new[]
                {
                    new Outfit { Name = "Oxblood bomber", Top = new Color(0.42f, 0.1f, 0.12f), Bottom = new Color(0.07f, 0.07f, 0.08f), Shoes = new Color(0.9f, 0.9f, 0.88f), Accent = new Color(0.75f, 0.62f, 0.2f), TopFamily = ColorFamily.Red, BottomFamily = ColorFamily.Black },
                    new Outfit { Name = "Denim jacket", Top = new Color(0.22f, 0.33f, 0.5f), Bottom = new Color(0.45f, 0.46f, 0.47f), Shoes = new Color(0.12f, 0.12f, 0.12f), Accent = new Color(0.9f, 0.9f, 0.88f), TopFamily = ColorFamily.Blue, BottomFamily = ColorFamily.Grey },
                    new Outfit { Name = "Rain jacket and beanie", Top = new Color(0.76f, 0.58f, 0.13f), Bottom = new Color(0.12f, 0.15f, 0.25f), Shoes = new Color(0.25f, 0.18f, 0.12f), Accent = new Color(0.2f, 0.2f, 0.2f), Headwear = true, HeadwearColor = new Color(0.18f, 0.2f, 0.24f), TopFamily = ColorFamily.Yellow, BottomFamily = ColorFamily.Blue },
                },
            };
        }

        public static Color ColorOf(ColorFamily c)
        {
            switch (c)
            {
                case ColorFamily.Black: return new Color(0.07f, 0.07f, 0.08f);
                case ColorFamily.White: return new Color(0.88f, 0.88f, 0.86f);
                case ColorFamily.Grey: return new Color(0.42f, 0.43f, 0.44f);
                case ColorFamily.Red: return new Color(0.55f, 0.12f, 0.12f);
                case ColorFamily.Orange: return new Color(0.78f, 0.4f, 0.12f);
                case ColorFamily.Yellow: return new Color(0.8f, 0.68f, 0.18f);
                case ColorFamily.Green: return new Color(0.2f, 0.4f, 0.22f);
                case ColorFamily.Blue: return new Color(0.16f, 0.27f, 0.5f);
                case ColorFamily.Purple: return new Color(0.36f, 0.2f, 0.45f);
                case ColorFamily.Brown: return new Color(0.36f, 0.24f, 0.14f);
                case ColorFamily.Tan: return new Color(0.66f, 0.56f, 0.40f);
                default: return Color.gray;
            }
        }

        /// <summary>Random civilian outfit from the shared colour families (deterministic per seed).</summary>
        public static Outfit CivilianOutfit(DeterministicRandom rng)
        {
            var tops = new[] { ColorFamily.White, ColorFamily.Grey, ColorFamily.Black, ColorFamily.Blue, ColorFamily.Red, ColorFamily.Green, ColorFamily.Yellow, ColorFamily.Orange, ColorFamily.Purple, ColorFamily.Tan };
            var bottoms = new[] { ColorFamily.Blue, ColorFamily.Black, ColorFamily.Grey, ColorFamily.Tan, ColorFamily.Brown, ColorFamily.White };
            var top = tops[rng.Range(0, tops.Length)];
            var bottom = bottoms[rng.Range(0, bottoms.Length)];
            float jitter = rng.Range(-0.06f, 0.06f);
            Color Jit(Color c) => new Color(Mathf.Clamp01(c.r + jitter), Mathf.Clamp01(c.g + jitter), Mathf.Clamp01(c.b + jitter));
            bool hat = rng.Chance(0.15f);
            return new Outfit
            {
                Name = "Civilian",
                Top = Jit(ColorOf(top)),
                Bottom = Jit(ColorOf(bottom)),
                Shoes = rng.Chance(0.5f) ? new Color(0.1f, 0.1f, 0.1f) : new Color(0.85f, 0.85f, 0.83f),
                Accent = Jit(ColorOf(tops[rng.Range(0, tops.Length)])),
                Headwear = hat,
                HeadwearColor = ColorOf(tops[rng.Range(0, tops.Length)]),
                TopFamily = top,
                BottomFamily = bottom,
            };
        }

        public static Outfit PoliceUniform() => new Outfit
        {
            Name = "Saltmarket PD",
            Top = new Color(0.1f, 0.14f, 0.24f),
            Bottom = new Color(0.08f, 0.1f, 0.16f),
            Shoes = new Color(0.05f, 0.05f, 0.05f),
            Accent = new Color(0.75f, 0.68f, 0.32f),
            Headwear = true,
            HeadwearColor = new Color(0.08f, 0.1f, 0.18f),
            TopFamily = ColorFamily.Blue,
            BottomFamily = ColorFamily.Blue,
        };

        public static readonly Color[] SkinTones =
        {
            new Color(0.93f, 0.78f, 0.66f), new Color(0.84f, 0.66f, 0.52f), new Color(0.72f, 0.54f, 0.40f),
            new Color(0.58f, 0.41f, 0.29f), new Color(0.44f, 0.30f, 0.21f), new Color(0.32f, 0.21f, 0.15f),
        };

        public static readonly Color[] HairColors =
        {
            new Color(0.08f, 0.07f, 0.06f), new Color(0.22f, 0.14f, 0.08f), new Color(0.45f, 0.32f, 0.18f),
            new Color(0.65f, 0.55f, 0.38f), new Color(0.6f, 0.6f, 0.6f),
        };
    }
}
