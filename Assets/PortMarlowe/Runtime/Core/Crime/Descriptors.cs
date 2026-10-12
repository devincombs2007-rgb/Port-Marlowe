using System;

namespace PortMarlowe.Core.Crime
{
    /// <summary>Coarse colour families a bystander can plausibly report.</summary>
    public enum ColorFamily
    {
        Unknown = 0,
        Black,
        White,
        Grey,
        Red,
        Orange,
        Yellow,
        Green,
        Blue,
        Purple,
        Brown,
        Tan,
    }

    public enum BuildClass
    {
        Unknown = 0,
        Slim,
        Average,
        Heavy,
    }

    public enum HeightClass
    {
        Unknown = 0,
        Short,
        Average,
        Tall,
    }

    /// <summary>
    /// What a character actually looks like right now (worn clothing, not menu selection).
    /// Deliberately coarse; observers never receive identity, only these descriptors.
    /// Ethnicity and similar traits are intentionally absent: police response is driven by
    /// incidents and evidence, not demographic appearance.
    /// </summary>
    [Serializable]
    public struct Appearance : IEquatable<Appearance>
    {
        public ColorFamily Top;
        public ColorFamily Bottom;
        public BuildClass Build;
        public HeightClass Height;
        public bool Headwear;

        public Appearance(ColorFamily top, ColorFamily bottom, BuildClass build, HeightClass height, bool headwear)
        {
            Top = top;
            Bottom = bottom;
            Build = build;
            Height = height;
            Headwear = headwear;
        }

        public bool Equals(Appearance o) =>
            Top == o.Top && Bottom == o.Bottom && Build == o.Build && Height == o.Height && Headwear == o.Headwear;

        public override bool Equals(object obj) => obj is Appearance o && Equals(o);
        public override int GetHashCode() => ((int)Top * 31 + (int)Bottom) * 31 + (int)Build * 7 + (int)Height * 3 + (Headwear ? 1 : 0);
        public override string ToString() => $"{Top} top, {Bottom} bottoms, {Build}/{Height}{(Headwear ? ", headwear" : string.Empty)}";
    }

    [Serializable]
    public struct VehicleDescriptor
    {
        public string VehicleClass;
        public ColorFamily Color;
        public string Plate;

        public VehicleDescriptor(string vehicleClass, ColorFamily color, string plate)
        {
            VehicleClass = vehicleClass ?? string.Empty;
            Color = color;
            Plate = plate ?? string.Empty;
        }

        public bool IsEmpty => string.IsNullOrEmpty(VehicleClass) && Color == ColorFamily.Unknown && string.IsNullOrEmpty(Plate);
    }

    /// <summary>
    /// What an observer believes about a suspect. Each field carries its own confidence in [0,1];
    /// a field with zero confidence is unknown. Descriptions merge across reports.
    /// </summary>
    [Serializable]
    public sealed class SuspectDescription
    {
        public ColorFamily Top;
        public float TopConfidence;
        public ColorFamily Bottom;
        public float BottomConfidence;
        public BuildClass Build;
        public float BuildConfidence;
        public HeightClass Height;
        public float HeightConfidence;
        public bool Headwear;
        public float HeadwearConfidence;

        public string VehicleClass = string.Empty;
        public ColorFamily VehicleColor;
        public float VehicleConfidence;
        public string Plate = string.Empty;

        public SuspectDescription Clone() => (SuspectDescription)MemberwiseClone();

        public bool HasPerson => TopConfidence > 0f || BottomConfidence > 0f || BuildConfidence > 0f || HeightConfidence > 0f;
        public bool HasVehicle => VehicleConfidence > 0f || !string.IsNullOrEmpty(Plate);

