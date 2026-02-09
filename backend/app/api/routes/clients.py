"""
Client and client-contact CRUD routes.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.client import Client, ClientContact
from app.models.user import User
from app.schemas.client import (
    ClientContactCreate,
    ClientContactResponse,
    ClientContactUpdate,
    ClientCreate,
    ClientListResponse,
    ClientResponse,
    ClientUpdate,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Client CRUD
# ---------------------------------------------------------------------------


@router.get("/", response_model=ClientListResponse)
async def list_clients(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientListResponse:
    """List clients with optional filtering by status and search by name."""
    query = select(Client)

    if status_filter:
        query = query.where(Client.status == status_filter)
    if search:
        query = query.where(Client.name.ilike(f"%{search}%"))

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Client.name).offset(skip).limit(limit)
    result = await db.execute(query)
    clients = result.scalars().all()

    return ClientListResponse(clients=clients, total=total)


@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_in: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientResponse:
    """Create a new client."""
    client = Client(
        name=client_in.name,
        industry=client_in.industry,
        status=client_in.status.value,
        website=client_in.website,
        address=client_in.address,
        notes=client_in.notes,
        created_by_id=current_user.id,
    )
    db.add(client)
    await db.flush()
    await db.refresh(client)
    return client


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientResponse:
    """Get a client by ID, including its contacts."""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    client_in: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientResponse:
    """Update an existing client."""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    update_data = client_in.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] is not None:
        update_data["status"] = update_data["status"].value
    for field, value in update_data.items():
        setattr(client, field, value)

    await db.flush()
    await db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Soft-delete a client by setting status to INACTIVE."""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    client.status = "INACTIVE"
    await db.flush()


# ---------------------------------------------------------------------------
# Client Contacts
# ---------------------------------------------------------------------------


@router.post(
    "/{client_id}/contacts",
    response_model=ClientContactResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_contact(
    client_id: int,
    contact_in: ClientContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientContactResponse:
    """Add a contact to a client."""
    result = await db.execute(select(Client).where(Client.id == client_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    contact = ClientContact(
        client_id=client_id,
        first_name=contact_in.first_name,
        last_name=contact_in.last_name,
        email=contact_in.email,
        phone=contact_in.phone,
        role=contact_in.role,
        is_primary=contact_in.is_primary,
    )
    db.add(contact)
    await db.flush()
    await db.refresh(contact)
    return contact


@router.get("/{client_id}/contacts", response_model=list[ClientContactResponse])
async def list_contacts(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ClientContactResponse]:
    """List all contacts for a client."""
    result = await db.execute(select(Client).where(Client.id == client_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    contacts_result = await db.execute(
        select(ClientContact)
        .where(ClientContact.client_id == client_id)
        .order_by(ClientContact.last_name, ClientContact.first_name)
    )
    return contacts_result.scalars().all()


@router.put(
    "/{client_id}/contacts/{contact_id}",
    response_model=ClientContactResponse,
)
async def update_contact(
    client_id: int,
    contact_id: int,
    contact_in: ClientContactUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientContactResponse:
    """Update a client contact."""
    result = await db.execute(
        select(ClientContact).where(
            ClientContact.id == contact_id,
            ClientContact.client_id == client_id,
        )
    )
    contact = result.scalar_one_or_none()
    if contact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")

    update_data = contact_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contact, field, value)

    await db.flush()
    await db.refresh(contact)
    return contact


@router.delete(
    "/{client_id}/contacts/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_contact(
    client_id: int,
    contact_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a client contact."""
    result = await db.execute(
        select(ClientContact).where(
            ClientContact.id == contact_id,
            ClientContact.client_id == client_id,
        )
    )
    contact = result.scalar_one_or_none()
    if contact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")

    await db.delete(contact)
    await db.flush()
