import os
import clickhouse_connect
from dotenv import load_dotenv

load_dotenv("backend/.env")

ch_host = os.getenv('CLICKHOUSE_HOST') or 'pokdknhsax.ap-southeast-1.aws.clickhouse.cloud'
ch_user = os.getenv('CLICKHOUSE_USER') or 'default'
ch_pass = os.getenv('CLICKHOUSE_PASSWORD') or 'Hm1mmI~ovrB3q'

try:
    print(f"Connecting to {ch_host} with port 443...")
    client = clickhouse_connect.get_client(host=ch_host, user=ch_user, password=ch_pass, port=443, secure=True)
    res = client.query("SELECT 1")
    print("Port 443 Success:", res.result_rows)
except Exception as e:
    print("Port 443 failed:", e)

try:
    print(f"Connecting to {ch_host} with port 8443...")
    client2 = clickhouse_connect.get_client(host=ch_host, user=ch_user, password=ch_pass, port=8443, secure=True)
    res2 = client2.query("SELECT 1")
    print("Port 8443 Success:", res2.result_rows)
except Exception as e:
    print("Port 8443 failed:", e)
