from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from auth.utils import get_current_user
from lib.supabase import get_supabase_client

router = APIRouter()


@router.get("", response_model=List[Dict[str, Any]])
async def get_command_history(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get the user's command execution history"""
    supabase = get_supabase_client()
    
    try:
        # Start building the query
        query = supabase.table("command_history").select("*").eq("user_id", current_user["id"])
        
        # Add date filters if provided
        if start_date:
            query = query.gte("created_at", start_date)
        if end_date:
            query = query.lte("created_at", end_date)
        
        # Add pagination
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        
        # Execute the query
        response = query.execute()
        
        return response.data or []
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching command history: {str(e)}"
        )


@router.get("/stats", response_model=Dict[str, Any])
async def get_command_stats(
    period: str = Query("week", description="Period for statistics: day, week, month, year"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get statistics about command usage"""
    supabase = get_supabase_client()
    
    # Calculate date range based on period
    now = datetime.utcnow()
    if period == "day":
        start_date = (now - timedelta(days=1)).isoformat()
    elif period == "week":
        start_date = (now - timedelta(weeks=1)).isoformat()
    elif period == "month":
        start_date = (now - timedelta(days=30)).isoformat()
    elif period == "year":
        start_date = (now - timedelta(days=365)).isoformat()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid period. Choose from: day, week, month, year"
        )
    
    try:
        # Get total count
        count_query = supabase.table("command_history").select(
            "count", count_option="exact"
        ).eq("user_id", current_user["id"]).gte("created_at", start_date).execute()
        
        # Get model distribution
        models_query = supabase.rpc(
            "get_model_distribution",
            {"user_id_param": current_user["id"], "start_date_param": start_date}
        ).execute()
        
        # Get tokens used
        tokens_query = supabase.rpc(
            "get_total_tokens",
            {"user_id_param": current_user["id"], "start_date_param": start_date}
        ).execute()
        
        return {
            "period": period,
            "total_commands": count_query.count if count_query.count else 0,
            "model_distribution": models_query.data if models_query.data else [],
            "total_tokens": tokens_query.data[0]["total_tokens"] if tokens_query.data else 0
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching command statistics: {str(e)}"
        )


@router.get("/{command_id}", response_model=Dict[str, Any])
async def get_command_detail(
    command_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get details of a specific command execution"""
    supabase = get_supabase_client()
    
    try:
        # Fetch command details
        response = supabase.table("command_history").select("*").eq(
            "id", command_id
        ).eq("user_id", current_user["id"]).single().execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Command not found"
            )
        
        return response.data
        
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Command not found"
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching command details: {str(e)}"
        )


@router.delete("/{command_id}", response_model=Dict[str, str])
async def delete_command(
    command_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete a command from history"""
    supabase = get_supabase_client()
    
    try:
        # Delete the command
        response = supabase.table("command_history").delete().eq(
            "id", command_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Command not found"
            )
        
        return {"message": "Command deleted successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting command: {str(e)}"
        )