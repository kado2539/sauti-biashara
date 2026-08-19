import pymysql

conn = pymysql.connect(host='127.0.0.1', user='root', password='Ayubu@2539', db='sauti_biashara', port=3306)
cur = conn.cursor()
cur.execute("SELECT id, email, role, plan, is_active, created_at FROM users ORDER BY id DESC LIMIT 50")
rows = cur.fetchall()
for r in rows:
    print(r)
cur.close()
conn.close()
