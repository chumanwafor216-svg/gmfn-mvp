from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    SECRET_KEY: str = "dev-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()
op.add_column("clans", sa.Column("invite_max_uses", sa.Integer(), nullable=True))
op.add_column("clans", sa.Column("invite_uses", sa.Integer(), nullable=False, server_default="0"))
op.drop_column("clans", "invite_uses")
op.drop_column("clans", "invite_max_uses")
