import React, { useState } from 'react';
import { Heart, ArrowLeft, Sparkles, MapPin, Clock, ChevronDown, ChevronUp, Star, Wand2 } from 'lucide-react';

const AITripPlanner = () => {
  const [tripInput, setTripInput] = useState('');
  const [numDays, setNumDays] = useState('');
  const [postcode, setPostcode] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('22:00');
  const [showMap, setShowMap] = useState(false);
  const [showLucky, setShowLucky] = useState(false);
  const [luckyPostcode, setLuckyPostcode] = useState('');
  const [luckyDistance, setLuckyDistance] = useState('');
  const [luckyTags, setLuckyTags] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [expanded, setExpanded] = useState({
    travel: true,
    highlights: true,
    days: { 0: true },
    tips: {}
  });
  const [showSaves, setShowSaves] = useState(false);
  const [savedTrips, setSavedTrips] = useState([]);
  const [loadingSaves, setLoadingSaves] = useState(false);
  const [currentTripId, setCurrentTripId] = useState(null);
  const [focusedInput, setFocusedInput] = useState(null);

  const availableTags = ['Coastal', 'Mountains', 'Lakes', 'Historical'];

  const toggleLuckyTag = (tag) => {
    setLuckyTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const generateLucky = () => {
    const tagsText = luckyTags.length > 0 ? `interested in ${luckyTags.join(', ')}` : '';
    const distanceText = luckyDistance ? `within ${luckyDistance} miles` : '';
    
    setTripInput(`Surprise me with a destination ${distanceText} ${tagsText}`.trim());
    setPostcode(luckyPostcode);
    setShowLucky(false);
    
    // Clear lucky state
    setLuckyPostcode('');
    setLuckyDistance('');
    setLuckyTags([]);
  };

  const toggle = (section, index = null) => {
    if (section === 'days' || section === 'tips') {
      setExpanded(prev => ({
        ...prev,
        [section]: { ...prev[section], [index]: !prev[section][index] }
      }));
    } else {
      setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
    }
  };

  const formatText = (text) => {
    text = text.replace(/\*\*([^:]+):\*\*/g, '<span style="font-size:16px;font-weight:600;color:#000">$1:</span>');
    text = text.replace(/\*\*([^*]+)\*\*/g, '<span style="font-weight:600;color:#374151">$1</span>');
    text = text.replace(/(£\d+(?:-\d+)?(?:\/\w+)?)/g, '<span style="color:#475569;font-weight:500">$1</span>');
    return text;
  };

  const generate = async () => {
    if (!tripInput.trim()) return;
    
    setLoading(true);
    setStatus('Starting...');
    setResult(null);
    
    try {
      setStatus('🔍 Researching destination...');
      
      const response = await fetch('/api/generate', {

  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
  },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000,
          messages: [{
            role: 'user',
            content: `Create a UK travel itinerary for: "${tripInput}"
${numDays ? `Trip duration: ${numDays} days` : ''}
${postcode ? `Starting from: ${postcode} (N8/N9 = North London, NOT Northern Ireland)` : ''}
${arrivalDate ? `Arrival: ${arrivalDate}` : ''}
Daily schedule: ${startTime} to ${endTime}

REQUIRED FORMAT (follow EXACTLY):

TRAVEL:
🚗 Driving: [time] ([distance])
🚂 Train: [time]
✈️ Flight: [only if needed]

HIGHLIGHTS:
1. [Must-do #1] - [why]
2. [Must-do #2] - [why]
3. [Must-do #3] - [why]

OVERVIEW:
[One paragraph about the trip]

DAY 1 - [Title]
09:00 - [Activity at specific location]
10:00 - [Activity]
11:00 - [Activity]
12:00 - [Lunch at specific place]
*[Insider tip in italics]*
13:00 - [Continue...]

DAY 2 - [Title]
09:00 - [Activity]
...

TIPS:

Best Areas to Stay:
[Specific hotel/area recommendations]

Transport:
[Train, bus, car details]

Budget:
[£, ££, £££ guidance]

RULES:
- Hour-by-hour times
- Specific venue names
- UK destinations only
- Insider tips in *italics*
- Keep activities realistic for timeframe`
          }]
        })
      });

      const data = await response.json();
      const content = data.content?.find(i => i.type === 'text')?.text || '';
      
      setStatus('✨ Complete!');
      
      const parsed = parseResponse(content);
      setResult(parsed);
      setExpanded({
        travel: true,
        highlights: true,
        days: { 0: true },
        tips: {}
      });
      
    } catch (error) {
      console.error(error);
      setResult({ error: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setTripInput('');
    setNumDays('');
    setPostcode('');
    setArrivalDate('');
    setStartTime('09:00');
    setEndTime('22:00');
    setResult(null);
    setLoading(false);
    setStatus('');
    setCurrentTripId(null);
    setExpanded({
      travel: true,
      highlights: true,
      days: { 0: true },
      tips: {}
    });
  };

  const saveTrip = async () => {
    if (!result) return;
    
    try {
      const tripId = currentTripId || `trip_${Date.now()}`;
      const tripData = {
        id: tripId,
        name: tripInput,
        numDays,
        postcode,
        arrivalDate,
        startTime,
        endTime,
        result,
        savedAt: new Date().toISOString()
      };
      
      await window.storage.set(tripId, JSON.stringify(tripData), false);
      setCurrentTripId(tripId);
      alert('Trip saved successfully!');
      loadSavedTrips();
    } catch (error) {
      console.error('Error saving trip:', error);
      alert('Failed to save trip. Please try again.');
    }
  };

  const loadSavedTrips = async () => {
    try {
      setLoadingSaves(true);
      const keys = await window.storage.list('trip_', false);
      
      if (keys && keys.keys) {
        const trips = [];
        for (const key of keys.keys) {
          try {
            const data = await window.storage.get(key, false);
            if (data && data.value) {
              trips.push(JSON.parse(data.value));
            }
          } catch (e) {
            console.error('Error loading trip:', e);
          }
        }
        setSavedTrips(trips.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)));
      }
    } catch (error) {
      console.error('Error loading saved trips:', error);
    } finally {
      setLoadingSaves(false);
    }
  };

  const loadTrip = (trip) => {
    setTripInput(trip.name);
    setNumDays(trip.numDays || '');
    setPostcode(trip.postcode || '');
    setArrivalDate(trip.arrivalDate || '');
    setStartTime(trip.startTime || '09:00');
    setEndTime(trip.endTime || '22:00');
    setResult(trip.result);
    setCurrentTripId(trip.id);
    setShowSaves(false);
    setExpanded({
      travel: true,
      highlights: true,
      days: { 0: true },
      tips: {}
    });
  };

  const deleteTrip = async (tripId) => {
    if (!confirm('Are you sure you want to delete this saved trip?')) return;
    
    try {
      await window.storage.delete(tripId, false);
      setSavedTrips(prev => prev.filter(t => t.id !== tripId));
      if (currentTripId === tripId) {
        reset();
      }
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Failed to delete trip.');
    }
  };

  const exportToPDF = () => {
    if (!result) return;

    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${tripInput} - Itinerary</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      color: #111827;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #111827;
    }
    h2 {
      font-size: 24px;
      font-weight: 700;
      margin-top: 32px;
      margin-bottom: 16px;
      color: #111827;
      border-bottom: 2px solid #E5E7EB;
      padding-bottom: 8px;
    }
    .meta {
      color: #6B7280;
      font-size: 14px;
      margin-bottom: 24px;
    }
    .section {
      margin-bottom: 32px;
      page-break-inside: avoid;
    }
    .highlight-box {
      background-color: #FEF3C7;
      border-left: 4px solid #F59E0B;
      padding: 16px;
      margin: 16px 0;
    }
    .overview-box {
      background-color: #EFF6FF;
      border-left: 4px solid #3B82F6;
      padding: 16px;
      margin: 16px 0;
    }
    .activity {
      margin: 12px 0;
      padding-left: 12px;
    }
    .time-activity {
      font-weight: 600;
      color: #1F2937;
      border-left: 3px solid #3B82F6;
      padding-left: 12px;
      margin: 16px 0;
    }
    .note {
      font-style: italic;
      color: #6B7280;
      padding-left: 24px;
      margin: 8px 0;
    }
    .tip-title {
      font-weight: 600;
      font-size: 16px;
      color: #000;
      margin-top: 16px;
    }
    @media print {
      body { padding: 20px; }
    }
  </style>