        /// <summary>
        /// Merge another report into this description. Agreeing fields reinforce confidence;
        /// a disagreeing field keeps whichever value has more support.
        /// </summary>
        public void MergeFrom(SuspectDescription other)
        {
            if (other == null)
            {
                return;
            }

            MergeField(ref Top, ref TopConfidence, other.Top, other.TopConfidence);
            MergeField(ref Bottom, ref BottomConfidence, other.Bottom, other.BottomConfidence);
            MergeField(ref Build, ref BuildConfidence, other.Build, other.BuildConfidence);
            MergeField(ref Height, ref HeightConfidence, other.Height, other.HeightConfidence);
            MergeField(ref Headwear, ref HeadwearConfidence, other.Headwear, other.HeadwearConfidence);

            if (other.VehicleConfidence > 0f)
            {
                if (string.Equals(VehicleClass, other.VehicleClass, StringComparison.Ordinal) && VehicleColor == other.VehicleColor)
                {
                    VehicleConfidence = Combine(VehicleConfidence, other.VehicleConfidence);
                }
                else if (other.VehicleConfidence > VehicleConfidence)
                {
                    VehicleClass = other.VehicleClass;
                    VehicleColor = other.VehicleColor;
                    VehicleConfidence = other.VehicleConfidence;
                }
            }

            if (!string.IsNullOrEmpty(other.Plate))
            {
                Plate = other.Plate;
            }
        }

        /// <summary>Called when the suspect is seen in different clothing: old clothing fields lose authority.</summary>
        public void ReplacePersonFrom(Appearance seen, float confidence)
        {
            Top = seen.Top;
            TopConfidence = confidence;
            Bottom = seen.Bottom;
            BottomConfidence = confidence * 0.8f;
            Build = seen.Build;
            BuildConfidence = confidence * 0.7f;
            Height = seen.Height;
            HeightConfidence = confidence * 0.7f;
            Headwear = seen.Headwear;
            HeadwearConfidence = confidence * 0.6f;
        }

        public string Summary()
        {
            string person = HasPerson
                ? $"{Describe(Top, TopConfidence)} top, {Describe(Bottom, BottomConfidence)} bottoms"
                : "no clear description";
            if (HasVehicle)
            {
                string plate = string.IsNullOrEmpty(Plate) ? string.Empty : $" plate {Plate}";
                person += $"; vehicle {VehicleColor} {VehicleClass}{plate}";
            }

            return person;
        }

        private static string Describe(ColorFamily c, float conf) => conf <= 0f ? "unknown" : c.ToString().ToLowerInvariant();

        internal static float Combine(float a, float b) => 1f - (1f - a) * (1f - b);

        private static void MergeField<T>(ref T value, ref float confidence, T otherValue, float otherConfidence)
        {
            if (otherConfidence <= 0f)
            {
                return;
            }

            if (confidence <= 0f)
            {
                value = otherValue;
                confidence = otherConfidence;
                return;
            }

            if (Equals(value, otherValue))
            {
                confidence = Combine(confidence, otherConfidence);
            }
            else if (otherConfidence > confidence)
            {
                value = otherValue;
                confidence = otherConfidence - confidence * 0.5f;
            }
            else
            {
                confidence -= otherConfidence * 0.5f;
            }
        }
    }

    /// <summary>
    /// Scores how well a description matches someone's current appearance and vehicle.
    /// Recognition requires both a high score and actual visibility (owned by perception).
    /// </summary>
    public static class DescriptorMatcher
    {
        public const float WeightTop = 0.35f;
        public const float WeightBottom = 0.2f;
        public const float WeightBuild = 0.15f;
        public const float WeightHeight = 0.15f;
        public const float WeightHeadwear = 0.15f;

        /// <summary>Minimum total weighted confidence before a person-description is considered usable.</summary>
        public const float MinimumEvidence = 0.25f;

