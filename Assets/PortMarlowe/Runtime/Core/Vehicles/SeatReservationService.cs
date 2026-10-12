using System;
using System.Collections.Generic;

namespace PortMarlowe.Core.Vehicles
{
    public enum SeatState
    {
        Free = 0,
        /// <summary>Claimed by someone walking to the door; others must pick another seat.</summary>
        Reserved = 1,
        Occupied = 2,
    }

    public enum SeatResult
    {
        Ok = 0,
        UnknownVehicle,
        InvalidSeat,
        SeatTaken,
        AlreadySeatedElsewhere,
        NotReservedByRequester,
        NotOccupant,
    }

    /// <summary>
    /// SeatReservationService: single authority for vehicle occupancy shared by the player, partner,
    /// civilians and police. Seat 0 is always the driver. Reservations expire so an interrupted
    /// approach cannot block a seat forever.
    /// </summary>
    public sealed class SeatReservationService
    {
        public const double ReservationTimeoutSeconds = 8.0;

        private sealed class Seat
        {
            public SeatState State;
            public EntityId Holder;
            public double ReservedAt;
        }

        private readonly Dictionary<EntityId, Seat[]> _vehicles = new Dictionary<EntityId, Seat[]>();
        private readonly Dictionary<EntityId, (EntityId vehicle, int seat)> _byOccupant = new Dictionary<EntityId, (EntityId, int)>();
        private readonly EventLog _log;

        public SeatReservationService(EventLog log = null)
        {
            _log = log;
        }

        public event Action<EntityId, int, EntityId> SeatOccupied;
        public event Action<EntityId, int, EntityId> SeatVacated;

        public void RegisterVehicle(EntityId vehicle, int seatCount)
        {
            if (seatCount < 1)
            {
                throw new ArgumentOutOfRangeException(nameof(seatCount));
            }

            if (_vehicles.ContainsKey(vehicle))
            {
                return;
            }

            var seats = new Seat[seatCount];
            for (int i = 0; i < seatCount; i++)
            {
                seats[i] = new Seat();
            }

            _vehicles.Add(vehicle, seats);
        }

        /// <summary>Removes a vehicle; anyone inside is released (caller must place them safely first).</summary>
        public void UnregisterVehicle(EntityId vehicle)
        {
            if (!_vehicles.TryGetValue(vehicle, out var seats))
            {
                return;
            }

            for (int i = 0; i < seats.Length; i++)
            {
                if (!seats[i].Holder.IsNone)
                {
                    _byOccupant.Remove(seats[i].Holder);
                }
            }

            _vehicles.Remove(vehicle);
        }

        public bool IsRegistered(EntityId vehicle) => _vehicles.ContainsKey(vehicle);

        public int SeatCount(EntityId vehicle) => _vehicles.TryGetValue(vehicle, out var s) ? s.Length : 0;

        public SeatState GetState(EntityId vehicle, int seat, out EntityId holder)
        {
            holder = EntityId.None;
            if (!_vehicles.TryGetValue(vehicle, out var seats) || seat < 0 || seat >= seats.Length)
            {
                return SeatState.Free;
            }

            holder = seats[seat].Holder;
            return seats[seat].State;
        }

        /// <summary>The seat (reserved or occupied) held by <paramref name="who"/>, if any.</summary>
        public bool TryGetSeatOf(EntityId who, out EntityId vehicle, out int seat)
        {
            if (_byOccupant.TryGetValue(who, out var v))
            {
                vehicle = v.vehicle;
                seat = v.seat;
                return true;
            }

            vehicle = EntityId.None;
            seat = -1;
            return false;
        }

        public bool IsSeated(EntityId who) =>
            TryGetSeatOf(who, out var v, out int s) && GetState(v, s, out _) == SeatState.Occupied;

        public EntityId Driver(EntityId vehicle)
        {
            return GetState(vehicle, 0, out var holder) == SeatState.Occupied ? holder : EntityId.None;
        }

        public int OccupantCount(EntityId vehicle)
        {
            if (!_vehicles.TryGetValue(vehicle, out var seats))
            {
                return 0;
            }

            int n = 0;
            foreach (var s in seats)
            {
                if (s.State == SeatState.Occupied)
                {
                    n++;
                }
            }

            return n;
        }