</head>
<body>
  <h1>${tripInput}</h1>
  <div class="meta">
    ${numDays ? `📅 Duration: ${numDays} days | ` : ''}
    ${arrivalDate ? `Starting: ${new Date(arrivalDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} | ` : ''}
    ⏰ Daily schedule: ${startTime} - ${endTime}
    ${postcode ? ` | 📍 From: ${postcode}` : ''}
  </div>
`;

    if (result.travel) {
      htmlContent += `
  <div class="section">
    <h2>🗺️ How to Get There</h2>
    <div>${result.travel.replace(/\n/g, '<br>')}</div>
  </div>
`;
    }

    if (result.highlights.length > 0) {
      htmlContent += `
  <div class="section highlight-box">
    <h2 style="margin-top: 0; border: none;">⭐ Don't Miss These!</h2>
`;
      result.highlights.forEach((h, i) => {
        htmlContent += `    <div style="margin: 12px 0;"><strong>#${i + 1}</strong> ${h.replace(/\*\*/g, '')}</div>\n`;
      });
      htmlContent += `  </div>\n`;
    }

    if (result.overview) {
      htmlContent += `
  <div class="overview-box">
    ${result.overview}
  </div>
`;
    }

    result.days.forEach(day => {
      htmlContent += `
  <div class="section">
    <h2>Day ${day.number} – ${day.title}</h2>
`;
      day.activities.forEach(act => {
        const isTime = act.match(/^\d{1,2}:\d{2}/);
        const isNote = act.startsWith('*') && act.endsWith('*');
        const cleanAct = act.replace(/\*\*/g, '');
        
        if (isTime) {
          htmlContent += `    <div class="time-activity">${cleanAct}</div>\n`;
        } else if (isNote) {
          htmlContent += `    <div class="note">${cleanAct}</div>\n`;
        } else {
          htmlContent += `    <div class="activity">${cleanAct}</div>\n`;
        }
      });
      htmlContent += `  </div>\n`;
    });

    if (result.tips.length > 0) {
      htmlContent += `
  <div class="section">
    <h2>💡 Tips</h2>
`;
      result.tips.forEach(tip => {
        htmlContent += `    <div>\n`;
        htmlContent += `      <div class="tip-title">${tip.title}</div>\n`;
        tip.lines.forEach(line => {
          htmlContent += `      <div style="margin: 8px 0; padding-left: 16px;">${line.replace(/\*\*/g, '')}</div>\n`;
        });
        htmlContent += `    </div>\n`;
      });
      htmlContent += `  </div>\n`;
    }

    htmlContent += `
  <div style="margin-top: 48px; padding-top: 24px; border-top: 2px solid #E5E7EB; color: #6B7280; font-size: 14px; text-align: center;">
    Generated by AI Trip Planner on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
  </div>
</body>
</html>
`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tripInput.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-itinerary.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setTimeout(() => {
      alert('HTML file downloaded! Open it in your browser and use "Print to PDF" (Ctrl+P or Cmd+P) to save as PDF.');
    }, 100);
  };

  React.useEffect(() => {
    loadSavedTrips();
  }, []);

  const parseResponse = (text) => {
    const result = {
      travel: '',
      highlights: [],
      overview: '',
      days: [],
      tips: []
    };

    const travelMatch = text.match(/TRAVEL:(.*?)(?=HIGHLIGHTS:|$)/s);
    const highlightsMatch = text.match(/HIGHLIGHTS:(.*?)(?=OVERVIEW:|DAY \d|$)/s);
    const overviewMatch = text.match(/OVERVIEW:(.*?)(?=DAY \d|$)/s);
    const tipsMatch = text.match(/TIPS:(.*?)$/s);

    if (travelMatch) result.travel = travelMatch[1].trim();
    if (highlightsMatch) {
      result.highlights = highlightsMatch[1].trim().split('\n')
        .filter(l => l.match(/^\d\./))
        .map(l => l.replace(/^\d\.\s*/, ''));
    }
    if (overviewMatch) result.overview = overviewMatch[1].trim();

    const dayRegex = /DAY (\d+) - ([^\n]+)(.*?)(?=DAY \d|TIPS:|$)/gs;
    let dayMatch;
    while ((dayMatch = dayRegex.exec(text)) !== null) {
      const activities = dayMatch[3].trim().split('\n').filter(l => l.trim());
      result.days.push({
        number: dayMatch[1],
        title: dayMatch[2].trim(),
        activities
      });
    }

    if (tipsMatch) {
      const tipsText = tipsMatch[1];
      const sections = [];
      let current = null;
      
      tipsText.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        const headerMatch = trimmed.match(/^([A-Z][^:]+):$/) || trimmed.match(/^\*\*([^:]+):\*\*$/);
        if (headerMatch) {
          if (current) sections.push(current);
          current = { title: headerMatch[1], lines: [] };
        } else if (current) {
          current.lines.push(trimmed);
        }
      });
      if (current) sections.push(current);
      result.tips = sections;
    }

    return result;
  };

  const Card = ({ title, icon, iconBg = '#EEF2FF', bg = '#FFF', border, headerBg, expanded, onToggle, children }) => (
    <div style={{
      backgroundColor: bg,
      borderRadius: '16px',
      marginBottom: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      overflow: 'hidden',
      border: border ? `2px solid ${border}` : 'none'
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '20px 24px',
          backgroundColor: headerBg || (expanded ? '#F3F4F6' : bg),
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {icon && (
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>{icon}</div>
          )}
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, textAlign: 'left' }}>{title}</h2>
        </div>
        {expanded ? <ChevronUp size={24} color="#6B7280" /> : <ChevronDown size={24} color="#6B7280" />}
      </button>

      {expanded && (
        <div style={{ padding: '0 24px 24px', borderTop: '1px solid #E5E7EB' }}>
          <div style={{ marginTop: '16px' }}>{children}</div>
        </div>
      )}
    </div>
  );

  const [windowWidth, setWindowWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isLargeScreen = windowWidth >= 1024;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F9FAFB',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <style>{`
        @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @media (max-width: 768px) {
          .input-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      
      <div style={{
        padding: windowWidth >= 768 ? '24px' : '16px',
        backgroundColor: '#FFF',
        borderBottom: '1px solid #E5E7EB'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '24px',
          maxWidth: '1400px',
          margin: '0 auto',
          marginBottom: '24px'
        }}>
          <button 
            onClick={() => setShowSaves(true)}
            style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: '#F3F4F6',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <Heart size={20} />
            {savedTrips.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: '#EF4444',
                color: '#FFF',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                fontSize: '11px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {savedTrips.length}
              </span>
            )}
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: '#F3F4F6',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: '#111827'
            }}
            onClick={() => setShowMap(true)}>
              Map
            </button>
            <button style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: '#F3F4F6',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: '#111827'
            }}
            onClick={() => setShowSaves(true)}>
              My Saves
            </button>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isLargeScreen ? 'repeat(12, 1fr)' : '1fr',
          gap: windowWidth >= 768 ? '24px' : '16px',
          maxWidth: '1400px',
          margin: '0 auto',
          alignItems: 'start'
        }}>
          {/* Input Section */}
          <div style={{
            gridColumn: isLargeScreen ? 'span 5' : 'span 1',
            position: isLargeScreen && result ? 'sticky' : 'relative',
            top: isLargeScreen && result ? '24px' : 'auto',
            maxHeight: isLargeScreen && result ? 'calc(100vh - 48px)' : 'none',
            overflowY: isLargeScreen && result ? 'auto' : 'visible',
            paddingRight: isLargeScreen && result ? '8px' : '0'
          }}>
            <h1 style={{ 
              fontSize: windowWidth >= 768 ? '32px' : '28px', 
              fontWeight: '700', 
              marginBottom: '8px', 
              color: '#111827' 
            }}>
              Plan Your Trip
            </h1>
            <p style={{ 
              fontSize: windowWidth >= 768 ? '16px' : '14px', 
              color: '#6B7280', 
              marginBottom: '24px' 
            }}>
              Tell me where you want to go and what you like to do
            </p>

            <div style={{
              backgroundColor: '#FFF',
              borderRadius: '16px',
              border: `2px solid ${focusedInput === 'trip' ? '#3B82F6' : '#E5E7EB'}`,
              padding: '20px',
              marginBottom: '12px',
              transition: 'border-color 0.2s'
            }}>
              <textarea
                value={tripInput}
                onChange={e => setTripInput(e.target.value)}
                onFocus={() => setFocusedInput('trip')}
                onBlur={() => setFocusedInput(null)}
                placeholder="E.g., Edinburgh - love castles and whisky..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '16px',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{
              backgroundColor: '#FFF',
              borderRadius: '16px',
              border: `2px solid ${focusedInput === 'days' ? '#3B82F6' : '#E5E7EB'}`,
              padding: '16px 20px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'border-color 0.2s'
            }}>
              <Clock size={20} color="#6B7280" />
              <input
                type="number"
                min="1"
                max="30"
                value={numDays}
                onChange={e => setNumDays(e.target.value)}
                onFocus={() => setFocusedInput('days')}
                onBlur={() => setFocusedInput(null)}
                placeholder="How many days? (e.g., 3)"
                style={{
                  flex: 1,
                  border: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '16px',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{
              backgroundColor: '#FFF',
              borderRadius: '16px',
              border: `2px solid ${focusedInput === 'postcode' ? '#3B82F6' : '#E5E7EB'}`,
              padding: '16px 20px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'border-color 0.2s'
            }}>
              <MapPin size={20} color="#6B7280" />
              <input
                type="text"
                value={postcode}
                onChange={e => setPostcode(e.target.value)}
                onFocus={() => setFocusedInput('postcode')}
                onBlur={() => setFocusedInput(null)}
                placeholder="Your postcode (optional)"
                style={{
                  flex: 1,
                  border: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '16px',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{
              backgroundColor: '#FFF',
              borderRadius: '16px',
              border: `2px solid ${focusedInput === 'date' ? '#3B82F6' : '#E5E7EB'}`,
              padding: '16px 20px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'border-color 0.2s'
            }}>
              <Clock size={20} color="#6B7280" />
              <input
                type="date"
                value={arrivalDate}
                onChange={e => setArrivalDate(e.target.value)}
                onFocus={() => setFocusedInput('date')}
                onBlur={() => setFocusedInput(null)}
                style={{
                  flex: 1,
                  border: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '16px',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: windowWidth >= 640 ? '1fr 1fr' : '1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                backgroundColor: '#FFF',
                borderRadius: '16px',
                border: `2px solid ${focusedInput === 'startTime' ? '#3B82F6' : '#E5E7EB'}`,
                padding: '16px',
                transition: 'border-color 0.2s'
              }}>
                <label style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  onFocus={() => setFocusedInput('startTime')}
                  onBlur={() => setFocusedInput(null)}
                  style={{
                    width: '100%',
                    border: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '16px',
                    outline: 'none',
                    fontWeight: '600',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              <div style={{
                backgroundColor: '#FFF',
                borderRadius: '16px',
                border: `2px solid ${focusedInput === 'endTime' ? '#3B82F6' : '#E5E7EB'}`,
                padding: '16px',
                transition: 'border-color 0.2s'
              }}>
                <label style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  onFocus={() => setFocusedInput('endTime')}
                  onBlur={() => setFocusedInput(null)}
                  style={{
                    width: '100%',
                    border: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '16px',
                    outline: 'none',
                    fontWeight: '600',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>

            <button
              onClick={generate}
              disabled={loading || !tripInput.trim()}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#111827',
                color: '#FFF',
                border: 'none',
                borderRadius: '30px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading || !tripInput.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !tripInput.trim() ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '12px'
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '3px solid rgba(255,255,255,0.3)',
                    borderTop: '3px solid #FFF',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Generate Itinerary
                </>
              )}
            </button>

            <button
              onClick={() => setShowLucky(true)}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#FFF',
                color: '#111827',
                border: '2px solid #E5E7EB',
                borderRadius: '30px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: result ? '12px' : '0'
              }}
            >
              <Wand2 size={20} />
              I'm Feeling Lucky
            </button>

            {result && (
              <>
                <button
                  onClick={saveTrip}
                  style={{
                    width: '100%',
                    padding: '16px',
                    backgroundColor: '#10B981',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '30px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '12px'
                  }}
                >
                  <Heart size={20} fill={currentTripId ? '#FFF' : 'none'} />
                  {currentTripId ? 'Update Saved Trip' : 'Save This Trip'}
                </button>

                <button
                  onClick={exportToPDF}
                  style={{
                    width: '100%',
                    padding: '16px',
                    backgroundColor: '#3B82F6',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '30px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '12px'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Export Itinerary
                </button>
                
                <button
                  onClick={reset}
                  style={{
                    width: '100%',
                    padding: '16px',
                    backgroundColor: '#FFF',
                    color: '#111827',
                    border: '2px solid #E5E7EB',
                    borderRadius: '30px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <ArrowLeft size={20} />
                  Start New Trip
                </button>
              </>
            )}
          </div>

          {/* Results Section */}
          <div style={{
            gridColumn: isLargeScreen ? 'span 7' : 'span 1'
          }}>
            {loading && status && (
              <div style={{
                backgroundColor: '#FFF',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                textAlign: 'center',
                color: '#6B7280',
                marginBottom: '16px'
              }}>
                {status}
              </div>
            )}

            {result && !result.error && (
              <div>
                {result.travel && (
                  <Card 
                    title="How to Get There"
                    icon={<MapPin size={20} color="#4F46E5" />}
                    iconBg="#EEF2FF"
                    expanded={expanded.travel}
                    onToggle={() => toggle('travel')}
                  >
                    <div style={{ fontSize: '15px', lineHeight: '1.8', color: '#4B5563', whiteSpace: 'pre-line' }}
                         dangerouslySetInnerHTML={{ __html: formatText(result.travel) }} />
                  </Card>
                )}

                {result.highlights.length > 0 && (
                  <Card
                    title="Don't Miss These!"
                    icon={<Star size={24} color="#D97706" fill="#F59E0B" />}
                    bg="#FEF3C7"
                    border="#F59E0B"
                    headerBg={expanded.highlights ? '#FDE68A' : '#FEF3C7'}
                    expanded={expanded.highlights}
                    onToggle={() => toggle('highlights')}
                  >
                    {result.highlights.map((h, i) => (
                      <div key={i} style={{
                        fontSize: '15px',
                        lineHeight: '1.7',
                        color: '#4B5563',
                        marginTop: '16px',
                        paddingLeft: '8px',
                        borderLeft: '3px solid #F59E0B'
                      }}>
                        <span style={{ fontWeight: '700', color: '#92400E' }}>#{i + 1}</span>{' '}
                        <span dangerouslySetInnerHTML={{ __html: formatText(h) }} />
                      </div>
                    ))}
                  </Card>
                )}

                {result.overview && (
                  <div style={{
                    backgroundColor: '#EFF6FF',
                    padding: '20px',
                    borderRadius: '12px',
                    marginBottom: '16px',
                    fontSize: '16px',
                    lineHeight: '1.8',
                    color: '#1E40AF',
                    borderLeft: '4px solid #3B82F6'
                  }} dangerouslySetInnerHTML={{ __html: formatText(result.overview) }} />
                )}

                {result.days.map((day, i) => (
                  <Card
                    key={i}
                    title={`Day ${day.number} – ${day.title}`}
                    expanded={expanded.days[i]}
                    onToggle={() => toggle('days', i)}
                  >
                    {day.activities.map((act, j) => {
                      const isTime = act.match(/^\d{1,2}:\d{2}/);
                      const isNote = act.startsWith('*') && act.endsWith('*');
                      
                      return (
                        <div key={j} style={{
                          fontSize: '15px',
                          lineHeight: '1.8',
                          color: isNote ? '#6B7280' : '#4B5563',
                          marginTop: isTime ? '16px' : '8px',
                          paddingLeft: isTime ? '12px' : '24px',
                          borderLeft: isTime ? '3px solid #3B82F6' : 'none',
                          fontStyle: isNote ? 'italic' : 'normal'
                        }}>
                          {isTime && <Clock size={16} color="#3B82F6" style={{
                            display: 'inline',
                            marginRight: '8px',
                            verticalAlign: 'middle'
                          }} />}
                          <span style={{
                            fontWeight: isTime ? '600' : '400',
                            color: isTime ? '#1F2937' : (isNote ? '#6B7280' : '#4B5563')
                          }} dangerouslySetInnerHTML={{ __html: formatText(act) }} />
                        </div>
                      );
                    })}
                  </Card>
                ))}

                {result.tips.length > 0 && (
                  <div style={{
                    backgroundColor: '#FFF',
                    borderRadius: '16px',
                    marginTop: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      padding: '20px 24px',
                      backgroundColor: '#F3F4F6',
                      borderBottom: '1px solid #E5E7EB'
                    }}>
                      <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>💡 Tips</h2>
                    </div>

                    {result.tips.map((tip, i) => (
                      <div key={i} style={{
                        borderBottom: i < result.tips.length - 1 ? '1px solid #E5E7EB' : 'none'
                      }}>
                        <button
                          onClick={() => toggle('tips', i)}
                          style={{
                            width: '100%',
                            padding: '16px 24px',
                            backgroundColor: expanded.tips[i] ? '#F9FAFB' : '#FFF',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <h3 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#111827',
                            margin: 0,
                            textAlign: 'left'
                          }}>{tip.title}</h3>
                          {expanded.tips[i] ? <ChevronUp size={20} color="#6B7280" /> : <ChevronDown size={20} color="#6B7280" />}
                        </button>

                        {expanded.tips[i] && (
                          <div style={{ padding: '0 24px 20px' }}>
                            {tip.lines.map((line, j) => (
                              <div key={j} style={{
                                fontSize: '15px',
                                lineHeight: '1.8',
                                color: '#4B5563',
                                marginTop: '8px'
                              }} dangerouslySetInnerHTML={{ __html: formatText(line) }} />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {result?.error && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#EF4444' }}>
                {result.error}
              </div>
            )}

            {!result && !loading && (
              <div style={{
                backgroundColor: '#FFF',
                borderRadius: '16px',
                padding: windowWidth >= 768 ? '60px 20px' : '40px 20px',
                textAlign: 'center',
                color: '#6B7280'
              }}>
                <Sparkles size={windowWidth >= 768 ? 48 : 40} color="#E5E7EB" style={{ marginBottom: '16px' }} />
                <p style={{ fontSize: windowWidth >= 768 ? '18px' : '16px', fontWeight: '600', margin: 0 }}>
                  Your itinerary will appear here
                </p>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>
                  Fill in the details and click Generate Itinerary
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* I'm Feeling Lucky Modal */}
      {showLucky && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={() => setShowLucky(false)}>
          <div style={{
            backgroundColor: '#FFF',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '100%',
            maxWidth: windowWidth >= 640 ? '500px' : '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h2 style={{ fontSize: windowWidth >= 640 ? '24px' : '20px', fontWeight: '700', margin: 0 }}>
                I'm Feeling Lucky ✨
              </h2>
              <button
                onClick={() => setShowLucky(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#F3F4F6',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px' }}>
                Let us surprise you with a destination!
              </p>

              <div style={{
                backgroundColor: '#FFF',
                borderRadius: '16px',
                border: '2px solid #E5E7EB',
                padding: '16px 20px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <MapPin size={20} color="#6B7280" />
                <input
                  type="text"
                  value={luckyPostcode}
                  onChange={e => setLuckyPostcode(e.target.value)}
                  placeholder="Your postcode"
                  style={{
                    flex: 1,
                    border: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '16px',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{
                backgroundColor: '#FFF',
                borderRadius: '16px',
                border: '2px solid #E5E7EB',
                padding: '16px 20px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Sparkles size={20} color="#6B7280" />
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={luckyDistance}
                  onChange={e => setLuckyDistance(e.target.value)}
                  placeholder="Max distance in miles (optional)"
                  style={{
                    flex: 1,
                    border: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '16px',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '12px' }}>
                Select interests (optional):
              </p>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '24px'
              }}>
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleLuckyTag(tag)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: '2px solid',
                      borderColor: luckyTags.includes(tag) ? '#3B82F6' : '#E5E7EB',
                      backgroundColor: luckyTags.includes(tag) ? '#EFF6FF' : '#FFF',
                      color: luckyTags.includes(tag) ? '#3B82F6' : '#6B7280',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <button
                onClick={generateLucky}
                disabled={!luckyPostcode.trim()}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: '#111827',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '30px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: !luckyPostcode.trim() ? 'not-allowed' : 'pointer',
                  opacity: !luckyPostcode.trim() ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Wand2 size={20} />
                Surprise Me!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Modal */}
      {showMap && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={() => setShowMap(false)}>
          <div style={{
            backgroundColor: '#FFF',
            borderRadius: '16px',
            width: windowWidth >= 768 ? '90%' : '95%',
            maxWidth: '900px',
            height: windowWidth >= 768 ? '80vh' : '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={e => e.stopPropagation()}>
            <div style={{
              padding: windowWidth >= 640 ? '24px' : '16px',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h2 style={{ fontSize: windowWidth >= 640 ? '24px' : '20px', fontWeight: '700', margin: 0 }}>
                Explore Great Britain
              </h2>
              <button
                onClick={() => setShowMap(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#F3F4F6',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              flex: 1,
              position: 'relative',
              overflow: 'hidden'
            }}>
              <iframe
                src="https://www.openstreetmap.org/export/embed.html?bbox=-8.6489%2C49.8639%2C2.0000%2C60.8611&layer=mapnik"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                title="Great Britain Map"
              />
            </div>
          </div>
        </div>
      )}

      {/* Saved Trips Modal */}
      {showSaves && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={() => setShowSaves(false)}>
          <div style={{
            backgroundColor: '#FFF',
            borderRadius: '16px',
            maxWidth: windowWidth >= 640 ? '600px' : '100%',
            width: '100%',
            maxHeight: windowWidth >= 768 ? '80vh' : '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={e => e.stopPropagation()}>
            <div style={{
              padding: windowWidth >= 640 ? '24px' : '16px',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h2 style={{ fontSize: windowWidth >= 640 ? '24px' : '20px', fontWeight: '700', margin: 0 }}>
                My Saved Trips
              </h2>
              <button
                onClick={() => setShowSaves(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#F3F4F6',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: windowWidth >= 640 ? '20px' : '16px'
            }}>
              {loadingSaves ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                  Loading saved trips...
                </div>
              ) : savedTrips.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                  <Heart size={48} color="#E5E7EB" style={{ marginBottom: '16px' }} />
                  <p style={{ fontSize: '16px', margin: 0 }}>No saved trips yet</p>
                  <p style={{ fontSize: '14px', marginTop: '8px' }}>
                    Save your first itinerary to see it here
                  </p>
                </div>
              ) : (
                savedTrips.map(trip => (
                  <div key={trip.id} style={{
                    backgroundColor: '#F9FAFB',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '12px',
                    border: currentTripId === trip.id ? '2px solid #3B82F6' : '1px solid #E5E7EB'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '8px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          margin: '0 0 4px 0',
                          color: '#111827'
                        }}>
                          {trip.name}
                        </h3>
                        <p style={{
                          fontSize: '14px',
                          color: '#6B7280',
                          margin: 0
                        }}>
                          Saved {new Date(trip.savedAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                        {trip.numDays && (
                          <p style={{
                            fontSize: '14px',
                            color: '#6B7280',
                            margin: '4px 0 0 0'
                          }}>
                            🕐 {trip.numDays} days
                          </p>
                        )}
                        {trip.arrivalDate && (
                          <p style={{
                            fontSize: '14px',
                            color: '#6B7280',
                            margin: '4px 0 0 0'
                          }}>
                            📅 {new Date(trip.arrivalDate).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      marginTop: '12px'
                    }}>
                      <button
                        onClick={() => loadTrip(trip)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          backgroundColor: '#111827',
                          color: '#FFF',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Load Trip
                      </button>
                      <button
                        onClick={() => deleteTrip(trip.id)}
                        style={{
                          padding: '10px 16px',
                          backgroundColor: '#FEE2E2',
                          color: '#EF4444',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AITripPlanner;