        public static float Match(SuspectDescription d, Appearance actual, VehicleDescriptor? currentVehicle)
        {
            if (d == null)
            {
                return 0f;
            }

            float vehicleScore = 0f;
            if (currentVehicle.HasValue && d.HasVehicle)
            {
                VehicleDescriptor v = currentVehicle.Value;
                if (!string.IsNullOrEmpty(d.Plate) && string.Equals(d.Plate, v.Plate, StringComparison.OrdinalIgnoreCase))
                {
                    vehicleScore = 0.95f;
                }
                else if (d.VehicleConfidence > 0f &&
                         string.Equals(d.VehicleClass, v.VehicleClass, StringComparison.Ordinal) &&
                         d.VehicleColor == v.Color)
                {
                    vehicleScore = 0.55f + 0.3f * d.VehicleConfidence;
                }
            }

            float known = 0f;
            float matched = 0f;
            Accumulate(WeightTop, d.TopConfidence, d.Top == actual.Top, ref known, ref matched);
            Accumulate(WeightBottom, d.BottomConfidence, d.Bottom == actual.Bottom, ref known, ref matched);
            Accumulate(WeightBuild, d.BuildConfidence, d.Build == actual.Build, ref known, ref matched);
            Accumulate(WeightHeight, d.HeightConfidence, d.Height == actual.Height, ref known, ref matched);
            Accumulate(WeightHeadwear, d.HeadwearConfidence, d.Headwear == actual.Headwear, ref known, ref matched);

            float personScore = 0f;
            if (known >= MinimumEvidence * 0.5f)
            {
                personScore = MathUtilClamp(matched / known);
                if (known < MinimumEvidence)
                {
                    // Thin evidence never reaches a confident identification.
                    personScore = Math.Min(personScore, 0.5f);
                }
            }

            return Math.Max(personScore, vehicleScore);
        }

        private static void Accumulate(float weight, float confidence, bool same, ref float known, ref float matched)
        {
            if (confidence <= 0f)
            {
                return;
            }

            float w = weight * confidence;
            known += w;
            if (same)
            {
                matched += w;
            }
        }

        private static float MathUtilClamp(float v) => v < 0f ? 0f : (v > 1f ? 1f : v);
    }

    /// <summary>
    /// Produces a bystander's imperfect description. Confidence falls with distance and poor
    /// visibility; low confidence can produce a wrong colour, which is how a clean getaway
    /// or a misleading report happens without scripted randomness.
    /// </summary>
    public static class ObservationModel
    {
        /// <summary>Beyond this distance a civilian cannot describe clothing at all.</summary>
        public const float MaxDescriptionDistance = 45f;

        public static SuspectDescription Observe(
            Appearance actual,
            VehicleDescriptor? vehicle,
            float distance,
            float visibility01,
            bool night,
            bool trainedObserver,
            DeterministicRandom rng)
        {
            float baseConfidence = MathUtil.Clamp01(1f - distance / MaxDescriptionDistance) * MathUtil.Clamp01(visibility01);
            if (night)
            {
                baseConfidence *= 0.7f;
            }

            if (trainedObserver)
            {
                baseConfidence = Math.Min(1f, baseConfidence * 1.35f + 0.1f);
            }

            var d = new SuspectDescription();
            if (baseConfidence <= 0.02f)
            {
                return d;
            }

            d.Top = Perceive(actual.Top, baseConfidence, rng);
            d.TopConfidence = baseConfidence;
            d.Bottom = Perceive(actual.Bottom, baseConfidence * 0.85f, rng);
            d.BottomConfidence = baseConfidence * 0.85f;
            d.Build = actual.Build;
            d.BuildConfidence = baseConfidence * 0.6f;
            d.Height = actual.Height;
            d.HeightConfidence = baseConfidence * 0.6f;
            d.Headwear = actual.Headwear;
            d.HeadwearConfidence = baseConfidence * 0.5f;

            if (vehicle.HasValue)
            {
                VehicleDescriptor v = vehicle.Value;
                d.VehicleClass = v.VehicleClass;
                d.VehicleColor = Perceive(v.Color, Math.Min(1f, baseConfidence + 0.2f), rng);
                d.VehicleConfidence = Math.Min(1f, baseConfidence + 0.2f);
                // Plates are only legible close up.
                if (distance < 12f && visibility01 > 0.6f && rng.Chance(trainedObserver ? 0.9f : 0.45f))
                {
                    d.Plate = v.Plate;
                }
            }

            return d;
        }

        private static ColorFamily Perceive(ColorFamily truth, float confidence, DeterministicRandom rng)
        {
            float wrongChance = (1f - confidence) * 0.45f;
            if (!rng.Chance(wrongChance))
            {
                return truth;
            }

            int count = Enum.GetValues(typeof(ColorFamily)).Length;
            int pick = rng.Range(1, count);
            return (ColorFamily)pick;
        }
    }
}
