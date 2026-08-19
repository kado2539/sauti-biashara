import os
import json
import httpx
from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from .database import get_db
from sqlalchemy import text

router = APIRouter(prefix="/whatsapp")

WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")


@router.post("/link")
async def link_whatsapp_account(payload: dict, db: AsyncSession = Depends(get_db)):
    # payload: {org_id, phone_number, provider}
    await db.execute(text("INSERT INTO whatsapp_accounts (org_id, phone_number, provider, provider_meta, linked_user) VALUES (:org_id, :phone, :provider, :meta, :linked)"),
                     {"org_id": payload.get("org_id"), "phone": payload.get("phone_number"), "provider": payload.get("provider", "whatsapp_cloud"), "meta": {}, "linked": payload.get("linked_user")})
    await db.commit()
    return {"linked": True}


@router.post("/webhook")
async def whatsapp_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.json()
    # store incoming message for audit
    await db.execute(text("INSERT INTO bot_messages (whatsapp_account_id, direction, payload, status) VALUES ((SELECT id FROM whatsapp_accounts WHERE phone_number = :phone LIMIT 1), 'in', :payload, 'received')"),
                     {"phone": extract_phone_from_webhook(body), "payload": json.dumps(body)})
    await db.commit()
    return {"status": "ok"}


def extract_phone_from_webhook(body: dict) -> str:
    # Best-effort: parse meta structure from WhatsApp Cloud messages
    try:
        entry = body.get("entry", [])[0]
        changes = entry.get("changes", [])[0]
        value = changes.get("value", {})
        messages = value.get("messages", [])[0]
        from_phone = messages.get("from")
        return from_phone
    except Exception:
        return ''


async def send_whatsapp_message(to_phone: str, text: str):
    if not WHATSAPP_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
        raise Exception("WhatsApp configuration missing")
    url = f"https://graph.facebook.com/v17.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WHATSAPP_TOKEN}", "Content-Type": "application/json"}
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {"body": text}
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=headers, json=payload, timeout=10)
        resp.raise_for_status()
        return resp.json()
