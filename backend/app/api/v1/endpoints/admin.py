"""
Admin management endpoints.
Provides administrative functions for user and project management.
All endpoints require admin role (enforced by get_current_admin dependency).
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, get_current_admin
from app.models.user import User
from app.models.project import Project
from app.schemas.user import UserResponse, UserCreate, UserUpdate
from app.schemas.project import ProjectResponse
from app.core.security import get_password_hash


router = APIRouter()


@router.get("/users", response_model=List[UserResponse])
async def list_all_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
    skip: int = 0,
    limit: int = 100
):
    """
    List all users in the system (Admin only).
    
    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return (default: 100)
    
    **Requires:** Admin role
    """
    result = await db.execute(
        select(User)
        .offset(skip)
        .limit(limit)
        .order_by(User.created_at.desc())
    )
    users = result.scalars().all()
    
    return users


@router.post("/users", response_model=UserResponse)
async def admin_create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Create a new user (Admin only).
    """
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        is_active=True
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.put("/users/{user_id}", response_model=UserResponse)
async def admin_update_user(
    user_id: int,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Update a user's details (Admin only).
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    update_data = user_in.dict(exclude_unset=True)
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
        
    for field, value in update_data.items():
        setattr(user, field, value)
        
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Delete a user by ID (Admin only).
    
    **Requires:** Admin role
    **Warning:** This will cascade delete all projects owned by the user.
    **Security:** Cannot delete yourself.
    """
    # Prevent self-deletion
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own admin account"
        )
    
    # Fetch user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    await db.delete(user)
    await db.commit()
    
    return None


@router.get("/projects", response_model=List[ProjectResponse])
async def list_all_projects(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
    skip: int = 0,
    limit: int = 100
):
    """
    List all projects from all users (Admin only - Super view).
    
    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return (default: 100)
    
    **Requires:** Admin role
    This provides a system-wide view of all projects for administrative oversight.
    """
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.owner))  # Load owner data for context
        .offset(skip)
        .limit(limit)
        .order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()
    
    return projects


@router.get("/users/{user_id}/projects", response_model=List[ProjectResponse])
async def list_user_projects(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
    skip: int = 0,
    limit: int = 100
):
    """
    List all projects for a specific user (Admin only).
    
    - **user_id**: ID of the user whose projects to list
    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return (default: 100)
    
    **Requires:** Admin role
    Useful for admin dashboard to view user activity.
    """
    # Verify user exists
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get user's projects
    result = await db.execute(
        select(Project)
        .where(Project.user_id == user_id)
        .offset(skip)
        .limit(limit)
        .order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()
    
    return projects


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_any_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Delete any project by ID (Admin only).
    
    **Requires:** Admin role
    Unlike user endpoints, this can delete ANY project regardless of owner.
    Useful for content moderation.
    """
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    await db.delete(project)
    await db.commit()
    
    return None
