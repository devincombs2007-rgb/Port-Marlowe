using System;
using System.Collections.Generic;

namespace PortMarlowe.Core.Economy
{
    /// <summary>
    /// Records committed transaction keys so rewards, fines and purchases apply exactly once even
    /// when an event is replayed (checkpoint retry, load, duplicate trigger). Persisted with the save.
    /// </summary>
    public sealed class IdempotencyLedger
    {
        private readonly HashSet<string> _keys = new HashSet<string>(StringComparer.Ordinal);

        public int Count => _keys.Count;

        public bool Contains(string key) => key != null && _keys.Contains(key);

        /// <summary>Returns true if the key is new (the caller should apply the effect).</summary>
        public bool TryCommit(string key)
        {
            if (string.IsNullOrEmpty(key))
            {
                throw new ArgumentException("Idempotency keys are mandatory for persistent effects.", nameof(key));
            }

            return _keys.Add(key);
        }

        public IEnumerable<string> Keys => _keys;

        public void Restore(IEnumerable<string> keys)
        {
            _keys.Clear();
            foreach (var k in keys)
            {
                if (!string.IsNullOrEmpty(k))
                {
                    _keys.Add(k);
                }
            }
        }
    }

    public enum WalletResult
    {
        Ok = 0,
        Duplicate,
        InsufficientFunds,
        InvalidAmount,
    }

    /// <summary>Cash owned by one protagonist (whole dollars). Cash never duplicates through switching.</summary>
    public sealed class Wallet
    {
        private readonly IdempotencyLedger _ledger;

        public Wallet(StableId owner, int startingCash, IdempotencyLedger ledger)
        {
            Owner = owner;
            Cash = Math.Max(0, startingCash);
            _ledger = ledger ?? throw new ArgumentNullException(nameof(ledger));
        }

        public StableId Owner { get; }
        public int Cash { get; private set; }

        public WalletResult Credit(int amount, string transactionKey)
        {
            if (amount <= 0)
            {
                return WalletResult.InvalidAmount;
            }

            if (!_ledger.TryCommit(Owner.Value + ":" + transactionKey))
            {
                return WalletResult.Duplicate;
            }

            Cash += amount;
            return WalletResult.Ok;
        }

        public WalletResult Debit(int amount, string transactionKey, bool allowPartial = false)
        {
            if (amount <= 0)
            {
                return WalletResult.InvalidAmount;
            }

            if (_ledger.Contains(Owner.Value + ":" + transactionKey))
            {
                return WalletResult.Duplicate;
            }

            if (Cash < amount && !allowPartial)
            {
                return WalletResult.InsufficientFunds;
            }

            _ledger.TryCommit(Owner.Value + ":" + transactionKey);
            Cash = Math.Max(0, Cash - amount);
            return WalletResult.Ok;
        }

        /// <summary>Move cash between protagonists as one transaction (both sides or neither).</summary>
        public static WalletResult Transfer(Wallet from, Wallet to, int amount, string transactionKey)
        {
            if (from == null || to == null || amount <= 0 || from == to)
            {
                return WalletResult.InvalidAmount;
            }

            if (from._ledger.Contains(from.Owner.Value + ":" + transactionKey + ":out"))
            {
                return WalletResult.Duplicate;
            }

            if (from.Cash < amount)
            {
                return WalletResult.InsufficientFunds;
            }

            from._ledger.TryCommit(from.Owner.Value + ":" + transactionKey + ":out");
            to._ledger.TryCommit(to.Owner.Value + ":" + transactionKey + ":in");
            from.Cash -= amount;
            to.Cash += amount;
            return WalletResult.Ok;
        }

        /// <summary>Load restore only.</summary>
        public void RestoreCash(int cash) => Cash = Math.Max(0, cash);
    }
}