        /// <summary>
        /// First free seat. Passenger preference skips the driver seat when another seat is free;
        /// <paramref name="avoid"/> lets the partner steer clear of the seat the player is heading to.
        /// </summary>
        public int FindFreeSeat(EntityId vehicle, bool preferPassenger, int avoid = -1)
        {
            if (!_vehicles.TryGetValue(vehicle, out var seats))
            {
                return -1;
            }

            if (preferPassenger)
            {
                for (int i = 1; i < seats.Length; i++)
                {
                    if (i != avoid && seats[i].State == SeatState.Free)
                    {
                        return i;
                    }
                }
            }

            for (int i = 0; i < seats.Length; i++)
            {
                if (i != avoid && seats[i].State == SeatState.Free)
                {
                    return i;
                }
            }

            return -1;
        }

        public SeatResult TryReserve(EntityId vehicle, int seat, EntityId who, double now)
        {
            var check = Validate(vehicle, seat, out var seats);
            if (check != SeatResult.Ok)
            {
                return check;
            }

            if (_byOccupant.TryGetValue(who, out var existing))
            {
                if (existing.vehicle == vehicle && existing.seat == seat)
                {
                    seats[seat].ReservedAt = now;
                    return SeatResult.Ok;
                }

                return SeatResult.AlreadySeatedElsewhere;
            }

            if (seats[seat].State != SeatState.Free)
            {
                return SeatResult.SeatTaken;
            }

            seats[seat].State = SeatState.Reserved;
            seats[seat].Holder = who;
            seats[seat].ReservedAt = now;
            _byOccupant[who] = (vehicle, seat);
            return SeatResult.Ok;
        }

        /// <summary>Commit a reserved seat (the committed transfer point of the entry sequence).</summary>
        public SeatResult Occupy(EntityId vehicle, int seat, EntityId who)
        {
            var check = Validate(vehicle, seat, out var seats);
            if (check != SeatResult.Ok)
            {
                return check;
            }

            if (seats[seat].State != SeatState.Reserved || seats[seat].Holder != who)
            {
                return seats[seat].State == SeatState.Occupied && seats[seat].Holder == who ? SeatResult.Ok : SeatResult.NotReservedByRequester;
            }

            seats[seat].State = SeatState.Occupied;
            _log?.Record(0, LogCategory.Vehicle, who, $"occupied {vehicle} seat {seat}");
            SeatOccupied?.Invoke(vehicle, seat, who);
            return SeatResult.Ok;
        }

        /// <summary>Reserve and occupy in one step (load restore, scripted placement).</summary>
        public SeatResult PlaceDirect(EntityId vehicle, int seat, EntityId who, double now)
        {
            var r = TryReserve(vehicle, seat, who, now);
            return r == SeatResult.Ok ? Occupy(vehicle, seat, who) : r;
        }

        /// <summary>Release whatever seat <paramref name="who"/> holds (cancelled approach or completed exit).</summary>
        public SeatResult Release(EntityId who)
        {
            if (!_byOccupant.TryGetValue(who, out var held))
            {
                return SeatResult.NotOccupant;
            }

            _byOccupant.Remove(who);
            if (_vehicles.TryGetValue(held.vehicle, out var seats))
            {
                bool wasOccupied = seats[held.seat].State == SeatState.Occupied;
                seats[held.seat].State = SeatState.Free;
                seats[held.seat].Holder = EntityId.None;
                if (wasOccupied)
                {
                    SeatVacated?.Invoke(held.vehicle, held.seat, who);
                }
            }

            return SeatResult.Ok;
        }

        /// <summary>Expire reservations that were never committed (blocked door, abandoned approach).</summary>
        public int ExpireReservations(double now)
        {
            var expired = new List<EntityId>();
            foreach (var kv in _vehicles)
            {
                foreach (var seat in kv.Value)
                {
                    if (seat.State == SeatState.Reserved && now - seat.ReservedAt > ReservationTimeoutSeconds)
                    {
                        expired.Add(seat.Holder);
                    }
                }
            }

            foreach (var who in expired)
            {
                Release(who);
            }

            return expired.Count;
        }

        public IEnumerable<EntityId> Occupants(EntityId vehicle)
        {
            if (!_vehicles.TryGetValue(vehicle, out var seats))
            {
                yield break;
            }

            foreach (var s in seats)
            {
                if (s.State == SeatState.Occupied)
                {
                    yield return s.Holder;
                }
            }
        }

        public void Clear()
        {
            _vehicles.Clear();
            _byOccupant.Clear();
        }

        private SeatResult Validate(EntityId vehicle, int seat, out Seat[] seats)
        {
            if (!_vehicles.TryGetValue(vehicle, out seats))
            {
                return SeatResult.UnknownVehicle;
            }

            return seat < 0 || seat >= seats.Length ? SeatResult.InvalidSeat : SeatResult.Ok;
        }
    }
}
