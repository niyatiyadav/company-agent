import { useState } from 'react';
import { fetchCompanyData } from './api/financialData';
import { summarizeCompany } from './api/summarize';
import './App.css';

function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [rawData, setRawData] = useState(null);
  const [error, setError] = useState('');

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setSummary('');
    setRawData(null);
    try {
      const data = await fetchCompanyData(query);
      setRawData(data);
      const text = await summarizeCompany(data);
      setSummary(text);
    } catch (err) {
      setError('Could not find that company. Try a different name or ticker.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <h1>Company Research Agent</h1>
      <div className="search-bar">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Enter a ticker or company name (e.g. AAPL, Reliance)"
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {rawData && (
        <div className="result-card">
          <h2>{rawData.name} ({rawData.ticker})</h2>
          <div className="metrics-grid">
            <div><strong>Market Price</strong><br />${rawData.marketPrice}</div>
            <div><strong>Market Cap</strong><br />${(rawData.marketCap / 1e9).toFixed(2)}B</div>
            <div><strong>Revenue</strong><br />${(rawData.revenue / 1e9).toFixed(2)}B</div>
            <div><strong>EBITDA</strong><br />${(rawData.ebitda / 1e9).toFixed(2)}B</div>
            <div><strong>P/E Ratio</strong><br />{rawData.pe}</div>
            <div><strong>Sector</strong><br />{rawData.sector}</div>
          </div>
          <div className="summary-text">
            {summary.split('\n').map((line, i) => <p key={i}>{line}</p>)}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
