using PortMarlowe.Core.Interaction;
using PortMarlowe.Core.Police;
using PortMarlowe.Game.Characters;
using PortMarlowe.Game.Interaction;
using PortMarlowe.Game.Law;
using PortMarlowe.Game.Population;
using UnityEngine;
using UnityEngine.AI;

namespace PortMarlowe.Game.Property
{
    /// <summary>
    /// The Tern Street walk-up: a door that opens for protagonists (and stays shut for everyone else,
    /// via a carving nav obstacle), a bed to rest (bounded time skip + autosave) and a wardrobe to
    /// change clothes. Clothing changes only matter to police when nobody is watching.
    /// </summary>
    public sealed class SafehouseController : MonoBehaviour
    {
        public const float DoorOpenRadius = 2.4f;
        public const float RestHours = 6f;

        private GameSession _s;
        private Transform _hinge;
        private NavMeshObstacle _obstacle;
        private float _open;
        private float _holdOpenUntil;

        public Bounds Interior { get; private set; }
        public bool DoorOpen => _open > 0.6f;

        public void Init(GameSession session)
        {
            _s = session;
            var d = session.District;
            _hinge = d.SafehouseDoorHinge;
            Interior = d.SafehouseInterior;
            var panel = _hinge.GetChild(0);
            _obstacle = panel.gameObject.AddComponent<NavMeshObstacle>();
            _obstacle.shape = NavMeshObstacleShape.Box;
            _obstacle.size = Vector3.one;
            _obstacle.carving = true;
            _obstacle.carveOnlyStationary = false;

            AddInteractable("Bed", d.SafehouseBed, InteractionPriority.Service, 1.6f,
                p => $"Rest {RestHours:0}h and save",
                p => RestBlockedReason(),
                Rest);
            AddInteractable("Wardrobe", d.SafehouseWardrobe, InteractionPriority.Service, 1.5f,
                p => $"Change clothes ({p.Profile.Outfits[(p.OutfitIndex + 1) % p.Profile.Outfits.Length].Name})",
                p => null,
                ChangeClothes);
        }

        public bool IsInside(Vector3 p) => Interior.Contains(p + Vector3.up * 0.5f);

        public void HoldOpen(float seconds) => _holdOpenUntil = Time.time + seconds;

        private void Update()
        {
            if (_s == null)
            {
                return;
            }

            bool someoneNear = false;
            Vector3 door = _hinge.position;
            foreach (var p in _s.Protagonists.Values)
            {
                if (p.State == ProtagonistState.OnFoot && Vector3.Distance(p.transform.position, door) < DoorOpenRadius)
                {
                    someoneNear = true;
                }
            }

            bool wantOpen = someoneNear || Time.time < _holdOpenUntil;
            float before = _open;
            _open = Mathf.MoveTowards(_open, wantOpen ? 1f : 0f, Time.deltaTime / 0.45f);
            _hinge.localRotation = Quaternion.Euler(0f, -100f * Mathf.SmoothStep(0f, 1f, _open), 0f);
            if ((before <= 0f) != (_open <= 0f) && _s.Audio != null)
            {
                _s.Audio.PlayOneShot(Audio.SfxKind.Door, door, 0.6f);
            }

            // Closed door blocks agents (police, civilians) through carving; open door does not.
            _obstacle.enabled = _open < 0.05f;
        }

        private string RestBlockedReason()
        {
            foreach (var p in _s.Protagonists.Values)
            {
                var heat = HeatEvaluator.Evaluate(p.Id, p.Appearance, p.VehicleDescriptor, _s.Incidents, _s.Dispatch, _s.Now);
                if (heat.Level >= HeatLevel.Witnessed)
                {
                    return "Can't rest with police attention on you.";
                }
            }

            return null;
        }

        private void Rest(Protagonist p)
        {
            _s.Clock.SkipGameHours(RestHours);
            // Simulation timers (search, recognition windows) advance consistently with the skip.
            _s.Incidents.Tick(_s.Now);
            _s.Dispatch.Tick(_s.Now);
            _s.Save.RequestSave(SaveSystem.SaveService.AutosaveSlot, "rest");
            _s.Notify($"Rested {RestHours:0} hours. Saved.");
        }

        private void ChangeClothes(Protagonist p)
        {
            int next = (p.OutfitIndex + 1) % p.Profile.Outfits.Length;
            p.SetOutfit(next);
            bool observed = ObservedByPolice(p);
            _s.Notify(observed
                ? $"Changed into {p.CurrentOutfit.Name}. An officer saw you change - it won't help."
                : $"Changed into {p.CurrentOutfit.Name}.");
        }

        private bool ObservedByPolice(Protagonist p)
        {
            if (_s.Police == null)
            {
                return false;
            }

            foreach (var u in _s.Police.Units)
            {
                if (u.Officer == null)
                {
                    continue;
                }

                if (Perception.Visibility(u.Officer.Eye, u.Officer.transform.forward, p.ChestPosition, PoliceDispatcher.OfficerSightRange, PoliceDispatcher.OfficerFov, 0f, null) > 0f)
                {
                    return true;
                }
            }

            return false;
        }

        private void AddInteractable(string name, Vector3 position, InteractionPriority priority, float maxDistance,
            System.Func<Protagonist, string> label, System.Func<Protagonist, string> unavailable, System.Action<Protagonist> activate)
        {
            var go = new GameObject(name);
            go.layer = GameLayers.Interactable;
            go.transform.SetParent(transform, false);
            go.transform.position = position + Vector3.up * 0.5f;
            var it = go.AddComponent<Interactable>();
            it.Priority = priority;
            it.MaxDistance = maxDistance;
            it.Label = label;
            it.Unavailable = unavailable;
            it.Activate = activate;
        }
    }
}
