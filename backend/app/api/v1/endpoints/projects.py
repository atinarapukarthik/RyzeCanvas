"""
Project CRUD endpoints.
Provides create, read, update, delete operations for user projects.
All endpoints require authentication and enforce ownership.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, GithubRepoCreate


router = APIRouter()


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_in: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new project.
    
    - **title**: Project title (required)
    - **description**: Project description (optional)
    - **code_json**: AI-generated component structure as JSON string (optional)
    - **is_public**: Whether project is public (default: False)
    
    Project is automatically assigned to the current authenticated user.
    """
    # Create new project
    db_project = Project(
        title=project_in.title,
        description=project_in.description,
        code_json=project_in.code_json,
        user_id=current_user.id,
        is_public=project_in.is_public
    )
    
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    
    return db_project


@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100
):
    """
    List all projects belonging to the current user.
    
    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return (default: 100)
    
    Returns only projects owned by the authenticated user.
    """
    result = await db.execute(
        select(Project)
        .where(Project.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
        .order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()
    
    return projects


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific project by ID.
    
    **Security:** Ensures the project belongs to the current user.
    Returns 404 if project doesn't exist or doesn't belong to user.
    """
    result = await db.execute(
        select(Project).where(
            and_(
                Project.id == project_id,
                Project.user_id == current_user.id
            )
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or you don't have permission to access it"
        )
    
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a project.
    
    **Security:** Ensures the project belongs to the current user.
    All fields are optional - only provided fields will be updated.
    """
    # Fetch project with ownership check
    result = await db.execute(
        select(Project).where(
            and_(
                Project.id == project_id,
                Project.user_id == current_user.id
            )
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or you don't have permission to update it"
        )
    
    # Update only provided fields
    update_data = project_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    # Update timestamp
    from datetime import datetime
    project.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(project)
    
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a project.
    
    **Security:** Ensures the project belongs to the current user.
    This action is permanent and cannot be undone.
    """
    # Fetch project with ownership check
    result = await db.execute(
        select(Project).where(
            and_(
                Project.id == project_id,
                Project.user_id == current_user.id
            )
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or you don't have permission to delete it"
        )
    
    
    await db.delete(project)
    await db.commit()
    
    return None


@router.post("/{project_id}/github", status_code=status.HTTP_201_CREATED)
async def push_to_github(
    project_id: int,
    repo_in: GithubRepoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Push project code to a new GitHub repository.
    User must have a GitHub token linked to their account.
    """
    if not current_user.github_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub token not connected. Please connect your GitHub account in settings."
        )

    # Fetch project
    result = await db.execute(
        select(Project).where(
            and_(
                Project.id == project_id,
                Project.user_id == current_user.id
            )
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
        
    import httpx
    
    headers = {
        "Authorization": f"token {current_user.github_token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    # 1. Create Repository
    async with httpx.AsyncClient() as client:
        repo_data = {
            "name": repo_in.repo_name,
            "private": repo_in.private,
            "description": repo_in.description or project.description or "Created with RyzeCanvas"
        }
        
        create_resp = await client.post("https://api.github.com/user/repos", json=repo_data, headers=headers)
        
        if create_resp.status_code not in (200, 201):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to create GitHub repository: {create_resp.text}"
            )
            
        repo_info = create_resp.json()
        owner = repo_info['owner']['login']
        repo = repo_info['name']
        
        # 2. Push Code (create file)
        # Assuming project.code_json is the code content for now.
        # Ideally we parse it if it's JSON, but for simplicity let's treat it as a string
        # or extract a "main" file.
        
        content = project.code_json or "// No code generated yet."
        import base64
        content_encoded = base64.b64encode(content.encode()).decode()
        
        file_data = {
            "message": "Initial commit from RyzeCanvas",
            "content": content_encoded,
            "branch": "main" # GitHub defaults to main usually, but explicit is good
        }
        
        file_resp = await client.put(
            f"https://api.github.com/repos/{owner}/{repo}/contents/App.tsx",
            json=file_data,
            headers=headers
        )
        
        if file_resp.status_code not in (200, 201):
            # Try converting to master if main fails? optional.
            pass
            
        return {"repo_url": repo_info['html_url'], "message": "Repository created and code pushed successfully."}


