import { useState, useEffect } from 'react'
import './App.css'

interface DocumentMetadata {
  tags: string[];
}

interface Document {
  id: string;
  Title: string;
  Description: string;
  metadata: DocumentMetadata;
  _matchCount?: number;
}

interface ApiResponse {
  status: string;
  data: Document[];
  searchTags?: string[];
  message?: string;
}

function App() {
  const [query, setQuery] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setDocuments([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:3000/api/documents/search?q=${encodeURIComponent(searchQuery)}`);
      const result: ApiResponse = await response.json();
      
      if (result.status === 'success') {
        setDocuments(result.data);
      } else {
        setError(result.message || 'An error occurred during search.');
      }
    } catch (err) {
      setError('Could not connect to the search API. Make sure it is running on port 3000.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) handleSearch(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const renderDetail = (doc: Document) => (
    <div className="detail-view">
      <button className="ghost-button" onClick={() => setSelectedDoc(null)} style={{ marginBottom: '40px' }}>
        ← BACK TO RESULTS
      </button>
      <h1 className="display-hero">{doc.Title}</h1>
      <p className="body-text" style={{ marginBottom: '30px' }}>{doc.Description}</p>
      
      <div style={{ marginTop: '40px' }}>
        <h3 className="caption" style={{ marginBottom: '15px' }}>METADATA TAGS</h3>
        {doc.metadata.tags.map((tag, i) => (
          <span key={i} className="tag-pill micro">{tag}</span>
        ))}
      </div>
      
      <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid rgba(240, 240, 250, 0.1)' }}>
        <p className="caption">ID: {doc.id}</p>
      </div>
    </div>
  );

  return (
    <>
      <div className="hero-bg" />
      <div className="overlay" />
      
      <main className="app-container">
        {!selectedDoc ? (
          <>
            <h1 className="display-hero" style={{ textAlign: 'center' }}>DOCUMENT SEARCH</h1>
            <input
              type="text"
              className="ghost-input"
              placeholder="SEARCH DOCUMENTS..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />

            {isLoading && <p className="caption" style={{ marginTop: '20px' }}>ANALYZING ARCHIVES...</p>}
            {error && <p className="caption" style={{ marginTop: '20px', color: '#ff4d4d' }}>{error}</p>}

            <div className="results-container">
              {documents.map((doc) => (
                <div key={doc.id} className="result-item" onClick={() => setSelectedDoc(doc)}>
                  <h2 className="body-text" style={{ fontWeight: 700 }}>{doc.Title}</h2>
                  <p className="caption" style={{ marginTop: '5px' }}>{doc.Description.substring(0, 150)}...</p>
                  {doc._matchCount !== undefined && (
                    <span className="micro" style={{ color: 'var(--spectral-white)', opacity: 0.5, marginTop: '10px', display: 'block' }}>
                      RELEVANCE SCORE: {doc._matchCount}
                    </span>
                  )}
                </div>
              ))}
              
              {!isLoading && query && documents.length === 0 && !error && (
                <p className="caption" style={{ textAlign: 'center' }}>NO DOCUMENTS FOUND FOR "{query.toUpperCase()}"</p>
              )}
            </div>
          </>
        ) : (
          renderDetail(selectedDoc)
        )}
      </main>
    </>
  )
}

export default App
