"""
RAG (Retrieval-Augmented Generation) Module for RyzeCanvas.
Implements a FAISS vector store to retrieve relevant component documentation.
"""
import os
from typing import List, Dict, Any
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document

from app.core.component_docs import get_docs_for_embedding, COMPONENT_DOCS


class ComponentRAG:
    """
    RAG system for retrieving relevant component documentation.
    Uses FAISS vector store with OpenAI embeddings.
    """
    
    def __init__(self, embedding_model: str = "text-embedding-3-small"):
        """
        Initialize the RAG system with FAISS vector store.
        
        Args:
            embedding_model: OpenAI embedding model name
        """
        self.embedding_model = embedding_model
        self.vectorstore = None
        self._initialize_vectorstore()
    
    def _initialize_vectorstore(self):
        """Initialize FAISS vector store with component documentation."""
        try:
            # Get OpenAI API key
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY not found in environment variables")
            
            # Initialize embeddings
            embeddings = OpenAIEmbeddings(
                model=self.embedding_model,
                api_key=api_key
            )
            
            # Prepare documents for embedding
            docs_data = get_docs_for_embedding()
            documents = [
                Document(
                    page_content=doc["text"],
                    metadata=doc["metadata"]
                )
                for doc in docs_data
            ]
            
            # Create FAISS vector store
            self.vectorstore = FAISS.from_documents(documents, embeddings)
            
            print(f"✅ RAG initialized with {len(documents)} component documents")
        
        except Exception as e:
            print(f"❌ Failed to initialize RAG system: {e}")
            raise
    
    def retrieve_context(self, query: str, top_k: int = 3) -> str:
        """
        Retrieve the most relevant component documentation for a query.
        
        Args:
            query: User's prompt or question
            top_k: Number of top relevant documents to retrieve
        
        Returns:
            Concatenated text of the top_k most relevant component docs
        """
        if not self.vectorstore:
            raise RuntimeError("Vector store not initialized")
        
        try:
            # Perform similarity search
            relevant_docs = self.vectorstore.similarity_search(query, k=top_k)
            
            # Extract and concatenate the content
            context_parts = []
            for i, doc in enumerate(relevant_docs, 1):
                component_name = doc.metadata.get("component", "Unknown")
                context_parts.append(f"### Relevant Component {i}: {component_name}\n{doc.page_content}")
            
            context = "\n\n".join(context_parts)
            return context
        
        except Exception as e:
            print(f"❌ RAG retrieval failed: {e}")
            return ""
    
    def retrieve_with_scores(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Retrieve relevant docs with similarity scores.
        
        Args:
            query: User's prompt
            top_k: Number of documents to retrieve
        
        Returns:
            List of dictionaries with component name, content, and score
        """
        if not self.vectorstore:
            raise RuntimeError("Vector store not initialized")
        
        try:
            # Similarity search with scores
            results = self.vectorstore.similarity_search_with_score(query, k=top_k)
            
            return [
                {
                    "component": doc.metadata.get("component", "Unknown"),
                    "content": doc.page_content,
                    "score": float(score)
                }
                for doc, score in results
            ]
        
        except Exception as e:
            print(f"❌ RAG retrieval with scores failed: {e}")
            return []


# Global RAG instance (lazy initialization)
_rag_instance = None


def get_rag() -> ComponentRAG:
    """
    Get or create the global RAG instance.
    
    Returns:
        ComponentRAG instance
    """
    global _rag_instance
    
    if _rag_instance is None:
        _rag_instance = ComponentRAG()
    
    return _rag_instance


def retrieve_context(query: str, top_k: int = 3) -> str:
    """
    Convenience function to retrieve context from the global RAG instance.
    
    Args:
        query: User's prompt
        top_k: Number of top documents to retrieve
    
    Returns:
        Concatenated relevant context
    
    Example:
        >>> context = retrieve_context("Create a login form")
        >>> print(context)
    """
    rag = get_rag()
    return rag.retrieve_context(query, top_k)


# Example usage
if __name__ == "__main__":
    # Test RAG system
    test_queries = [
        "Create a login form with email and password",
        "Build a dashboard with charts and stats",
        "Design a navigation bar"
    ]
    
    print("Testing RAG System...")
    print("=" * 60)
    
    for query in test_queries:
        print(f"\n📝 Query: {query}")
        print("-" * 60)
        
        context = retrieve_context(query, top_k=3)
        print(f"\n🔍 Retrieved Context:\n{context[:300]}...")  # Show first 300 chars
        
        print("\n" + "=" * 60)
