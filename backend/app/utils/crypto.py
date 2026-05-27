"""
Utilitários de criptografia para proteção de credenciais sensíveis.
Usa Fernet (AES-128-CBC + HMAC-SHA256) da biblioteca cryptography.
"""
import base64
import os
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


def generate_key() -> str:
    """Gera uma nova chave Fernet aleatória em base64."""
    key = Fernet.generate_key()
    return key.decode("utf-8")


def derive_key_from_password(password: str, salt: Optional[bytes] = None) -> tuple[str, str]:
    """
    Deriva uma chave Fernet a partir de uma senha usando PBKDF2.

    Returns:
        Tupla (chave_base64, salt_hex)
    """
    if salt is None:
        salt = os.urandom(16)

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=480000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(password.encode("utf-8")))
    return key.decode("utf-8"), salt.hex()


class CredentialEncryptor:
    """
    Encriptador de credenciais usando Fernet.

    Uso:
        encryptor = CredentialEncryptor(key)
        encrypted = encryptor.encrypt("minha_senha_secreta")
        original = encryptor.decrypt(encrypted)
    """

    def __init__(self, key: Optional[str] = None) -> None:
        """
        Inicializa com uma chave Fernet.

        Args:
            key: Chave Fernet em base64. Se None, gera automaticamente.
        """
        if key:
            self._fernet = Fernet(key.encode("utf-8") if isinstance(key, str) else key)
        else:
            new_key = Fernet.generate_key()
            self._fernet = Fernet(new_key)
            self._generated_key = new_key.decode("utf-8")

    def encrypt(self, plaintext: str) -> str:
        """
        Encripta um texto simples.

        Args:
            plaintext: Texto a ser encriptado

        Returns:
            Texto encriptado em base64
        """
        if not plaintext:
            return ""
        encrypted = self._fernet.encrypt(plaintext.encode("utf-8"))
        return encrypted.decode("utf-8")

    def decrypt(self, ciphertext: str) -> str:
        """
        Decripta um texto encriptado.

        Args:
            ciphertext: Texto encriptado em base64

        Returns:
            Texto original

        Raises:
            InvalidToken: Se o token for inválido ou corrompido
            ValueError: Se o texto estiver vazio
        """
        if not ciphertext:
            return ""
        try:
            decrypted = self._fernet.decrypt(ciphertext.encode("utf-8"))
            return decrypted.decode("utf-8")
        except InvalidToken as e:
            raise ValueError(f"Token de encriptação inválido: {e}") from e

    def rotate_key(self, new_key: str, ciphertext: str) -> str:
        """
        Re-encripta um valor com uma nova chave (rotação de chave).

        Args:
            new_key: Nova chave Fernet em base64
            ciphertext: Texto encriptado com a chave atual

        Returns:
            Texto re-encriptado com a nova chave
        """
        plaintext = self.decrypt(ciphertext)
        new_fernet = Fernet(new_key.encode("utf-8") if isinstance(new_key, str) else new_key)
        return new_fernet.encrypt(plaintext.encode("utf-8")).decode("utf-8")


def mask_sensitive(value: str, visible_chars: int = 4) -> str:
    """
    Mascara um valor sensível para exibição em logs.

    Args:
        value: Valor a mascarar
        visible_chars: Número de caracteres visíveis no início

    Returns:
        Valor mascarado (ex: "abcd****")
    """
    if not value:
        return "***"
    if len(value) <= visible_chars:
        return "*" * len(value)
    return value[:visible_chars] + "*" * (len(value) - visible_chars)
