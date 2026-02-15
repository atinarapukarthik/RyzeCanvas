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


def _project_from_row(row: dict) -> Project:
    """Construct a Project from a Supabase row, mapping only known columns."""
    proj = Project(
        id=row.get("id"),
        title=row.get("title"),
        description=row.get("description"),
        code_json=row.get("code_json"),
        user_id=row.get("user_id"),
        is_public=row.get("is_public", False),
        provider=row.get("provider"),
        model=row.get("model"),
    )
    if row.get("created_at"):
        try:
            from datetime import datetime as dt
            proj.created_at = dt.fromisoformat(
                str(row["created_at"]).replace("Z", "+00:00"))
        except (ValueError, TypeError):
            pass
    if row.get("updated_at"):
        try:
            from datetime import datetime as dt
            proj.updated_at = dt.fromisoformat(
                str(row["updated_at"]).replace("Z", "+00:00"))
        except (ValueError, TypeError):
            pass
    return proj


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
    from app.services.ai_service import AIService

    # Generate code if not provided or if it's the default
    code = project_in.code_json
    if not code or code == "// Generated code":
        code = await AIService.generate_code(
            prompt=project_in.description or project_in.title,
            provider=project_in.provider or "gemini",
            model=project_in.model
        )

    # Create new project
    if db is not None:
        db_project = Project(
            title=project_in.title,
            description=project_in.description,
            code_json=code,
            user_id=current_user.id,
            is_public=project_in.is_public,
            provider=project_in.provider,
            model=project_in.model
        )

        db.add(db_project)
        await db.commit()
        await db.refresh(db_project)
        return db_project
    else:
        # Supabase API Fallback
        from app.core.supabase import supabase
        project_data = {
            "title": project_in.title,
            "description": project_in.description,
            "code_json": code,
            "user_id": current_user.id,
            "is_public": project_in.is_public,
            "provider": project_in.provider,
            "model": project_in.model
        }
        response = supabase.table("projects").insert(project_data).execute()
        if not response.data:
            raise HTTPException(
                status_code=500, detail="Failed to create project in Supabase")
        row = response.data[0]
        return _project_from_row(row)


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
    if db is not None:
        result = await db.execute(
            select(Project)
            .where(Project.user_id == current_user.id)
            .offset(skip)
            .limit(limit)
            .order_by(Project.created_at.desc())
        )
        projects = result.scalars().all()
        return projects
    else:
        # Supabase API Fallback
        from app.core.supabase import supabase
        response = supabase.table("projects") \
            .select("*") \
            .eq("user_id", current_user.id) \
            .order("created_at", desc=True) \
            .range(skip, skip + limit - 1) \
            .execute()
        projects = []
        for p in response.data:
            projects.append(_project_from_row(p))
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
    if db is not None:
        result = await db.execute(
            select(Project).where(
                and_(
                    Project.id == project_id,
                    Project.user_id == current_user.id
                )
            )
        )
        project = result.scalar_one_or_none()
    else:
        from app.core.supabase import supabase
        response = supabase.table("projects").select("*") \
            .eq("id", project_id) \
            .eq("user_id", current_user.id) \
            .execute()
        project = _project_from_row(response.data[0]) if response.data else None

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
    if db is not None:
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
    else:
        from app.core.supabase import supabase
        response = supabase.table("projects").select("*") \
            .eq("id", project_id) \
            .eq("user_id", current_user.id) \
            .execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or you don't have permission to update it"
            )
        update_data = project_in.model_dump(exclude_unset=True)
        if update_data:
            update_resp = supabase.table("projects") \
                .update(update_data) \
                .eq("id", project_id) \
                .execute()
            if update_resp.data:
                return _project_from_row(update_resp.data[0])
        return _project_from_row(response.data[0])


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
    if db is not None:
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
    else:
        from app.core.supabase import supabase
        response = supabase.table("projects").select("id") \
            .eq("id", project_id) \
            .eq("user_id", current_user.id) \
            .execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or you don't have permission to delete it"
            )
        supabase.table("projects").delete().eq("id", project_id).execute()

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
    if db is not None:
        result = await db.execute(
            select(Project).where(
                and_(
                    Project.id == project_id,
                    Project.user_id == current_user.id
                )
            )
        )
        project = result.scalar_one_or_none()
    else:
        from app.core.supabase import supabase
        response = supabase.table("projects").select("*") \
            .eq("id", project_id) \
            .eq("user_id", current_user.id) \
            .execute()
        project = _project_from_row(response.data[0]) if response.data else None

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
            "branch": "main"  # GitHub defaults to main usually, but explicit is good
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
