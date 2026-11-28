import os
import tempfile

os.environ.setdefault("ATTACHMENTS_BASE_PATH", tempfile.mkdtemp(prefix="emails_test_"))
os.environ.setdefault("LOGS_BASE_PATH", tempfile.mkdtemp(prefix="emails_logs_"))
os.environ.setdefault("OUTLOOK_TENANT_ID", "test-tenant")
