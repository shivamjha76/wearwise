from fastapi import APIRouter, HTTPException, status

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


@router.post("/", deprecated=True)
def create_user():
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Direct unauthenticated user creation is deprecated. Please register via /auth/register with a secure password."
    )