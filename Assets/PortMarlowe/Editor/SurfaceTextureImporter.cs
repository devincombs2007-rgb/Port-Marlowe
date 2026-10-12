using UnityEditor;

namespace PortMarlowe.EditorTools
{
    /// <summary>
    /// Import rules for fetched CC0 surface sets (Resources/PM_Surfaces/&lt;role&gt;/): normal maps as
    /// normal maps, packed masks as linear data, 2K cap and anisotropic filtering for ground views.
    /// </summary>
    public sealed class SurfaceTextureImporter : AssetPostprocessor
    {
        private void OnPreprocessTexture()
        {
            if (!assetPath.Replace('\\', '/').Contains("/Resources/PM_Surfaces/"))
            {
                return;
            }

            var importer = (TextureImporter)assetImporter;
            string file = System.IO.Path.GetFileNameWithoutExtension(assetPath);
            importer.mipmapEnabled = true;
            importer.anisoLevel = 8;
            importer.maxTextureSize = 2048;
            importer.textureCompression = TextureImporterCompression.CompressedHQ;
            importer.streamingMipmaps = true;
            importer.wrapMode = UnityEngine.TextureWrapMode.Repeat;
            switch (file)
            {
                case "normal":
                    importer.textureType = TextureImporterType.NormalMap;
                    break;
                case "mask":
                    importer.textureType = TextureImporterType.Default;
                    importer.sRGBTexture = false;
                    importer.alphaSource = TextureImporterAlphaSource.FromInput;
                    break;
                default:
                    importer.textureType = TextureImporterType.Default;
                    importer.sRGBTexture = true;
                    break;
            }
        }
    }
}
