import re

# Business rule: a SAP ID is exactly 8 digits and starts with "4000".
SAP_ID_PATTERN = re.compile(r'^4000\d{4}$')
SAP_ID_RULE = 'SAP ID must be 8 digits and start with 4000'


def is_valid_sap_id(sap_id):
    """Return True if sap_id is exactly 8 digits beginning with 4000."""
    return bool(SAP_ID_PATTERN.match(str(sap_id or '').strip()))
