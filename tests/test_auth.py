import base64

import pytest
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa

from kalshi_bot.kalshi_client import KalshiAuth


@pytest.fixture(scope="module")
def key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _verify(pub, sig_b64, message):
    pub.verify(
        base64.b64decode(sig_b64),
        message.encode(),
        padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.DIGEST_LENGTH),
        hashes.SHA256(),
    )


def test_headers_sign_timestamp_method_and_path_without_query(key):
    auth = KalshiAuth("key-123", key)
    h = auth.headers("get", "/trade-api/v2/portfolio/orders?status=resting", timestamp_ms=1700000000000)
    assert h["KALSHI-ACCESS-KEY"] == "key-123"
    assert h["KALSHI-ACCESS-TIMESTAMP"] == "1700000000000"
    _verify(key.public_key(), h["KALSHI-ACCESS-SIGNATURE"], "1700000000000GET/trade-api/v2/portfolio/orders")
    with pytest.raises(InvalidSignature):
        _verify(key.public_key(), h["KALSHI-ACCESS-SIGNATURE"],
                "1700000000000GET/trade-api/v2/portfolio/orders?status=resting")


def test_from_pem_roundtrip(key):
    pem = key.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.TraditionalOpenSSL, serialization.NoEncryption()
    )
    auth = KalshiAuth.from_pem("k", pem.decode())
    sig = auth.sign("hello")
    _verify(key.public_key(), sig, "hello")
