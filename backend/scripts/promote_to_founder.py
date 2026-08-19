import sys
sys.path.insert(0, 'backend')
from app import auth
import pymysql

EMAIL = 'cleysir54@gmail.com'
NEW_PASSWORD = 'CleyKado@2539'

hashed = auth.get_password_hash(NEW_PASSWORD)
print('Generated hash:', hashed)

conn = pymysql.connect(host='127.0.0.1', user='root', password='Ayubu@2539', db='sauti_biashara', port=3306)
cur = conn.cursor()
cur.execute("UPDATE users SET password_hash = %s, role = 'founder' WHERE email = %s", (hashed, EMAIL))
conn.commit()
print('Rows affected:', cur.rowcount)
cur.close()
conn.close()
