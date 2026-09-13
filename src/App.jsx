import { useState } from 'react';
import { fetchCompanyData } from './api/financialData';
import './App.css';

function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState(null);
  const [error, setError] = useState('');

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setRawData(null);
    try {
      const data = await fetchCompanyData(query);
      setRawData(data);
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
          {(rawData.sector || rawData.industry) && (
            <p className="subline">
              {[rawData.sector, rawData.industry].filter(Boolean).join(' · ')}
            </p>
          )}

          <div className="metrics-grid">
            <div><strong>Market Price</strong><br />${rawData.marketPrice}</div>
            <div><strong>Market Cap</strong><br />${(rawData.marketCap / 1e9).toFixed(2)}B</div>
            <div><strong>Revenue</strong><br />${(rawData.revenue / 1e9).toFixed(2)}B</div>
            <div><strong>EBITDA</strong><br />${(rawData.ebitda / 1e9).toFixed(2)}B</div>
            <div><strong>P/E Ratio</strong><br />{rawData.pe}</div>
            <div><strong>Sector</strong><br />{rawData.sector}</div>
          </div>

          {rawData.description && (
            <div className="summary-text">
              <p>{rawData.description}</p>
            </div>
          )}

          {(rawData.ceo || rawData.employees || rawData.fiscalYear) && (
            <p className="footnote">
              {[
                rawData.ceo && `CEO: ${rawData.ceo}`,
                rawData.employees && `${Number(rawData.employees).toLocaleString()} employees`,
                rawData.fiscalYear && `FY${rawData.fiscalYear} financials`
              ].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
