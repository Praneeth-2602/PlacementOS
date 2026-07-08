import structlog

from app.config import get_settings

logger = structlog.get_logger()


def send_email(to_email: str, subject: str, html: str, template: str = "generic") -> None:
    settings = get_settings()
    if not settings.resend_api_key:
        logger.info("email_stub", to_email=to_email, subject=subject, template=template)
        return
    # Resend integration is intentionally a stub for this phase.
    logger.info("email_send_requested", to_email=to_email, subject=subject, template=template)
