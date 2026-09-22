"""Email client — Resend em produção, logger no console em dev.

Regra (decisão do Prompt #5):
- Se ``RESEND_API_KEY`` começar com ``re_`` (e não for PLACEHOLDER) → envia via Resend.
- Senão (modo DEV) → apenas registra a URL/token no log via ``logger.info``,
  permitindo testar todo o fluxo sem depender de conta externa.

O import do SDK ``resend`` é preguiçoso: no modo dev o pacote nem precisa
estar instalado.
"""
from __future__ import annotations

from src.core.config import get_settings
from src.core.logging import get_logger

_settings = get_settings()
log = get_logger(__name__)


def _build_html(reset_url: str, is_invite: bool) -> str:
    if is_invite:
        headline = "Você foi convidado para o Dental CRM"
        lead = (
            "Um administrador criou uma conta para você. Defina sua senha para "
            "acessar a plataforma."
        )
        cta = "Definir minha senha"
    else:
        headline = "Redefinição de senha"
        lead = (
            "Recebemos um pedido para redefinir sua senha. Se foi você, clique no "
            "botão abaixo. O link expira em 1 hora."
        )
        cta = "Redefinir senha"

    return (
        f"<div style=\"font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;"
        f"color:#0f172a\">"
        f"<h2 style=\"color:#4f46e5\">{headline}</h2>"
        f"<p style=\"font-size:15px;line-height:1.6\">{lead}</p>"
        f"<p style=\"margin:28px 0\">"
        f"<a href=\"{reset_url}\" style=\"background:#18181b;color:#fff;"
        f"padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:600\">"
        f"{cta}</a></p>"
        f"<p style=\"font-size:12px;color:#64748b\">Se o botão não funcionar, copie e cole "
        f"este endereço no navegador:<br>{reset_url}</p>"
        f"</div>"
    )


def _send_via_resend(*, to: str, subject: str, html: str) -> None:
    import resend  # import preguiçoso: só no modo configurado

    resend.api_key = _settings.RESEND_API_KEY
    resend.Emails.send(
        {
            "from": f"{_settings.EMAIL_FROM_NAME} <{_settings.EMAIL_FROM}>",
            "to": [to],
            "subject": subject,
            "html": html,
        }
    )


async def send_password_reset_email(
    *, to: str, reset_url: str, is_invite: bool = False
) -> None:
    """Envia o e-mail de reset/convite. No modo dev apenas loga a URL."""
    subject = (
        "Seu convite para o Dental CRM"
        if is_invite
        else "Redefinição de senha — Dental CRM"
    )

    if _settings.email_configured:
        _send_via_resend(to=to, subject=subject, html=_build_html(reset_url, is_invite))
        log.info("email_sent", to=to, subject=subject, provider="resend", is_invite=is_invite)
    else:
        # MODO DEV: imprime a URL/token no console. Nada de chamada externa.
        log.info(
            "email_dev_mode",
            to=to,
            subject=subject,
            is_invite=is_invite,
            reset_url=reset_url,
        )
