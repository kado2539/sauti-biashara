import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app import database

async def prepare_db():
    async with database.engine.begin() as conn:
        await conn.run_sync(database.Base.metadata.create_all)

import os

# remove existing sqlite file to start fresh
if os.path.exists('./test.db'):
    os.remove('./test.db')

asyncio.run(prepare_db())

client = TestClient(app)
resp = client.post('/auth/register', json={'email': 'testuser@example.com', 'password': 'testpass'})
print('STATUS:', resp.status_code)
print('BODY:', resp.text)
