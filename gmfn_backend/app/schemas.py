class UserCreate(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)


class UserOut(BaseModel):
    id: int
    email: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
