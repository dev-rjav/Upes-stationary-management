from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)


def delete_stale_pending_requests():
    from .. import db
    from ..models import Request, SystemSettings

    ttl_str = SystemSettings.get('pending_request_ttl_hours', '48')
    try:
        ttl_hours = int(ttl_str)
    except (ValueError, TypeError):
        ttl_hours = 48

    cutoff = datetime.now(timezone.utc) - timedelta(hours=ttl_hours)

    stale = Request.query.filter(
        Request.status == 'pending',
        Request.created_at < cutoff,
    ).all()

    count = len(stale)
    for req in stale:
        db.session.delete(req)

    if count:
        db.session.commit()
        logger.info(f'Cleanup: deleted {count} stale pending request(s) older than {ttl_hours}h')
    return count
