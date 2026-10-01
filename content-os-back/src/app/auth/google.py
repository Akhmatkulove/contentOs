"""Google OAuth 2.0 / OpenID Connect: authorization code flow с PKCE."""

import base64
import hashlib
import secrets
from dataclasses import dataclass
from typing import Annotated
from urllib.parse import urlencode

import httpx
from fastapi import Depends, HTTPException, status

from app.core.config import Settings, SettingsDep

AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"  # noqa: S105
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


class GoogleError(Exception):
    pass


@dataclass(frozen=True)
class GoogleProfile:
    sub: str
    email: str
    email_verified: bool


def new_pkce_pair() -> tuple[str, str]:
    """Возвращает (verifier, challenge) для PKCE S256."""
    verifier = secrets.token_urlsafe(48)
    digest = hashlib.sha256(verifier.encode()).digest()
    return verifier, base64.urlsafe_b64encode(digest).rstrip(b"=").decode()


class GoogleOAuth:
    def __init__(
        self,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._client_id = client_id
        self._client_secret = client_secret
        self.redirect_uri = redirect_uri
        self._transport = transport  # тесты подставляют httpx.MockTransport

    def authorization_url(self, state: str, code_challenge: str) -> str:
        return f"{AUTHORIZE_URL}?" + urlencode(
            {
                "client_id": self._client_id,
                "redirect_uri": self.redirect_uri,
                "response_type": "code",
                "scope": "openid email",
                "state": state,
                "code_challenge": code_challenge,
                "code_challenge_method": "S256",
                "prompt": "select_account",
            }
        )

    async def fetch_profile(self, code: str, code_verifier: str) -> GoogleProfile:
        try:
            async with httpx.AsyncClient(timeout=10, transport=self._transport) as client:
                token = await client.post(
                    TOKEN_URL,
                    data={
                        "client_id": self._client_id,
                        "client_secret": self._client_secret,
                        "redirect_uri": self.redirect_uri,
                        "grant_type": "authorization_code",
                        "code": code,
                        "code_verifier": code_verifier,
                    },
                )
                token.raise_for_status()
                # Профиль берём у Google напрямую по access token, а не из id_token:
                # не нужно проверять подпись JWT.
                userinfo = await client.get(
                    USERINFO_URL,
                    headers={"Authorization": f"Bearer {token.json()['access_token']}"},
                )
                userinfo.raise_for_status()
                claims = userinfo.json()
            return GoogleProfile(
                sub=str(claims["sub"]),
                email=str(claims["email"]).lower(),
                email_verified=claims.get("email_verified") is True,
            )
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            raise GoogleError("Google sign-in failed") from exc


def build_google(settings: Settings) -> GoogleOAuth | None:
    if settings.google_client_id is None or settings.google_client_secret is None:
        return None
    return GoogleOAuth(
        settings.google_client_id,
        settings.google_client_secret.get_secret_value(),
        redirect_uri=f"{settings.app_url}/api/auth/google/callback",
    )


def get_google(settings: SettingsDep) -> GoogleOAuth:
    google = build_google(settings)
    if google is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Google sign-in is not configured")
    return google


GoogleDep = Annotated[GoogleOAuth, Depends(get_google)]
