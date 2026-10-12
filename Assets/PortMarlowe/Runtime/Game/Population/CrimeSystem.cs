using PortMarlowe.Core;
using PortMarlowe.Core.Crime;
using PortMarlowe.Game.Audio;
using PortMarlowe.Game.Characters;
using PortMarlowe.Game.Vehicles;
using UnityEngine;

namespace PortMarlowe.Game.Population
{
    /// <summary>
    /// Records crimes committed by protagonists and delivers them to whoever can actually perceive
    /// them: civilians (who may call it in) and on-duty officers (instant radio report). Unobserved
    /// crimes create an incident record but summon nobody.
    /// </summary>
    public sealed class CrimeSystem
    {
        private readonly GameSession _s;

        public CrimeSystem(GameSession session)
        {
            _s = session;
        }

        public int LastWitnessCount { get; private set; }

        public Incident Commit(CrimeType type, Protagonist offender, Vector3 position, StableId victim, VehicleEntity vehicle)
        {
            var incident = _s.Incidents.CreateIncident(type, position.ToCore(), _s.Now, offender.Id, victim,
                vehicle != null ? vehicle.Descriptor : (VehicleDescriptor?)null);
            offender.Record.RecordIncident(type);
            var stimulus = new CrimeStimulus
            {
                Incident = incident,
                Offender = offender,
                Position = position,
                AudibleRadius = CrimeRules.AudibleRadius(type),
                OffenderVehicle = vehicle != null ? vehicle.transform : null,
            };

            int witnesses = 0;
            if (_s.Pedestrians != null)
            {
                foreach (var c in _s.Pedestrians.Active)
                {
                    if (c != null && Vector3.Distance(c.transform.position, position) < 60f && c.Perceive(stimulus))
                    {
                        witnesses++;
                    }
                }
            }

            if (_s.Police != null)
            {
                witnesses += _s.Police.OnCrimeCommitted(stimulus);
            }

            LastWitnessCount = witnesses;
            return incident;
        }

        public void CommitVehicleBreakIn(Protagonist p, VehicleEntity v)
        {
            v.TriggerAlarm(20f);
            _s.Audio?.PlayOneShot(SfxKind.Glass, v.transform.position);
            Commit(CrimeType.VehicleBreakIn, p, v.transform.position, StableId.None, null);
        }

        public void CommitAssault(Protagonist p, Civilian victim)
        {
            var incident = Commit(CrimeType.Assault, p, victim.transform.position, victim.Body.Id, p.Vehicle);
            victim.Knockdown(p.transform.position);
            victim.RecordAsVictim(incident, p);
        }

        public void CommitHitPedestrian(Protagonist driver, VehicleEntity v, Civilian victim)
        {
            var incident = Commit(CrimeType.HitPedestrian, driver, victim.transform.position, victim.Body.Id, v);
            victim.Knockdown(v.transform.position);
            victim.RecordAsVictim(incident, driver);
        }
    }
}
