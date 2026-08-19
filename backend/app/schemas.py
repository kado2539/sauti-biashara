from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    username: Optional[str] = None
    company_name: Optional[str] = None
    password: str
    full_name: Optional[str] = None
    plan: Optional[str] = "basic"
    confirm_password: Optional[str] = None


class UserOut(BaseModel):
    id: int
    email: Optional[EmailStr]
    phone: Optional[str]
    username: Optional[str] = None
    company_name: Optional[str] = None
    full_name: Optional[str]
    role: str = "user"
    plan: str = "freemium"
    is_active: Optional[bool] = None
    created_at: Optional[datetime] = None
    owner_id: Optional[int] = None

    model_config = {"from_attributes": True}


class FounderLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int]
